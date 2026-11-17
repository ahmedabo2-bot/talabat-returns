export type UserRole = 'store_user' | 'area_manager' | 'admin'

export type ReturnStatus =
  | 'pending_proof'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type ActionType = 'approve' | 'reject' | 'cancel' | 'submit'

export interface Store {
  id: string
  name: string
  code: string
  city?: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  role: UserRole
  store_id?: string
  store?: Store
  created_at: string
  updated_at?: string
}

export interface Supplier {
  id: string
  name: string
  email?: string
  created_at: string
}

export interface ReturnSku {
  id: string
  return_id: string
  sku_code?: string
  sku_name: string
  quantity: number
  unit_price?: number
  total_amount?: number
  created_at?: string
}

export interface ReturnProof {
  id: string
  return_id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  uploaded_by?: string
  uploader?: Profile
  uploaded_at: string
}

export interface ReturnAction {
  id: string
  return_id: string
  action_type: ActionType
  performed_by?: string
  performer?: Profile
  performed_at: string
  notes?: string
  rejection_reason?: string
  charge_amount?: number
}

export interface Return {
  id: string
  portal_return_number?: string
  return_date: string
  store_id: string
  store?: Store
  supplier_id?: string
  supplier?: Supplier
  supplier_name: string
  return_reason: string
  status: ReturnStatus
  notes?: string
  source_pdf_url?: string
  portal_status?: string
  created_by?: string
  creator?: Profile
  created_at: string
  updated_at: string
  return_skus?: ReturnSku[]
  return_proofs?: ReturnProof[]
  return_actions?: ReturnAction[]
}

export interface ManagerStoreAssignment {
  id: string
  manager_id: string
  manager?: Profile
  store_id: string
  store?: Store
  created_at: string
}

export interface DashboardStats {
  total: number
  pending_proof: number
  pending_approval: number
  approved: number
  rejected: number
  cancelled: number
  total_charges: number
}

export interface ReturnFilters {
  status?: ReturnStatus | 'all'
  store_id?: string
  supplier_name?: string
  return_reason?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface EmailLog {
  id: string
  return_id?: string
  sent_by?: string
  recipient_email: string
  subject?: string
  status: 'pending' | 'sent' | 'failed'
  error_message?: string
  sent_at: string
}

export interface AuditLog {
  id: string
  return_id?: string
  action: string
  performed_by?: string
  performer?: Profile
  performed_at: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
}
