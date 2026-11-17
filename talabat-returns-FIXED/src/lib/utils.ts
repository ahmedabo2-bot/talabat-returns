import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import type { ReturnStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd MMM yyyy')
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd MMM yyyy HH:mm')
  } catch {
    return String(date)
  }
}

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getStatusLabel(status: ReturnStatus): string {
  const labels: Record<ReturnStatus, string> = {
    pending_proof: 'Missing Proof',
    pending_approval: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }
  return labels[status] ?? status
}

export function getStatusColor(status: ReturnStatus): string {
  const colors: Record<ReturnStatus, string> = {
    pending_proof: 'bg-amber-50 text-amber-700 border-amber-200',
    pending_approval: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
  }
  return colors[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
}

export function getStatusDotColor(status: ReturnStatus): string {
  const dots: Record<ReturnStatus, string> = {
    pending_proof: 'bg-amber-500',
    pending_approval: 'bg-blue-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-400',
  }
  return dots[status] ?? 'bg-gray-400'
}

export function generateReturnNumber(): string {
  return `RTN-${Date.now().toString(36).toUpperCase()}`
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) return email[0].toUpperCase()
  return '?'
}

export const RETURN_REASONS = [
  'Damaged Goods',
  'Wrong Item',
  'Expired Product',
  'Quality Issue',
  'Overstock',
  'Pricing Discrepancy',
  'Other',
] as const

export type ReturnReason = typeof RETURN_REASONS[number]
