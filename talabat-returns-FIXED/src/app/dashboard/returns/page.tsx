import { createClient } from '@/lib/supabase/server'
import ReturnsList from './ReturnsList'
import type { Return, Profile, Store } from '@/types'

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
      return <ReturnsList returns={[]} profile={profile as Profile} stores={[]} />
    }
  }

  const { data: returns } = await returnsQuery

  // Get stores for filter (managers/admin)
  let stores: Store[] = []
  if (profile?.role !== 'store_user') {
    const { data: storeData } = await supabase.from('stores').select('*').order('name')
    stores = storeData ?? []
  }

  return <ReturnsList returns={(returns ?? []) as Return[]} profile={profile as Profile} stores={stores} />
}
