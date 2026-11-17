-- ============================================================
-- Talabat Returns Dashboard - Demo Seed Data
-- Run this AFTER 01_schema.sql and 02_rls.sql
-- ============================================================

-- ============================================================
-- STEP 1: Insert demo stores
-- ============================================================
INSERT INTO stores (id, name, code, city) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Maadi Branch', 'TLB-EG-MAA', 'Cairo'),
  ('11111111-0000-0000-0000-000000000002', 'Zamalek Branch', 'TLB-EG-ZAM', 'Cairo'),
  ('11111111-0000-0000-0000-000000000003', 'New Cairo Branch', 'TLB-EG-NC', 'Cairo'),
  ('11111111-0000-0000-0000-000000000004', 'Alexandria Smouha', 'TLB-EG-ALX', 'Alexandria'),
  ('11111111-0000-0000-0000-000000000005', 'October 6th Branch', 'TLB-EG-OCT', 'Giza')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 2: Insert demo suppliers
-- ============================================================
INSERT INTO suppliers (id, name, email) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Fresh Foods Co.', 'returns@freshfoods.eg'),
  ('22222222-0000-0000-0000-000000000002', 'Dairy Direct Ltd.', 'supplier@dairydirect.eg'),
  ('22222222-0000-0000-0000-000000000003', 'Bakery Essentials', 'orders@bakeryessentials.eg'),
  ('22222222-0000-0000-0000-000000000004', 'Beverages United', 'returns@beverages-united.eg'),
  ('22222222-0000-0000-0000-000000000005', 'Frozen Foods Inc.', 'info@frozenfoods.eg')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Create demo users
--
-- DO THIS MANUALLY in Supabase Dashboard:
-- Go to: Authentication → Users → "Add user" (or "Invite user")
-- Create these three users with EXACT emails and passwords:
--
--   1. admin@demo.talabat.com   password: Demo@123456
--   2. manager@demo.talabat.com password: Demo@123456
--   3. store@demo.talabat.com   password: Demo@123456
--
-- After creating them, their UUIDs will be auto-generated.
-- Copy the UUIDs and use them below (replace the placeholders).
--
-- To get UUIDs: Authentication → Users → click each user
-- ============================================================

-- ============================================================
-- STEP 4: Update profile roles
-- Replace the UUID placeholders with the actual UUIDs from step 3
-- ============================================================

-- Set admin role and name (replace ADMIN-UUID-HERE)
-- UPDATE profiles
--   SET role = 'admin', full_name = 'Demo Admin'
--   WHERE email = 'admin@demo.talabat.com';

-- Set area_manager role (replace MANAGER-UUID-HERE)
-- UPDATE profiles
--   SET role = 'area_manager', full_name = 'Demo Manager'
--   WHERE email = 'manager@demo.talabat.com';

-- Set store_user role and assign to Maadi store (replace STORE-UUID-HERE)
-- UPDATE profiles
--   SET role = 'store_user',
--       full_name = 'Demo Store User',
--       store_id = '11111111-0000-0000-0000-000000000001'
--   WHERE email = 'store@demo.talabat.com';

-- ============================================================
-- STEP 5: Assign manager to stores
-- Run AFTER step 4 (need actual manager UUID)
-- Get manager UUID from: Authentication → Users → manager@demo.talabat.com
-- Replace MANAGER-UUID-HERE with actual UUID
-- ============================================================

-- INSERT INTO manager_store_assignments (manager_id, store_id) VALUES
--   ('MANAGER-UUID-HERE', '11111111-0000-0000-0000-000000000001'),
--   ('MANAGER-UUID-HERE', '11111111-0000-0000-0000-000000000002'),
--   ('MANAGER-UUID-HERE', '11111111-0000-0000-0000-000000000003')
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- QUICK SETUP SCRIPT (after you have the actual UUIDs)
-- Replace all three placeholders and run as one block:
-- ============================================================

-- DO $$
-- DECLARE
--   v_admin_id UUID;
--   v_manager_id UUID;
--   v_store_id UUID;
-- BEGIN
--   SELECT id INTO v_admin_id FROM profiles WHERE email = 'admin@demo.talabat.com';
--   SELECT id INTO v_manager_id FROM profiles WHERE email = 'manager@demo.talabat.com';
--   SELECT id INTO v_store_id FROM profiles WHERE email = 'store@demo.talabat.com';
--
--   UPDATE profiles SET role = 'admin', full_name = 'Demo Admin' WHERE id = v_admin_id;
--   UPDATE profiles SET role = 'area_manager', full_name = 'Demo Manager' WHERE id = v_manager_id;
--   UPDATE profiles SET role = 'store_user', full_name = 'Demo Store User',
--     store_id = '11111111-0000-0000-0000-000000000001' WHERE id = v_store_id;
--
--   INSERT INTO manager_store_assignments (manager_id, store_id) VALUES
--     (v_manager_id, '11111111-0000-0000-0000-000000000001'),
--     (v_manager_id, '11111111-0000-0000-0000-000000000002'),
--     (v_manager_id, '11111111-0000-0000-0000-000000000003')
--   ON CONFLICT DO NOTHING;
--
--   RAISE NOTICE 'Demo setup complete!';
--   RAISE NOTICE 'Admin: %', v_admin_id;
--   RAISE NOTICE 'Manager: %', v_manager_id;
--   RAISE NOTICE 'Store user: %', v_store_id;
-- END;
-- $$;

-- ============================================================
-- VERIFY: check everything looks right
-- ============================================================
-- SELECT id, email, role, store_id FROM profiles ORDER BY role;
-- SELECT * FROM stores;
-- SELECT * FROM manager_store_assignments;
