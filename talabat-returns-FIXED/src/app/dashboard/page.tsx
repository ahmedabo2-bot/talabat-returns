import { createClient } from '@/lib/supabase/server'
import DashboardOverview from './DashboardOverview'
import type { DashboardStats, Return } from '@/types'

export default async function DashboardPage() {
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
    .select('*, store:stores(name, code), return_actions(charge_amount)')

  if (profile?.role === 'store_user' && profile.store_id) {
    returnsQuery = returnsQuery.eq('store_id', profile.store_id)
  } else if (profile?.role === 'area_manager') {
    const { data: assignments } = await supabase
      .from('manager_store_assignments')
      .select('store_id')
      .eq('manager_id', user.id)
    const ids = assignments?.map((a) => a.store_id) ?? []
    if (ids.length === 0) {
      return <DashboardOverview stats={{ total: 0, pending_proof: 0, pending_approval: 0, approved: 0, rejected: 0, cancelled: 0, total_charges: 0 }} recentReturns={[]} profile={profile} />
    }
    returnsQuery = returnsQuery.in('store_id', ids)
  }

  const { data: returns } = await returnsQuery.order('created_at', { ascending: false }).limit(100)

  const stats: DashboardStats = {
    total: returns?.length ?? 0,
    pending_proof: returns?.filter((r) => r.status === 'pending_proof').length ?? 0,
    pending_approval: returns?.filter((r) => r.status === 'pending_approval').length ?? 0,
    approved: returns?.filter((r) => r.status === 'approved').length ?? 0,
    rejected: returns?.filter((r) => r.status === 'rejected').length ?? 0,
    cancelled: returns?.filter((r) => r.status === 'cancelled').length ?? 0,
    total_charges: returns?.reduce((sum, r) => {
      const charges = (r.return_actions ?? []).reduce((s: number, a: { charge_amount: number | null }) => s + (a.charge_amount ?? 0), 0)
      return sum + charges
    }, 0) ?? 0,
  }

  const recentReturns = (returns ?? []).slice(0, 8) as Return[]

  return <DashboardOverview stats={stats} recentReturns={recentReturns} profile={profile} />
}
