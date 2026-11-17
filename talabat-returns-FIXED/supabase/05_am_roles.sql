-- ============================================================
-- 05_am_roles.sql
-- Sets up approval authority roles for the 7 AM accounts.
-- Run in Supabase SQL Editor AFTER creating user accounts.
-- ============================================================

-- 1. Update existing profiles if accounts already exist
UPDATE public.profiles SET role = 'admin'
WHERE email = 'ahmed.abo.2@talabat.com';

UPDATE public.profiles SET role = 'area_manager'
WHERE email IN (
  'marc.eskandar@talabat.com',
  'mina.aziz@talabat.com',
  'mina.goubran@talabat.com',
  'ahmed.zaki@talabat.com',
  'mo.elsayed@talabat.com',
  'moustafa.alkafoury@talabat.com'
);

-- 2. Update trigger to auto-assign role on first magic-link login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text := 'store_user';
BEGIN
  IF NEW.email = 'ahmed.abo.2@talabat.com' THEN
    v_role := 'admin';
  ELSIF NEW.email IN (
    'marc.eskandar@talabat.com',
    'mina.aziz@talabat.com',
    'mina.goubran@talabat.com',
    'ahmed.zaki@talabat.com',
    'mo.elsayed@talabat.com',
    'moustafa.alkafoury@talabat.com'
  ) THEN
    v_role := 'area_manager';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role, email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Confirm result
SELECT email, role FROM public.profiles
WHERE email IN (
  'ahmed.abo.2@talabat.com','marc.eskandar@talabat.com',
  'mina.aziz@talabat.com','mina.goubran@talabat.com',
  'ahmed.zaki@talabat.com','mo.elsayed@talabat.com',
  'moustafa.alkafoury@talabat.com'
)
ORDER BY role, email;
