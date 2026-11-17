'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import type { DashboardStats, Return, Profile } from '@/types'
import StatusBadge from '@/components/returns/StatusBadge'
import { formatDate, formatCurrency } from '@/lib/utils'

interface DashboardOverviewProps {
  stats: DashboardStats
  recentReturns: Return[]
  profile: Profile | null
}

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  href?: string
  subtitle?: string
}

function StatCard({ label, value, icon: Icon, color, bg, href, subtitle }: StatCardProps) {
  const inner = (
    <div className={`card p-5 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {href && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${color}`}>
          View all <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export default function DashboardOverview({ stats, recentReturns, profile }: DashboardOverviewProps) {
  const router = useRouter()

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/returns/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Return
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Returns"
          value={stats.total}
          icon={FileText}
          color="text-gray-700"
          bg="bg-gray-100"
          href="/dashboard/returns"
        />
        <StatCard
          label="Missing Proof"
          value={stats.pending_proof}
          icon={AlertTriangle}
          color="text-amber-600"
          bg="bg-amber-50"
          href="/dashboard/returns?status=pending_proof"
          subtitle={stats.pending_proof > 0 ? 'Action needed' : 'All good!'}
        />
        <StatCard
          label="Pending Review"
          value={stats.pending_approval}
          icon={Clock}
          color="text-blue-600"
          bg="bg-blue-50"
          href="/dashboard/returns?status=pending_approval"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle}
          color="text-green-600"
          bg="bg-green-50"
          href="/dashboard/returns?status=approved"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="text-red-600"
          bg="bg-red-50"
          href="/dashboard/returns?status=rejected"
        />
        <StatCard
          label="Total Charges"
          value={formatCurrency(stats.total_charges)}
          icon={DollarSign}
          color="text-purple-600"
          bg="bg-purple-50"
          href="/dashboard/charges"
          subtitle="From rejected returns"
        />
      </div>

      {/* Quick progress bar */}
      {stats.total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Returns Overview</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              {stats.total} total
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {stats.pending_proof > 0 && (
              <div
                title={`Missing Proof: ${stats.pending_proof}`}
                className="bg-amber-400 transition-all"
                style={{ width: `${(stats.pending_proof / stats.total) * 100}%` }}
              />
            )}
            {stats.pending_approval > 0 && (
              <div
                title={`Pending Review: ${stats.pending_approval}`}
                className="bg-blue-400 transition-all"
                style={{ width: `${(stats.pending_approval / stats.total) * 100}%` }}
              />
            )}
            {stats.approved > 0 && (
              <div
                title={`Approved: ${stats.approved}`}
                className="bg-green-400 transition-all"
                style={{ width: `${(stats.approved / stats.total) * 100}%` }}
              />
            )}
            {stats.rejected > 0 && (
              <div
                title={`Rejected: ${stats.rejected}`}
                className="bg-red-400 transition-all"
                style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
              />
            )}
            {stats.cancelled > 0 && (
              <div
                title={`Cancelled: ${stats.cancelled}`}
                className="bg-gray-300 transition-all"
                style={{ width: `${(stats.cancelled / stats.total) * 100}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Missing Proof</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Pending Review</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Approved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Rejected</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />Cancelled</span>
          </div>
        </div>
      )}

      {/* Recent returns */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Returns</h3>
          <Link href="/dashboard/returns" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentReturns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No returns yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first return to get started.</p>
            <Link href="/dashboard/returns/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" />
              New Return
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Return #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Store</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map((r) => (
                  <tr
                    key={r.id}
                    className="table-row-hover border-b border-gray-50 last:border-0"
                    onClick={() => router.push(`/dashboard/returns/${r.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.return_date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">
                      {r.portal_return_number ?? r.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {(r.store as { name?: string } | undefined)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{r.supplier_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-brand-500 hover:text-brand-600 font-medium text-xs">View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
