'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, Download, Filter, ChevronUp, ChevronDown,
  FileText, Eye, X, ArrowUpDown, Users,
} from 'lucide-react'
import type { Return, Profile, Store, ReturnStatus } from '@/types'
import StatusBadge from '@/components/returns/StatusBadge'
import { formatDate, cn } from '@/lib/utils'
import type { Manager } from './page'

interface ReturnsListProps {
  returns: Return[]
  profile: Profile
  stores: Store[]
  managers: Manager[]
}

type SortKey = 'return_date' | 'portal_return_number' | 'supplier_name' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_proof', label: 'Missing Proof' },
  { value: 'pending_approval', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ReturnsList({ returns, profile, stores, managers }: ReturnsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all')
  const [storeFilter, setStoreFilter] = useState('')
  const [amFilter, setAmFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('return_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setStatus(s)
  }, [searchParams])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleAmFilter(managerId: string) {
    setAmFilter(managerId)
    setStoreFilter('')
  }

  const filteredStores = useMemo(() => {
    if (!amFilter) return stores
    const am = managers.find(m => m.id === amFilter)
    if (!am) return stores
    return stores.filter(s => am.store_ids.includes(s.id))
  }, [amFilter, managers, stores])

  const amStoreIds = useMemo(() => {
    if (!amFilter) return null
    return managers.find(m => m.id === amFilter)?.store_ids ?? []
  }, [amFilter, managers])

  const filtered = useMemo(() => {
    let r = returns.filter((item) => {
      if (status !== 'all' && item.status !== status) return false
      if (amStoreIds !== null && !amStoreIds.includes(item.store_id)) return false
      if (storeFilter && item.store_id !== storeFilter) return false
      if (supplierFilter && !item.supplier_name.toLowerCase().includes(supplierFilter.toLowerCase())) return false
      if (dateFrom && item.return_date < dateFrom) return false
      if (dateTo && item.return_date > dateTo) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (item.portal_return_number ?? '').toLowerCase().includes(q) ||
          item.supplier_name.toLowerCase().includes(q) ||
          item.return_reason.toLowerCase().includes(q) ||
          ((item.store as { name?: string } | undefined)?.name ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
    r.sort((a, b) => {
      let va: string | number = a[sortKey] ?? ''
      let vb: string | number = b[sortKey] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return r
  }, [returns, search, status, storeFilter, amStoreIds, supplierFilter, dateFrom, dateTo, sortKey, sortDir])

  function exportCSV() {
    const headers = ['Return Date', 'Return #', 'Store', 'Supplier', 'Reason', 'Status', 'SKUs', 'Proofs']
    const rows = filtered.map((r) => [
      r.return_date, r.portal_return_number ?? r.id.slice(0, 8),
      (r.store as { name?: string } | undefined)?.name ?? '',
      r.supplier_name, r.return_reason, r.status,
      (r.return_skus ?? []).length, (r.return_proofs ?? []).length,
    ])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-brand-500" />
      : <ChevronDown className="w-3 h-3 text-brand-500" />
  }

  const isAdmin = profile.role === 'admin'
  const showStoreCol = profile.role !== 'store_user'
  const hasActiveFilters = [status !== 'all', storeFilter, amFilter, supplierFilter, dateFrom, dateTo].filter(Boolean).length

  function clearAllFilters() {
    setStatus('all'); setStoreFilter(''); setAmFilter(''); setSupplierFilter(''); setDateFrom(''); setDateTo('')
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{filtered.length} of {returns.length} returns</p>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm py-2 px-3">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <Link href="/dashboard/returns/new" className="btn-primary text-sm py-2 px-3">
            <Plus className="w-3.5 h-3.5" /> New Return
          </Link>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search returns, supplier, store…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select className="input-field w-auto min-w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {(isAdmin || profile.role === 'area_manager') && (
          <div className="flex gap-3 flex-wrap">
            {isAdmin && managers.length > 0 && (
              <div className="flex-1 min-w-44">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select className="input-field pl-9 text-sm" value={amFilter} onChange={(e) => handleAmFilter(e.target.value)}>
                    <option value="">All Area Managers</option>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {filteredStores.length > 0 && (
              <div className="flex-1 min-w-44">
                <select className="input-field text-sm" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                  <option value="">{amFilter ? 'All Stores (this AM)' : 'All Stores'}</option>
                  {filteredStores.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn('btn-secondary text-sm py-2 px-3', showAdvanced && 'bg-brand-50 text-brand-600 border border-brand-200')}>
              <Filter className="w-3.5 h-3.5" /> More
            </button>
            {hasActiveFilters > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2">
                <X className="w-3 h-3" /> Clear ({hasActiveFilters})
              </button>
            )}
          </div>
        )}

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="label text-xs">Supplier</label>
              <input className="input-field text-xs" placeholder="Search supplier" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">From Date</label>
              <input type="date" className="input-field text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">To Date</label>
              <input type="date" className="input-field text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No returns found</p>
            <p className="text-gray-400 text-sm mt-1">
              {returns.length === 0 ? 'Create your first return to get started.' : 'Try adjusting your filters.'}
            </p>
            {returns.length === 0 && (
              <Link href="/dashboard/returns/new" className="btn-primary mt-4 inline-flex text-sm">
                <Plus className="w-3.5 h-3.5" /> New Return
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort('return_date')}>
                    <span className="flex items-center gap-1">Date <SortIcon col="return_date" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort('portal_return_number')}>
                    <span className="flex items-center gap-1">Return # <SortIcon col="portal_return_number" /></span>
                  </th>
                  {showStoreCol && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Store</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 hidden lg:table-cell" onClick={() => handleSort('supplier_name')}>
                    <span className="flex items-center gap-1">Supplier <SortIcon col="supplier_name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Reason</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Docs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700" onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const skuCount = (r.return_skus ?? []).length
                  const proofCount = (r.return_proofs ?? []).length
                  return (
                    <tr key={r.id} className="table-row-hover border-b border-gray-50 last:border-0 cursor-pointer" onClick={() => router.push(`/dashboard/returns/${r.id}`)}>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.return_date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {r.portal_return_number ?? r.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      {showStoreCol && <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{(r.store as { name?: string } | undefined)?.name ?? '—'}</td>}
                      <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{r.supplier_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">{r.return_reason}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-400">
                          {skuCount}SKU {proofCount > 0 ? <span className="text-green-600 font-medium">{proofCount}📎</span> : <span className="text-amber-500 font-medium">0📎</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status as ReturnStatus} /></td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => router.push(`/dashboard/returns/${r.id}`)} className="text-brand-500 hover:text-brand-700 p-1 rounded hover:bg-brand-50 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
