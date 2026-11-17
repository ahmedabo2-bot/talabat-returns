'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Upload, AlertTriangle, ArrowLeft, Loader2, FileIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { RETURN_REASONS, generateReturnNumber } from '@/lib/utils'
import type { Store, Supplier, Profile } from '@/types'

interface SkuRow {
  id: string
  sku_code: string
  sku_name: string
  quantity: number
  unit_price: string
}

interface ProofFile {
  file: File
  id: string
}

export default function NewReturnPage() {
  const router = useRouter()
  const supabase = createClient()
  const proofInputRef = useRef<HTMLInputElement>(null)
  const sourceInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [portalReturnNum, setPortalReturnNum] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10))
  const [storeId, setStoreId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [notes, setNotes] = useState('')

  const [skus, setSkus] = useState<SkuRow[]>([
    { id: crypto.randomUUID(), sku_code: '', sku_name: '', quantity: 1, unit_price: '' },
  ])

  const [proofFiles, setProofFiles] = useState<ProofFile[]>([])
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*, store:stores(*)').eq('id', user.id).single()
      setProfile(p)

      if (p?.role === 'store_user' && p.store_id) {
        setStoreId(p.store_id)
        setStores([p.store as Store])
      } else {
        const { data: storeData } = await supabase.from('stores').select('*').order('name')
        setStores(storeData ?? [])
      }

      const { data: supplierData } = await supabase.from('suppliers').select('*').order('name')
      setSuppliers(supplierData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function addSku() {
    setSkus((prev) => [...prev, { id: crypto.randomUUID(), sku_code: '', sku_name: '', quantity: 1, unit_price: '' }])
  }

  function removeSku(id: string) {
    if (skus.length === 1) return
    setSkus((prev) => prev.filter((s) => s.id !== id))
  }

  function updateSku(id: string, field: keyof SkuRow, value: string | number) {
    setSkus((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function handleProofDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    addProofFiles(files)
  }

  function addProofFiles(files: File[]) {
    const newFiles = files.map((file) => ({ file, id: crypto.randomUUID() }))
    setProofFiles((prev) => [...prev, ...newFiles])
  }

  function removeProof(id: string) {
    setProofFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!storeId) { toast.error('Please select a store'); return }
    if (!supplierName.trim()) { toast.error('Please enter a supplier name'); return }
    if (!returnReason) { toast.error('Please select a return reason'); return }
    if (skus.some((s) => !s.sku_name.trim())) { toast.error('All SKU rows must have a name'); return }

    setSubmitting(true)
    const toastId = toast.loading('Creating return…')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload proof files
      const proofRecords: { file_name: string; file_url: string; file_size: number; file_type: string; uploaded_by: string }[] = []
      for (const { file } of proofFiles) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
        const { error: uploadErr } = await supabase.storage.from('return-proofs').upload(path, file)
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)
        const { data: urlData } = supabase.storage.from('return-proofs').getPublicUrl(path)
        proofRecords.push({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
        })
      }

      // Upload source PDF if provided
      let sourcePdfUrl: string | undefined
      if (sourceFile) {
        const path = `source/${user.id}/${Date.now()}-${sourceFile.name.replace(/\s+/g, '_')}`
        const { error: srcErr } = await supabase.storage.from('return-proofs').upload(path, sourceFile)
        if (!srcErr) {
          const { data: srcUrl } = supabase.storage.from('return-proofs').getPublicUrl(path)
          sourcePdfUrl = srcUrl.publicUrl
        }
      }

      const status = proofRecords.length > 0 ? 'pending_approval' : 'pending_proof'

      // Create return
      const { data: returnData, error: returnErr } = await supabase
        .from('returns')
        .insert({
          portal_return_number: portalReturnNum.trim() || generateReturnNumber(),
          return_date: returnDate,
          store_id: storeId,
          supplier_name: supplierName.trim(),
          return_reason: returnReason,
          status,
          notes: notes.trim() || null,
          source_pdf_url: sourcePdfUrl ?? null,
          created_by: user.id,
        })
        .select()
        .single()

      if (returnErr) throw returnErr

      // Create SKUs
      const skuInserts = skus
        .filter((s) => s.sku_name.trim())
        .map((s) => ({
          return_id: returnData.id,
          sku_code: s.sku_code.trim() || null,
          sku_name: s.sku_name.trim(),
          quantity: s.quantity,
          unit_price: s.unit_price ? parseFloat(s.unit_price) : null,
          total_amount: s.unit_price ? parseFloat(s.unit_price) * s.quantity : null,
        }))

      if (skuInserts.length > 0) {
        const { error: skuErr } = await supabase.from('return_skus').insert(skuInserts)
        if (skuErr) throw skuErr
      }

      // Create proof records
      if (proofRecords.length > 0) {
        const { error: proofErr } = await supabase
          .from('return_proofs')
          .insert(proofRecords.map((p) => ({ ...p, return_id: returnData.id })))
        if (proofErr) throw proofErr
      }

      toast.dismiss(toastId)
      toast.success(
        proofRecords.length > 0
          ? 'Return submitted for approval!'
          : 'Return created. Upload proof to submit for approval.'
      )
      router.push(`/dashboard/returns/${returnData.id}`)
    } catch (err: unknown) {
      toast.dismiss(toastId)
      toast.error(err instanceof Error ? err.message : 'Failed to create return')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  const totalAmount = skus.reduce((sum, s) => {
    const price = parseFloat(s.unit_price) || 0
    return sum + price * s.quantity
  }, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">New Return</h2>
          <p className="text-sm text-gray-500">Record a supplier return for approval</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Return Info */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Return Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Portal Return Number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input-field"
                placeholder="e.g. RTN-2024-001"
                value={portalReturnNum}
                onChange={(e) => setPortalReturnNum(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to auto-generate</p>
            </div>
            <div>
              <label className="label">Return Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                className="input-field"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>

            {(profile?.role !== 'store_user' || stores.length > 1) && (
              <div>
                <label className="label">Store <span className="text-red-500">*</span></label>
                <select
                  required
                  className="input-field"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  disabled={profile?.role === 'store_user'}
                >
                  <option value="">Select store…</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">Supplier Name <span className="text-red-500">*</span></label>
              <input
                list="supplier-list"
                className="input-field"
                placeholder="Type supplier name…"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
              <datalist id="supplier-list">
                {suppliers.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>

            <div>
              <label className="label">Supplier Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="supplier@example.com"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Used when sending approval email</p>
            </div>

            <div>
              <label className="label">Return Reason <span className="text-red-500">*</span></label>
              <select
                required
                className="input-field"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                <option value="">Select reason…</option>
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Any additional notes about this return…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* SKU Details */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            SKU Details
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 font-medium text-gray-600 text-xs uppercase tracking-wide">SKU Code</th>
                  <th className="text-left pb-2 font-medium text-gray-600 text-xs uppercase tracking-wide">Item Name *</th>
                  <th className="text-left pb-2 font-medium text-gray-600 text-xs uppercase tracking-wide w-20">Qty</th>
                  <th className="text-left pb-2 font-medium text-gray-600 text-xs uppercase tracking-wide w-28">Unit Price (EGP)</th>
                  <th className="text-right pb-2 font-medium text-gray-600 text-xs uppercase tracking-wide w-24">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="space-y-2">
                {skus.map((sku) => {
                  const total = (parseFloat(sku.unit_price) || 0) * sku.quantity
                  return (
                    <tr key={sku.id} className="border-b border-gray-50">
                      <td className="py-2 pr-2">
                        <input className="input-field text-xs" placeholder="SKU-001" value={sku.sku_code} onChange={(e) => updateSku(sku.id, 'sku_code', e.target.value)} />
                      </td>
                      <td className="py-2 pr-2">
                        <input className="input-field text-xs" placeholder="Product name" required value={sku.sku_name} onChange={(e) => updateSku(sku.id, 'sku_name', e.target.value)} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="1" className="input-field text-xs" value={sku.quantity} onChange={(e) => updateSku(sku.id, 'quantity', parseInt(e.target.value) || 1)} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="0" step="0.01" className="input-field text-xs" placeholder="0.00" value={sku.unit_price} onChange={(e) => updateSku(sku.id, 'unit_price', e.target.value)} />
                      </td>
                      <td className="py-2 text-right text-gray-700 font-medium text-xs">
                        {total > 0 ? `EGP ${total.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 pl-2">
                        <button type="button" onClick={() => removeSku(sku.id)} disabled={skus.length === 1} className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {totalAmount > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="pt-3 text-right text-sm font-semibold text-gray-700">Total Return Value:</td>
                    <td className="pt-3 text-right text-sm font-bold text-gray-900">EGP {totalAmount.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <button type="button" onClick={addSku} className="btn-secondary text-xs py-1.5 px-3">
            <Plus className="w-3 h-3" /> Add SKU
          </button>
        </div>

        {/* Source Document */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Portal Source Document <span className="text-xs font-normal text-gray-400 ml-1">(optional)</span>
          </h3>
          <p className="text-sm text-gray-500">If you downloaded a PDF from the Talabat portal, attach it here.</p>

          {sourceFile ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700 flex-1 truncate">{sourceFile.name}</span>
              <button type="button" onClick={() => setSourceFile(null)} className="text-gray-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sourceInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <Upload className="w-4 h-4" /> Upload PDF
            </button>
          )}
          <input ref={sourceInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)} />
        </div>

        {/* Proof Documents */}
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
            Proof of Return Documents
          </h3>

          {proofFiles.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You can submit without proof now, but the return cannot be sent for manager approval until proof is uploaded.</span>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleProofDrop}
            onClick={() => proofInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Drop files here or <span className="text-brand-500">click to upload</span></p>
            <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG up to 50MB</p>
          </div>
          <input
            ref={proofInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => addProofFiles(Array.from(e.target.files ?? []))}
          />

          {proofFiles.length > 0 && (
            <ul className="space-y-2">
              {proofFiles.map(({ file, id }) => (
                <li key={id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <FileIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => removeProof(id)} className="text-gray-400 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            ) : proofFiles.length > 0 ? (
              'Submit for Approval'
            ) : (
              'Create Return (Add Proof Later)'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
