'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Bell } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import type { Profile } from '@/types'
import { getInitials } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/returns': 'Returns',
  '/dashboard/returns/new': 'New Return',
  '/dashboard/charges': 'Store Charges',
  '/dashboard/admin': 'Admin Panel',
}

interface DashboardShellProps {
  children: React.ReactNode
  profile: Profile | null
  pendingCount: number
}

export default function DashboardShell({ children, profile, pendingCount }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const title = PAGE_TITLES[pathname] ?? 'Returns'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        profile={profile}
        pendingCount={pendingCount}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main content - offset by sidebar on desktop */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {profile?.store && (
              <p className="text-xs text-gray-400">{profile.store.name}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-brand-100 border-2 border-brand-200 flex items-center justify-center">
              <span className="text-brand-700 text-xs font-bold">
                {getInitials(profile?.full_name, profile?.email)}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
