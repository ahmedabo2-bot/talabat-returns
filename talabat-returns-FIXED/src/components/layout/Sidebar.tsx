'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  Settings,
  LogOut,
  X,
  Package,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  roles?: string[]
}

interface SidebarProps {
  profile: Profile | null
  pendingCount: number
  mobileOpen: boolean
  onClose: () => void
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  area_manager: 'Area Manager',
  store_user: 'Store User',
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  area_manager: 'bg-blue-100 text-blue-700',
  store_user: 'bg-green-100 text-green-700',
}

export default function Sidebar({ profile, pendingCount, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Returns',
      href: '/dashboard/returns',
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: 'Store Charges',
      href: '/dashboard/charges',
      icon: AlertCircle,
      roles: ['area_manager', 'admin'],
    },
    {
      label: 'Admin Panel',
      href: '/dashboard/admin',
      icon: Settings,
      roles: ['admin'],
    },
  ]

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile?.role ?? '')
  )

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Talabat</p>
            <p className="text-gray-400 text-xs mt-0.5">Returns Portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 sidebar-scroll overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active
                  ? 'bg-brand-500/20 text-brand-400 border-l-2 border-brand-500 pl-[10px]'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  active ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="bg-brand-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-xs font-bold">
                {getInitials(profile.full_name, profile.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile.full_name ?? profile.email}
              </p>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-medium',
                  ROLE_COLOR[profile.role] ?? 'bg-gray-700 text-gray-300'
                )}
              >
                {ROLE_LABEL[profile.role] ?? profile.role}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative w-64 h-full bg-sidebar flex flex-col slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
