'use client'

import { type ReturnStatus } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<ReturnStatus, { label: string; classes: string; dot: string }> = {
  pending_proof: {
    label: 'Missing Proof',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  pending_approval: {
    label: 'Pending Review',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-gray-50 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
  },
}

interface StatusBadgeProps {
  status: ReturnStatus
  size?: 'sm' | 'md' | 'lg'
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_proof
  return (
    <span
      className={cn(
        'status-badge',
        config.classes,
        size === 'md' && 'text-sm px-3 py-1',
        size === 'lg' && 'text-sm px-4 py-1.5 font-semibold'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  )
}
