'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, AlertCircle, Loader2, DollarSign, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { Store } from '@/types'

interface ChargeRow {
  id: string
  return_date: string
  portal_return_number?: string
  store_name: string
  store_id: string
  supplier_name: string
  return_reason: string
  rejection_reason: string
  charge_amount: number
  rejected_at: string
}

export default function ChargesPage() {
  const supabase = createClient()
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [profile, setProfile] = useState<{ role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single()
      setProfile(p)

      // Build query for rejected returns with charges
      let query = supabase
        .from('return_actions')
        .select(`
          id,
          rejection_reason,
          charge_amount,
          performed_at,
          return:returns(
            id,
            portal_return_number,
            return_date,
            supplier_name,
            return_reason,
            store_id,
            store:stores(id, name)
          )
        `)
        .eq('action_type', 'reject')
        .not('charge_amount', 'is', null)
        .gt('charge_amount', 0)

      const { data: rawActions } = await query

      // Flatten
      const rows: ChargeRow[] = (rawActions ?? [])
        .filter((a) => a.return)
        .map((a) => {
          const ret = a.return as {
            id: string
            portal_return_number?: string
            return_date: string
            supplier_name: string
            return_reason: string
            store_id: string
            store?: { id: string; name: string }
          }
          return {
            id: a.id,
            return_date: ret.return_date,
            portal_return_number: ret.portal_return_number,
            store_name: ret.store?.name ?? '—',
            store_id: ret.store_id,
            supplier_name: ret.supplier_name,
            return_reason: ret.return_reason,
            rejection_reason: a.rejection_reason ?? '',
            charge_amount: a.charge_amount ?? 0,
            rejected_at: a.performed_at,
          }
        })

      // Filter by role
      let filtered = rows
      if (p?.role === 'store_user') {
        const { data: prof } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
        filtered = rows.filter((r) => r.store_id === prof?.store_id)
      } else if (p?.role === 'area_manager') {
        const { data: assignments } = await supabase.from('manager_store_assignments').select('store_id').eq('manager_id', user.id)
        const ids = assignments?.map((a: { store_id: string }) => a.store_id) ?? []
        filtered = rows.filter((r) => ids.includes(r.store_id))
      }

      setCharges(filtered)

      // Stores for filter
      if (p?.role !== 'store_user') {
        const uniqueStoreIds = [...new Set(filtered.map((r) => r.store_id))]
        const storeList = filtered.reduce<Store[]>((acc, r) => {
          if (!acc.find((s) => s.id === r.store_id)) {
            acc.push({ id: r.store_id, name: r.store_name, code: '', created_at: '' })
          }
          return acc
        }, [])
        setStores(storeList)
      }

      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return charges.filter((c) => {
      if (storeFilter && c.store_id !== storeFilter) return false
      if (dateFrom && c.return_date < dateFrom) return false
      if (dateTo && c.return_date > dateTo) return false
      return true
    })
  }, [charges, storeFilter, dateFrom, dateTo])

  const totalCharge = filtered.reduce((sum, c) => sum + c.charge_amount, 0)

  // Group by store
  const byStore = useMemo(() => {
    const map = new Map<string, { name: string; total: number; rows: ChargeRow[] }>()
    for (const c of filtered) {
      if (!map.has(c.store_id)) map.set(c.store_id, { name: c.store_name, total: 0, rows: [] })
      const entry = map.get(c.store_id)!
      entry.rows.push(c)
      entry.total += c.charge_amount
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtered])

  function exportCSV() {
    const headers = ['Return Date', 'Return #', 'Store', 'Supplier', 'Return Reason', 'Rejection Reason', 'Charge (EGP)', 'Rejected On']
    const rows = filtered.map((c) => [
      c.return_date, c.portal_return_number ?? '—', c.store_name, c.supplier_name,
      c.return_reason, c.rejection_reason, c.charge_amount, formatDate(c.rejected_at),
    ])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `store-charges-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500">{filtered.length} rejected return{filtered.length !== 1 ? 's' : ''} with charges</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary text-sm py-2 px-3', showFilters && 'bg-brand-50 text-brand-600 border border-brand-200')}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          <button onClick={exportCSV} className="btn-secondary text-sm py-2 px-3">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {stores.length > 0 && (
            <div>
              <label className="label text-xs">Store</label>
              <select className="input-field text-sm" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="">All Stores</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label text-xs">From Date</label>
            <input type="date" className="input-field text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">To Date</label>
            <input type="date" className="input-field text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Total summary card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Charges (filtered)</p>
          <p className="text-3xl font-bold text-purple-700">{formatCurrency(totalCharge)}</p>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Charge amounts are manually entered by area managers when rejecting returns. Amounts can be updated via the Admin panel if needed.</span>
      </div>

      {/* Per-store breakdown */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No charges recorded</p>
          <p className="text-gray-400 text-sm mt-1">Charges appear here when returns are rejected with a charge amount.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byStore.map((group) => (
            <div key={group.name} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <span className="text-sm font-bold text-purple-700">{formatCurrency(group.total)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Return #</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Supplier</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Reason</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Rejection Note</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(row.return_date)}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                            {row.portal_return_number ?? row.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 hidden md:table-cell">{row.supplier_name}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{row.return_reason}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs hidden xl:table-cell max-w-48 truncate">{row.rejection_reason}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">{formatCurrency(row.charge_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-purple-50/50">
                      <td colSpan={5} className="px-4 py-2 text-right text-sm font-semibold text-gray-700 hidden lg:table-cell">Store Total:</td>
                      <td colSpan={5} className="px-4 py-2 text-right text-sm font-semibold text-gray-700 lg:hidden">Total:</td>
                      <td className="px-4 py-2 text-right font-bold text-purple-700">{formatCurrency(group.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {/* Grand total */}
          {byStore.length > 1 && (
            <div className="card p-4 flex justify-between items-center bg-purple-50 border-purple-100">
              <span className="font-bold text-gray-800">Grand Total</span>
              <span className="text-xl font-bold text-purple-700">{formatCurrency(totalCharge)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
