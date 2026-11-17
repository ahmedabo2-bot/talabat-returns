import { createClient } from '@/lib/supabase/server'
import ReturnsList from './ReturnsList'
import type { Return, Profile, Store } from '@/types'

export interface Manager {
  id: string
  full_name: string
  email: string
  store_ids: string[]
}

export default async function ReturnsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let returnsQuery = supabase
    .from('returns')
    .select(`
      *,
      store:stores(id, name, code),
      return_skus(id),
      return_proofs(id)
    `)
    .order('created_at', { ascending: false })

  if (profile?.role === 'store_user' && profile.store_id) {
    returnsQuery = returnsQuery.eq('store_id', profile.store_id)
  } else if (profile?.role === 'area_manager') {
    const { data: assignments } = await supabase
      .from('manager_store_assignments')
      .select('store_id')
      .eq('manager_id', user.id)
    const ids = assignments?.map((a: { store_id: string }) => a.store_id) ?? []
    if (ids.length > 0) {
      returnsQuery = returnsQuery.in('store_id', ids)
    } else {
      return <ReturnsList returns={[]} profile={profile as Profile} stores={[]} managers={[]} />
    }
  }

  const { data: returns } = await returnsQuery

  let stores: Store[] = []
  if (profile?.role !== 'store_user') {
    const { data: storeData } = await supabase.from('stores').select('*').order('name')
    stores = storeData ?? []
  }

  let managers: Manager[] = []
  if (profile?.role === 'admin') {
    const { data: mgrs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'area_manager')
      .order('full_name')

    if (mgrs?.length) {
      const { data: assignments } = await supabase
        .from('manager_store_assignments')
        .select('manager_id, store_id')

      managers = mgrs.map((m: { id: string; full_name: string; email: string }) => ({
        id: m.id,
        full_name: m.full_name ?? m.email.split('@')[0],
        email: m.email,
        store_ids: (assignments ?? [])
          .filter((a: { manager_id: string; store_id: string }) => a.manager_id === m.id)
          .map((a: { manager_id: string; store_id: string }) => a.store_id),
      }))
    }
  }

  return (
    <ReturnsList
      returns={(returns ?? []) as Return[]}
      profile={profile as Profile}
      stores={stores}
      managers={managers}
    />
  )
}
