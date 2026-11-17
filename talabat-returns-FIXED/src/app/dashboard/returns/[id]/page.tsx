'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Upload, FileIcon, Trash2, CheckCircle, XCircle,
  AlertTriangle, Clock, Download, ChevronDown, ChevronUp,
  Loader2, X, Mail, ExternalLink, Building2, Package, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/returns/StatusBadge'
import { formatDate, formatDateTime, formatCurrency, formatFileSize, validateEmail } from '@/lib/utils'
import type { Return, Profile, ReturnStatus, ReturnProof } from '@/types'

export default function ReturnDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const proofInputRef = useRef<HTMLInputElement>(null)

  const [ret, setRet] = useState<Return | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditLog, setAuditLog] = useState<{ id: string; action: string; performed_at: string; performer?: { full_name?: string; email: string } }[]>([])

  // Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Approval form
  const [approveEmail, setApproveEmail] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [approving, setApproving] = useState(false)

  // Rejection form
  const [rejectReason, setRejectReason] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Cancel
  const [cancelling, setCancelling] = useState(false)

  async function fetchReturn() {
    const { data } = await supabase
      .from('returns')
      .select(`
        *,
        store:stores(*),
        return_skus(*),
        return_proofs(*),
        return_actions(*, performer:profiles(full_name, email))
      `)
      .eq('id', id)
      .single()
    setRet(data as Return)
    if ((data as any)?.return_proofs?.length) {
      await generateSignedUrls((data as any).return_proofs)
    }
  }
  async function generateSignedUrls(proofList: Array<{ id: string; file_url: string }>) {
    const urls: Record<string, string> = {}
    for (const proof of proofList) {
      const pathMatch = proof.file_url.match(/return-proofs\/(.+)/)
      if (!pathMatch) { urls[proof.id] = proof.file_url; continue }
      const { data } = await supabase.storage.from('return-proofs').createSignedUrl(pathMatch[1], 3600)
      urls[proof.id] = data?.signedUrl ?? proof.file_url
    }
    setSignedUrls(urls)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      await fetchReturn()
      setLoading(false)
    }
    load()
  }, [id])

  async function handleUploadProof(files: FileList | null) {
    if (!files || files.length === 0 || !ret) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const toastId = toast.loading(`Uploading ${files.length} file(s)…`)
    try {
      for (const file of Array.from(files)) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
        const { error: uploadErr } = await supabase.storage.from('return-proofs').upload(path, file)
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('return-proofs').getPublicUrl(path)
        await supabase.from('return_proofs').insert({
          return_id: ret.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        })
      }
      // Update status to pending_approval if was pending_proof
      if (ret.status === 'pending_proof') {
        await supabase.from('returns').update({ status: 'pending_approval' }).eq('id', ret.id)
      }
      toast.dismiss(toastId)
      toast.success('Proof uploaded successfully!')
      await fetchReturn()
    } catch (err: unknown) {
      toast.dismiss(toastId)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteProof(proof: ReturnProof) {
    if (!confirm(`Delete "${proof.file_name}"?`)) return
    await supabase.from('return_proofs').delete().eq('id', proof.id)
    // Check if no more proofs and revert status
    const remaining = (ret?.return_proofs ?? []).filter((p) => p.id !== proof.id)
    if (remaining.length === 0 && ret?.status === 'pending_approval') {
      await supabase.from('returns').update({ status: 'pending_proof' }).eq('id', ret.id)
    }
    await fetchReturn()
    toast.success('Proof deleted')
  }

  async function handleSubmitForApproval() {
    if (!ret || (ret.return_proofs ?? []).length === 0) {
      toast.error('Upload at least one proof document before submitting')
      return
    }
    const { error } = await supabase.from('returns').update({ status: 'pending_approval' }).eq('id', ret.id)
    if (error) { toast.error(error.message); return }
    await supabase.from('return_actions').insert({ return_id: ret.id, action_type: 'submit', performed_by: profile?.id })
    setShowSubmitModal(false)
    await fetchReturn()
    toast.success('Return submitted for approval!')
  }

  async function handleApprove() {
    if (!ret || !profile) return
    if (!approveEmail || !validateEmail(approveEmail)) { toast.error('Enter a valid supplier email'); return }

    setApproving(true)
    try {
      // Update return status
      const { error: updateErr } = await supabase
        .from('returns')
        .update({ status: 'approved' })
        .eq('id', ret.id)
      if (updateErr) throw updateErr

      // Record action
      await supabase.from('return_actions').insert({
        return_id: ret.id,
        action_type: 'approve',
        performed_by: profile.id,
        notes: approveNotes || null,
      })

      // Send email
      let emailResult: { success: boolean; message?: string; error?: string } = { success: false }
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnId: ret.id,
            supplierEmail: approveEmail,
            returnDetails: {
              returnNumber: ret.portal_return_number ?? ret.id.slice(0, 8).toUpperCase(),
              storeName: (ret.store as { name?: string } | undefined)?.name ?? '',
              returnDate: formatDate(ret.return_date),
              returnReason: ret.return_reason,
              skuCount: (ret.return_skus ?? []).length,
            },
          }),
        })
        emailResult = await res.json()
      } catch {
        emailResult = { success: false, error: 'Network error' }
      }

      setShowApproveModal(false)
      await fetchReturn()

      if (emailResult.success) {
        toast.success(`Return approved! Confirmation email sent to ${approveEmail}`)
      } else {
        toast.success('Return approved!')
        toast(`Email delivery: ${emailResult.message ?? emailResult.error ?? 'Not configured'}`, { icon: '📧' })
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!ret || !profile) return
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return }

    setRejecting(true)
    try {
      await supabase.from('returns').update({ status: 'rejected' }).eq('id', ret.id)
      await supabase.from('return_actions').insert({
        return_id: ret.id,
        action_type: 'reject',
        performed_by: profile.id,
        rejection_reason: rejectReason.trim(),
        charge_amount: chargeAmount ? parseFloat(chargeAmount) : null,
      })
      setShowRejectModal(false)
      await fetchReturn()
      toast.success('Return rejected and recorded.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed')
    } finally {
      setRejecting(false)
    }
  }

  async function handleCancel() {
    if (!ret || !profile) return
    setCancelling(true)
    try {
      await supabase.from('returns').update({ status: 'cancelled' }).eq('id', ret.id)
      await supabase.from('return_actions').insert({
        return_id: ret.id,
        action_type: 'cancel',
        performed_by: profile.id,
      })
      setShowCancelModal(false)
      router.push('/dashboard/returns')
      toast.success('Return cancelled.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!ret) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Return not found.</p>
        <button onClick={() => router.push('/dashboard/returns')} className="btn-secondary mt-4">Go back</button>
      </div>
    )
  }

  const proofs = (ret.return_proofs ?? []) as ReturnProof[]
  const skus = ret.return_skus ?? []
  const actions = ret.return_actions ?? []
  const totalValue = skus.reduce((s, sku) => s + (sku.total_amount ?? 0), 0)
  const storeName = (ret.store as { name?: string } | undefined)?.name ?? '—'

  const canUpload = ['pending_proof', 'pending_approval'].includes(ret.status)
  const canSubmit = profile?.role === 'store_user' && ret.status === 'pending_proof'
  const canCancel = profile?.role === 'store_user' && ['pending_proof', 'pending_approval'].includes(ret.status)
  const canApproveReject = profile?.role === 'area_manager' || profile?.role === 'admin'
  const isPendingApproval = ret.status === 'pending_approval'

  const rejectionAction = actions.find((a) => a.action_type === 'reject')

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push('/dashboard/returns')} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">
                {ret.portal_return_number ?? `RTN-${ret.id.slice(0, 8).toUpperCase()}`}
              </h2>
              <StatusBadge status={ret.status as ReturnStatus} size="lg" />
            </div>
            <p className="text-sm text-gray-500 mt-1">{storeName} · {formatDate(ret.return_date)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canCancel && (
            <button onClick={() => setShowCancelModal(true)} className="btn-secondary text-sm py-2">
              <X className="w-4 h-4" /> Cancel Return
            </button>
          )}
          {canSubmit && (
            <button
              onClick={() => proofs.length === 0 ? toast.error('Upload proof documents before submitting') : setShowSubmitModal(true)}
              className={proofs.length > 0 ? 'btn-primary text-sm py-2' : 'btn-secondary text-sm py-2 opacity-60'}
            >
              <CheckCircle className="w-4 h-4" />
              Submit for Approval
              {proofs.length === 0 && <span className="ml-1 text-xs">(add proof first)</span>}
            </button>
          )}
          {canApproveReject && isPendingApproval && (
            <>
              <button onClick={() => setShowRejectModal(true)} className="btn-danger text-sm py-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => setShowApproveModal(true)} className="btn-success text-sm py-2">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning for missing proof */}
      {ret.status === 'pending_proof' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-medium">Proof of return required</p>
            <p className="text-sm mt-0.5 text-amber-700">Upload proof documents below to submit this return for manager approval.</p>
          </div>
        </div>
      )}

      {ret.status === 'rejected' && rejectionAction && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-medium">Return Rejected</p>
            <p className="text-sm mt-0.5">{rejectionAction.rejection_reason}</p>
            {rejectionAction.charge_amount && (
              <p className="text-sm mt-1 font-medium">
                Charge to store: <span className="text-red-700">{formatCurrency(rejectionAction.charge_amount)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Supplier + Reason */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-brand-500" /> Return Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Supplier</dt>
              <dd className="text-gray-800 font-medium">{ret.supplier_name}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Reason</dt>
              <dd className="text-gray-800">{ret.return_reason}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Portal Status</dt>
              <dd className="text-gray-500 italic">{ret.portal_status ?? 'Not synced'}</dd>
            </div>
            {ret.notes && (
              <div className="flex items-start gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Notes</dt>
                <dd className="text-gray-700">{ret.notes}</dd>
              </div>
            )}
            {ret.source_pdf_url && (
              <div className="flex items-start gap-2">
                <dt className="text-gray-400 w-28 flex-shrink-0">Source PDF</dt>
                <dd>
                  <a href={ret.source_pdf_url} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-700 flex items-center gap-1 text-sm">
                    <ExternalLink className="w-3 h-3" /> Download
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right: Store + Timeline */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-brand-500" /> Store & Timeline
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Store</dt>
              <dd className="text-gray-800 font-medium">{storeName}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Return Date</dt>
              <dd className="text-gray-800">{formatDate(ret.return_date)}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Created</dt>
              <dd className="text-gray-700">{formatDateTime(ret.created_at)}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0">Last Updated</dt>
              <dd className="text-gray-700">{formatDateTime(ret.updated_at)}</dd>
            </div>
          </dl>

          {/* Mini timeline */}
          {actions.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity</p>
              <ul className="space-y-2">
                {actions.slice(-3).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs text-gray-600">
                    {a.action_type === 'approve' && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    {a.action_type === 'reject' && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    {a.action_type === 'submit' && <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    {a.action_type === 'cancel' && <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                    <span className="capitalize">{a.action_type}</span>
                    <span className="text-gray-400">· {formatDate(a.performed_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SKU Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">SKU Details ({skus.length} item{skus.length !== 1 ? 's' : ''})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{sku.sku_code ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{sku.sku_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{sku.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{sku.unit_price ? formatCurrency(sku.unit_price) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{sku.total_amount ? formatCurrency(sku.total_amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
            {totalValue > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-700">Total Return Value:</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Proof Documents */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center justify-between">
          <span>Proof Documents ({proofs.length})</span>
          {canUpload && (
            <button onClick={() => proofInputRef.current?.click()} disabled={uploading} className="btn-secondary text-xs py-1.5 px-3">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading…' : 'Upload Proof'}
            </button>
          )}
        </h3>
        <input ref={proofInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => handleUploadProof(e.target.files)} />

        {proofs.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center ${canUpload ? 'border-amber-200 bg-amber-50/50 cursor-pointer hover:bg-amber-50' : 'border-gray-200'}`}
            onClick={() => canUpload && proofInputRef.current?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${canUpload ? 'text-amber-400' : 'text-gray-200'}`} />
            <p className={`text-sm font-medium ${canUpload ? 'text-amber-700' : 'text-gray-400'}`}>
              {canUpload ? 'No proof uploaded yet — click to upload' : 'No proof documents'}
            </p>
            {canUpload && (
              <p className="text-xs text-amber-600 mt-1">Required before submitting for approval</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {proofs.map((proof) => (
              <li key={proof.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg group">
                <FileIcon className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{proof.file_name}</p>
                  <p className="text-xs text-gray-400">{proof.file_size ? formatFileSize(proof.file_size) : ''} · {formatDate(proof.uploaded_at)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={signedUrls[proof.id] ?? proof.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-brand-600 transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                  {canUpload && (
                    <button onClick={() => handleDeleteProof(proof)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audit trail */}
      {actions.length > 0 && (
        <div className="card overflow-hidden">
          <button
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setAuditOpen(!auditOpen)}
          >
            <h3 className="font-semibold text-gray-900">Activity Log ({actions.length})</h3>
            {auditOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {auditOpen && (
            <div className="border-t border-gray-100 px-5 pb-5">
              <ul className="space-y-3 mt-4">
                {[...actions].reverse().map((action) => {
                  const p = action.performer as { full_name?: string; email?: string } | undefined
                  return (
                    <li key={action.id} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        action.action_type === 'approve' ? 'bg-green-100' :
                        action.action_type === 'reject' ? 'bg-red-100' :
                        action.action_type === 'submit' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {action.action_type === 'approve' && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                        {action.action_type === 'reject' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                        {action.action_type === 'submit' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                        {action.action_type === 'cancel' && <X className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {action.action_type === 'submit' ? 'Submitted for approval' : action.action_type + 'd'}
                        </p>
                        {p && <p className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> {p.full_name ?? p.email}</p>}
                        <p className="text-xs text-gray-400">{formatDateTime(action.performed_at)}</p>
                        {action.rejection_reason && (
                          <p className="text-xs text-red-600 mt-0.5">Reason: {action.rejection_reason}</p>
                        )}
                        {action.charge_amount && (
                          <p className="text-xs text-red-600">Charge: {formatCurrency(action.charge_amount)}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ============ MODALS ============ */}

      {/* Submit confirmation */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Submit for Approval?</h3>
            <p className="text-sm text-gray-600 mb-6">This return will be sent to your area manager for review. You will not be able to edit it after submission.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmitForApproval} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Approval modal */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => !approving && setShowApproveModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Approve Return</h3>
                <p className="text-sm text-gray-500">Send confirmation to supplier</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Supplier Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-field pl-9"
                    placeholder="supplier@example.com"
                    value={approveEmail}
                    onChange={(e) => setApproveEmail(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">A return confirmation email will be sent to this address.</p>
              </div>
              <div>
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Any notes for the supplier…"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                />
              </div>
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                <strong>Note:</strong> The return will be marked as approved even if the email cannot be delivered.
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button disabled={approving} onClick={() => setShowApproveModal(false)} className="btn-secondary">Cancel</button>
              <button disabled={approving} onClick={handleApprove} className="btn-success">
                {approving ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : <><CheckCircle className="w-4 h-4" /> Approve & Send Email</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => !rejecting && setShowRejectModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reject Return</h3>
                <p className="text-sm text-gray-500">Record rejection reason and charge</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Rejection Reason <span className="text-red-500">*</span></label>
                <textarea
                  required
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Explain why this return is being rejected…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Charge Amount (EGP) <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Amount charged to the store for this return. Leave blank if no charge.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button disabled={rejecting} onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
              <button disabled={rejecting || !rejectReason.trim()} onClick={handleReject} className="btn-danger">
                {rejecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</> : <><XCircle className="w-4 h-4" /> Confirm Rejection</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => !cancelling && setShowCancelModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Return?</h3>
            <p className="text-sm text-gray-600 mb-6">This return will be permanently cancelled. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button disabled={cancelling} onClick={() => setShowCancelModal(false)} className="btn-secondary">Keep Return</button>
              <button disabled={cancelling} onClick={handleCancel} className="btn-danger">
                {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</> : 'Yes, Cancel Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
