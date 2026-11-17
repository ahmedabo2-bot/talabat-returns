-- ============================================================
-- Talabat Returns Dashboard - Row Level Security Policies
-- Run this AFTER 01_schema.sql in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's store_id
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user (manager) is assigned to a store
CREATE OR REPLACE FUNCTION is_manager_of_store(p_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM manager_store_assignments
    WHERE manager_id = auth.uid() AND store_id = p_store_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_store_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORES policies
-- ============================================================
DROP POLICY IF EXISTS "stores_read" ON stores;
CREATE POLICY "stores_read" ON stores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stores_write_admin" ON stores;
CREATE POLICY "stores_write_admin" ON stores
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- PROFILES policies
-- ============================================================
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR get_user_role() IN ('admin', 'area_manager')
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- MANAGER_STORE_ASSIGNMENTS policies
-- ============================================================
DROP POLICY IF EXISTS "assignments_read" ON manager_store_assignments;
CREATE POLICY "assignments_read" ON manager_store_assignments
  FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR get_user_role() IN ('admin')
  );

DROP POLICY IF EXISTS "assignments_admin_write" ON manager_store_assignments;
CREATE POLICY "assignments_admin_write" ON manager_store_assignments
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- SUPPLIERS policies
-- ============================================================
DROP POLICY IF EXISTS "suppliers_read_all" ON suppliers;
CREATE POLICY "suppliers_read_all" ON suppliers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_write_admin" ON suppliers;
CREATE POLICY "suppliers_write_admin" ON suppliers
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ============================================================
-- RETURNS policies
-- ============================================================
DROP POLICY IF EXISTS "returns_select" ON returns;
CREATE POLICY "returns_select" ON returns
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'area_manager' AND is_manager_of_store(store_id))
    OR (get_user_role() = 'store_user' AND store_id = get_user_store_id())
  );

DROP POLICY IF EXISTS "returns_insert" ON returns;
CREATE POLICY "returns_insert" ON returns
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'admin'
    OR (get_user_role() = 'store_user' AND store_id = get_user_store_id())
    OR get_user_role() = 'area_manager'
  );

DROP POLICY IF EXISTS "returns_update" ON returns;
CREATE POLICY "returns_update" ON returns
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'area_manager' AND is_manager_of_store(store_id))
    OR (get_user_role() = 'store_user' AND store_id = get_user_store_id()
        AND status IN ('pending_proof', 'pending_approval'))
  )
  WITH CHECK (
    get_user_role() = 'admin'
    OR (get_user_role() = 'area_manager' AND is_manager_of_store(store_id))
    OR (get_user_role() = 'store_user' AND store_id = get_user_store_id())
  );

DROP POLICY IF EXISTS "returns_delete_admin" ON returns;
CREATE POLICY "returns_delete_admin" ON returns
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================================
-- RETURN_SKUS policies
-- ============================================================
DROP POLICY IF EXISTS "skus_select" ON return_skus;
CREATE POLICY "skus_select" ON return_skus
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'area_manager' AND is_manager_of_store(r.store_id))
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

DROP POLICY IF EXISTS "skus_insert" ON return_skus;
CREATE POLICY "skus_insert" ON return_skus
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'area_manager' AND is_manager_of_store(r.store_id))
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

DROP POLICY IF EXISTS "skus_delete" ON return_skus;
CREATE POLICY "skus_delete" ON return_skus
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

-- ============================================================
-- RETURN_PROOFS policies
-- ============================================================
DROP POLICY IF EXISTS "proofs_select" ON return_proofs;
CREATE POLICY "proofs_select" ON return_proofs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'area_manager' AND is_manager_of_store(r.store_id))
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

DROP POLICY IF EXISTS "proofs_insert" ON return_proofs;
CREATE POLICY "proofs_insert" ON return_proofs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'area_manager' AND is_manager_of_store(r.store_id))
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

DROP POLICY IF EXISTS "proofs_delete" ON return_proofs;
CREATE POLICY "proofs_delete" ON return_proofs
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR get_user_role() = 'admin'
  );

-- ============================================================
-- RETURN_ACTIONS policies
-- ============================================================
DROP POLICY IF EXISTS "actions_select" ON return_actions;
CREATE POLICY "actions_select" ON return_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND (
        get_user_role() = 'admin'
        OR (get_user_role() = 'area_manager' AND is_manager_of_store(r.store_id))
        OR (get_user_role() = 'store_user' AND r.store_id = get_user_store_id())
      )
    )
  );

DROP POLICY IF EXISTS "actions_insert" ON return_actions;
CREATE POLICY "actions_insert" ON return_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Store users can submit
    (action_type = 'submit' AND get_user_role() = 'store_user')
    -- Store users can cancel their own returns
    OR (action_type = 'cancel' AND get_user_role() = 'store_user')
    -- Managers/admins can approve, reject, cancel
    OR (action_type IN ('approve', 'reject', 'cancel')
        AND get_user_role() IN ('area_manager', 'admin'))
  );

-- ============================================================
-- EMAIL_LOG policies
-- ============================================================
DROP POLICY IF EXISTS "email_log_select" ON email_log;
CREATE POLICY "email_log_select" ON email_log
  FOR SELECT TO authenticated
  USING (
    sent_by = auth.uid()
    OR get_user_role() IN ('admin', 'area_manager')
  );

DROP POLICY IF EXISTS "email_log_insert" ON email_log;
CREATE POLICY "email_log_insert" ON email_log
  FOR INSERT TO authenticated
  WITH CHECK (sent_by = auth.uid() OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "email_log_update" ON email_log;
CREATE POLICY "email_log_update" ON email_log
  FOR UPDATE TO authenticated
  USING (sent_by = auth.uid() OR get_user_role() = 'admin');

-- ============================================================
-- AUDIT_LOG policies
-- ============================================================
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    OR performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_id
      AND get_user_role() = 'area_manager'
      AND is_manager_of_store(r.store_id)
    )
  );

DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- STORAGE: return-proofs bucket policies
-- Run these in Supabase Dashboard -> Storage -> Policies
-- or paste in SQL editor (adjust bucket name if needed)
-- ============================================================

-- Allow authenticated users to upload
INSERT INTO storage.buckets (id, name, public)
VALUES ('return-proofs', 'return-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'return-proofs');

DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'return-proofs');

DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'return-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR get_user_role() = 'admin')
  );
