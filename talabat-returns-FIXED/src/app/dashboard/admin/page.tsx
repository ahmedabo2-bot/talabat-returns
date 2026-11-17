'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Loader2, Building2, Users, Settings, FileSpreadsheet, ShieldAlert, UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import type { Store, Profile } from '@/types'

type Tab = 'stores' | 'managers' | 'users' | 'import'

export default function AdminPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('stores')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="card p-16 text-center max-w-md mx-auto">
        <ShieldAlert className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">Only administrators can access this panel.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'stores' as Tab, label: 'Stores', icon: Building2 },
    { id: 'managers' as Tab, label: 'Area Managers', icon: Users },
    { id: 'users' as Tab, label: 'Users', icon: Settings },
    { id: 'import' as Tab, label: 'Import / Export', icon: FileSpreadsheet },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stores' && <StoresTab />}
      {tab === 'managers' && <ManagersTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'import' && <ImportTab />}
    </div>
  )
}

/* ===== STORES TAB ===== */
function StoresTab() {
  const supabase = createClient()
  const [stores, setStores] = useState<Store[]>([])
  const [managers, setManagers] = useState<Profile[]>([])
  // storeId → managerId[]
  const [storeManagers, setStoreManagers] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', code: '', city: '', managerId: '' })
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    const [
      { data: storeData },
      { data: mgrData },
      { data: assignData },
    ] = await Promise.all([
      supabase.from('stores').select('*').order('name'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'area_manager').order('full_name'),
      supabase.from('manager_store_assignments').select('manager_id, store_id'),
    ])
    setStores(storeData ?? [])
    setManagers(mgrData ?? [])
    // Build storeId → managerIds[]
    const map: Record<string, string[]> = {}
    for (const a of (assignData ?? [])) {
      if (!map[a.store_id]) map[a.store_id] = []
      map[a.store_id].push(a.manager_id)
    }
    setStoreManagers(map)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function getManagerName(managerId: string) {
    const m = managers.find(x => x.id === managerId)
    if (!m) return '—'
    return (m as Profile & { full_name?: string }).full_name || m.email.split('@')[0]
  }

  function getStoreManagerLabel(storeId: string) {
    const ids = storeManagers[storeId] ?? []
    if (ids.length === 0) return { label: '—', extra: '' }
    const first = getManagerName(ids[0])
    const extra = ids.length > 1 ? ` +${ids.length - 1}` : ''
    return { label: first, extra }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return }
    setSaving(true)

    let savedStoreId: string | null = editId

    if (editId) {
      const { error } = await supabase
        .from('stores')
        .update({ name: form.name, code: form.code.toUpperCase(), city: form.city || null })
        .eq('id', editId)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Store updated')
      setEditId(null)
    } else {
      const { data, error } = await supabase
        .from('stores')
        .insert({ name: form.name, code: form.code.toUpperCase(), city: form.city || null })
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      savedStoreId = data.id
      toast.success('Store added')
      setShowAdd(false)
    }

    // Update manager assignment for this store
    if (savedStoreId) {
      // Remove all existing assignments for this store
      await supabase.from('manager_store_assignments').delete().eq('store_id', savedStoreId)
      // Add new assignment if a manager was selected
      if (form.managerId) {
        await supabase.from('manager_store_assignments').insert({
          manager_id: form.managerId,
          store_id: savedStoreId,
        })
      }
    }

    setForm({ name: '', code: '', city: '', managerId: '' })
    setSaving(false)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this store? This cannot be undone.')) return
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Store deleted'); fetchData() }
  }

  function startEdit(store: Store) {
    setEditId(store.id)
    const currentManagerIds = storeManagers[store.id] ?? []
    setForm({
      name: store.name,
      code: store.code,
      city: store.city ?? '',
      managerId: currentManagerIds[0] ?? '',
    })
    setShowAdd(false)
  }

  if (loading) return <div className="skeleton h-40 rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', code: '', city: '', managerId: '' }) }}
          className="btn-primary text-sm py-2"
        >
          <Plus className="w-4 h-4" /> Add Store
        </button>
      </div>

      y(showAdd || editId) && (
        <div className="card p-5 space-y-4 border-brand-200">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit Store' : 'Add New Store'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Store Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Talabat Mart - Maadi"
              />
            </div>
            <div>
              <label className="label">Store Code *</label>
              <input
                className="input-field uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="EG_Cairo_DS_1"
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                className="input-field"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Cairo"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Area Manager
              </label>
              <select
                className="input-field"
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              >
                <option value="">— Unassigned —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {(m as Profile & { full_name?: string }).full_name || m.email.split('@')[0]} ({m.email})
                  </option>
                ))}
              </select>
              {managers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No area managers yet. Add them in the Area Managers tab.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? 'Update' : 'Save'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null) }} className="btn-secondary text-sm py-2">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {stores.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No stores yet. Add one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">
                    <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Area Manager</span>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => {
                  const { label, extra } = getStoreManagerLabel(s.id)
                  return (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.city ?? '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {label === '—' ? (
                          <span className="text-gray-400 italic text-xs">Unassigned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full font-medium">
                            <UserCheck className="w-3 h-3" />
                            {label}
                            {extra && <span className="text-brand-500">{extra}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(s)}
                          className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

/* ===== MANAGERS TAB ===== */
function ManagersTab() {
  const supabase = createClient()
  const [managers, setManagers] = useState<(Profile & { assignments?: { store: Store }[] })[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '' })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchData() {
    const [{ data: mgrs }, { data: storeList }] = await Promise.all([
      supabase.from('profiles').select(`*, assignments:manager_store_assignments(store:stores(*))`).eq('role', 'area_manager'),
      supabase.from('stores').select('*').order('name'),
    ])
    setManagers(mgrs ?? [])
    setStores(storeList ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  async function handleAddManager() {
    if (!form.email.trim()) { toast.error('Email required'); return }
    setSaving(true)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', form.email.trim().toLowerCase())
      .single()
    if (!existing) {
      toast.error('User not found. They must sign in once first (via magic link), then you can assign them here.')
      setSaving(false)
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'area_manager', full_name: form.full_name || null })
      .eq('id', existing.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Manager role assigned!')
    setShowAdd(false)
    setForm({ email: '', full_name: '' })
    setSaving(false)
    fetchData()
  }

  async function toggleAssignment(managerId: string, storeId: string, currentlyAssigned: boolean) {
    if (currentlyAssigned) {
      await supabase.from('manager_store_assignments').delete().eq('manager_id', managerId).eq('store_id', storeId)
    } else {
      await supabase.from('manager_store_assignments').insert({ manager_id: managerId, store_id: storeId })
    }
    fetchData()
  }

  async function handleRemoveManager(id: string) {
    if (!confirm('Remove manager role? They will become a store user.')) return
    await supabase.from('profiles').update({ role: 'store_user' }).eq('id', id)
    await supabase.from('manager_store_assignments').delete().eq('manager_id', id)
    toast.success('Manager removed')
    fetchData()
  }

  if (loading) return <div className="skeleton h-40 rounded-xl" />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-2">
          <Plus className="w-4 h-4" /> Add Manager
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Assign Manager Role</h3>
          <p className="text-sm text-gray-500">
            The user must have signed in at least once. Enter their email to assign the manager role.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">User Email *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="manager@talabat.com"
              />
            </div>
            <div>
              <label className="label">Display Name</label>
              <input
                className="input-field"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Sara Manager"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddManager} disabled={saving} className="btn-primary text-sm py-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Assign Role
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {managers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No area managers yet. Area managers appear here after they sign in for the first time.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigned Stores</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => {
                const assigned = m.assignments?.map((a) => a.store) ?? []
                const isExpanded = expandedId === m.id
                return (
                  <>
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {(m as Profile & { full_name?: string }).full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{m.email}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {assigned.length === 0 ? (
                          <span className="text-gray-400 italic text-xs">No stores assigned</span>
                        ) : (
                          <span className="text-xs">
                            {assigned.map((s) => (s as Store).name).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          className="text-xs text-brand-500 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50"
  {                     >
                          {isExpanded ? 'Close' : 'Edit Stores'}
                        </button>
                        <button
                          onClick={() => handleRemoveManager(m.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.id}-expanded`} className="bg-blue-50/50 border-b border-blue-100">
                        <td colSpan={4} className="px-4 py-4">
                          <p className="text-xs font-semibold text-gray-600 mb-2">
                            Assign stores to {(m as Profile & { full_name?: string }).full_name ?? m.email}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {stores.map((store) => {
                              const isAssigned = assigned.some((s) => (s as Store).id === store.id)
                              return (
                                <label key={store.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => toggleAssignment(m.id, store.id, isAssigned)}
                                    className="accent-brand-500"
                                  />
                                  <span className="text-sm text-gray-700">{store.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ===== USERS TAB ===== */
function UsersTab() {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function fetchData() {
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*, store:stores(name)').order('created_at', { ascending: false }),
      supabase.from('stores').select('*').order('name'),
    ])
    setUsers(u ?? [])
    setStores(s ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  async function updateRole(id: string, role: string, storeId?: string) {
    setSaving(id)
    const update: Record<string, string | null> = { role }
    if (role === 'store_user' && storeId) update.store_id = storeId
    if (role !== 'store_user') update.store_id = null
    await supabase.from('profiles').update(update).eq('id', id)
    setSaving(null)
    toast.success('Role updated')
    fetchData()
  }

  async function handleDeleteUser(id: string, email: string) {
    if (!confirm(`Delete user "${email}"? This removes their profile data but not their auth account.`)) return
    setDeleting(id)
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    toast.success('User profile deleted')
    setDeleting(null)
    fetchData()
  }

  if (loading) return <div className="skeleton h-40 rounded-xl" />

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Store</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {(u as Profile & { full_name?: string }).full_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="input-field py-1 text-xs w-auto"
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                  >
                    <option value="store_user">Store User</option>
                    <option value="area_manager">Area Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  {saving === u.id && <Loader2 className="w-3 h-3 animate-spin inline ml-1 text-brand-500" />}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {u.role === 'store_user' ? (
                    <select
                      className="input-field py-1 text-xs w-auto"
                      value={u.store_id ?? ''}
                      onChange={(e) => updateRole(u.id, 'store_user', e.target.value)}
                    >
                      <option value="">No store</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-400 italic text-xs">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    disabled={deleting === u.id}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete user profile"
                  >
                    {deleting === u.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ===== IMPORT TAB ===== */
function ImportTab() {
  const supabase = createClient()
  const managerFileRef = useRef<HTMLInputElement>(null)
  const storeFileRef = useRef<HTMLInputElement>(null)

  const [managerPreview, setManagerPreview] = useState<string[][]>([])
  const [storePreview, setStorePreview] = useState<string[][]>([])
  const [managerImporting, setManagerImporting] = useState(false)
  const [storeImporting, setStoreImporting] = useState(false)
  const [managerResults, setManagerResults] = useState<{ row: string[]; success: boolean; message: string }[]>([])
  const [storeResults, setStoreResults] = useState<{ row: string[]; success: boolean; message: string }[]>([])
  const [managerFile, setManagerFile] = useState<File | null>(null)
  const [storeFile, setStoreFile] = useState<File | null>(null)

  function parseCSV(file: File, onResult: (data: string[][]) => void) {
    Papa.parse(file, { complete: (result) => onResult(result.data as string[][]), skipEmptyLines: true })
  }

  function handleManagerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    parseCSV(file, (data) => {
      const rows = data.filter((r) => r.length >= 2 && r[0] !== 'manager_email')
      setManagerPreview(rows.slice(0, 5))
      setManagerFile(file)
    })
  }

  function handleStoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    parseCSV(file, (data) => {
      const rows = data.filter((r) => r.length >= 2 && r[0] !== 'code')
      setStorePreview(rows.slice(0, 5))
      setStoreFile(file)
    })
  }

  async function importManagers() {
    if (!managerFile) return
    setManagerImporting(true)
    const results: typeof managerResults = []
    await new Promise<void>((resolve) => {
      Papa.parse(managerFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          const rows = result.data as Record<string, string>[]
          for (const row of rows) {
            const email = (row.manager_email ?? '').trim().toLowerCase()
            const storeCode = (row.store_code ?? '').trim().toUpperCase()
            if (!email || !storeCode) {
              results.push({ row: [email, storeCode], success: false, message: 'Missing email or store_code' })
              continue
            }
            const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single()
            if (!profile) { results.push({ row: [email, storeCode], success: false, message: `User ${email} not found` }); continue }
            const { data: store } = await supabase.from('stores').select('id').ilike('code', storeCode).single()
            if (!store) { results.push({ row: [email, storeCode], success: false, message: `Store ${storeCode} not found` }); continue }
            await supabase.from('profiles').update({ role: 'area_manager' }).eq('id', profile.id)
            const { error } = await supabase.from('manager_store_assignments').upsert(
              { manager_id: profile.id, store_id: store.id },
              { onConflict: 'manager_id,store_id' },
            )
            if (error) results.push({ row: [email, storeCode], success: false, message: error.message })
            else results.push({ row: [email, storeCode], success: true, message: 'Assigned ✓' })
          }
          resolve()
        },
      })
    })
    setManagerResults(results)
    setManagerImporting(false)
    const success = results.filter((r) => r.success).length
    toast.success(`Import complete: ${success}/${results.length} successful`)
  }

  async function importStores() {
    if (!storeFile) return
    setStoreImporting(true)
    const results: typeof storeResults = []
    await new Promise<void>((resolve) => {
      Papa.parse(storeFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          const rows = result.data as Record<string, string>[]
          for (const row of rows) {
            const code = (row.code ?? '').trim().toUpperCase()
            const name = (row.name ?? '').trim()
            const city = (row.city ?? '').trim() || null
            if (!code || !name) { results.push({ row: [code, name], success: false, message: 'Missing code or name' }); continue }
            const { error } = await supabase.from('stores').upsert({ code, name, city }, { onConflict: 'code' })
            if (error) results.push({ row: [code, name], success: false, message: error.message })
            else results.push({ row: [code, name], success: true, message: 'Saved ✓' })
          }
          resolve()
        },
      })
    })
    setStoreResults(results)
    setStoreImporting(false)
    toast.success('Stores import complete')
  }

  async function exportReturns() {
    const { data } = await supabase
      .from('returns')
      .select('*, store:stores(name, code)')
      .order('created_at', { ascending: false })
    if (!data) return
    const csv = [
      ['Return #', 'Date', 'Store', 'Supplier', 'Reason', 'Status', 'Created At'],
      ...data.map((r) => [
        r.portal_return_number ?? r.id.slice(0, 8),
        r.return_date,
        (r.store as { name?: string } | null)?.name ?? '',
        r.supplier_name,
        r.return_reason,
        r.status,
        r.created_at,
      ]),
    ]
      .map((row) => row.map((v) => `"${v}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `all-returns-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Export Data</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportReturns} className="btn-secondary text-sm py-2">
            <Download className="w-4 h-4" /> Export All Returns (CSV)
          </button>
        </div>
      </div>

      {/* Import Manager Assignments */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Import Manager–Store Assignments</h3>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Expected CSV format:</p>
          <code className="text-xs text-gray-600 font-mono block">manager_email,store_code</code>
          <code className="text-xs text-gray-500 font-mono block">sara@talabat.com,EG_Cairo_DS_1</code>
        </div>
        <input ref={managerFileRef} type="file" accept=".csv" className="hidden" onChange={handleManagerFile} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => managerFileRef.current?.click()} className="btn-secondary text-sm py-2">
            <Upload className="w-4 h-4" /> Choose CSV File
          </button>
          {managerFile && (
            <button onClick={importManagers} disabled={managerImporting} className="btn-primary text-sm py-2">
              {managerImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Import {managerPreview.length}+ rows
            </button>
          )}
        </div>
        {managerPreview.length > 0 && (
          <div className="text-xs text-gray-500">
            Preview: {managerPreview.map((r) => r.join(' → ')).join(' | ')} {managerPreview.length === 5 && '…'}
          </div>
        )}
        {managerResults.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
            {managerResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {r.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {r.row.join(' → ')}: {r.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Stores */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Import Stores</h3>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Expected CSV format:</p>
          <code className="text-xs text-gray-600 font-mono block">code,name,city</code>
          <code className="text-xs text-gray-500 font-mono block">EG_Cairo_DS_1,Cairo DS 1,Cairo</code>
        </div>
        <input ref={storeFileRef} type="file" accept=".csv" className="hidden" onChange={handleStoreFile} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => storeFileRef.current?.click()} className="btn-secondary text-sm py-2">
            <Upload className="w-4 h-4" /> Choose CSV File
          </button>
          {storeFile && (
            <button onClick={importStores} disabled={storeImporting} className="btn-primary text-sm py-2">
              {storeImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Import Stores
            </button>
          )}
        </div>
        {storeResults.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
            {storeResults.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {r.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {r.row.join(' → ')}: {r.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
