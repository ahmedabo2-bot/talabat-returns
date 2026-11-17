import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile with store
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, store:stores(*)')
    .eq('id', user.id)
    .single()

  // Calculate pending count based on role
  let pendingCount = 0
  try {
    if (profile?.role === 'admin') {
      const { count } = await supabase
        .from('returns')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending_proof', 'pending_approval'])
      pendingCount = count ?? 0
    } else if (profile?.role === 'area_manager') {
      const { data: assignments } = await supabase
        .from('manager_store_assignments')
        .select('store_id')
        .eq('manager_id', user.id)
      const storeIds = assignments?.map((a) => a.store_id) ?? []
      if (storeIds.length > 0) {
        const { count } = await supabase
          .from('returns')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds)
          .in('status', ['pending_proof', 'pending_approval'])
        pendingCount = count ?? 0
      }
    } else if (profile?.store_id) {
      const { count } = await supabase
        .from('returns')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', profile.store_id)
        .in('status', ['pending_proof', 'pending_approval'])
      pendingCount = count ?? 0
    }
  } catch {
    // ignore count errors
  }

  return (
    <DashboardShell profile={profile} pendingCount={pendingCount}>
      {children}
    </DashboardShell>
  )
}
