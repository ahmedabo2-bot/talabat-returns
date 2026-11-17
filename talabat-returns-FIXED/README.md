# Talabat Returns Dashboard

A full-stack returns management dashboard for Talabat store operations.  
Built with Next.js 14, Supabase, and Vercel — all **100% free**, no credit card required.

---

## What this does

- **Store users** record returns from the Talabat Portal, upload proof documents, and submit for review
- **Area managers** see returns for their assigned stores, approve or reject with reason + charge amount, and send supplier confirmation emails
- **Admins** manage stores, users, role assignments, and import/export data

---

## Setup — Step by Step

> You'll need: a Supabase account, a GitHub account, a Vercel account, and optionally a Resend account for emails.  
> **No terminal or coding required** — everything done through web dashboards.

---

### Part 1 — Supabase (database + file storage)

**1.1 Create a Supabase project**

1. Go to [supabase.com](https://supabase.com) → click **Start your project** → sign up free
2. Click **New project**
3. Fill in:
   - **Name:** `talabat-returns`
   - **Database Password:** choose a strong password and save it somewhere
   - **Region:** choose the closest to Egypt (Frankfurt `eu-central-1` is good)
4. Click **Create new project** and wait ~2 minutes for it to set up

**1.2 Run the database schema**

1. In your project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/01_schema.sql` from this folder → copy all the contents
4. Paste into the SQL editor → click **Run** (green button)
5. You should see: `Success. No rows returned`

**1.3 Run the security policies**

1. Click **New query** again
2. Open `supabase/02_rls.sql` → copy all contents → paste → click **Run**

**1.4 Run the seed data (stores + suppliers)**

1. Click **New query** again
2. Open `supabase/03_seed.sql` → copy all contents → paste → click **Run**
3. This adds 5 demo stores and 5 suppliers

**1.5 Create demo users**

1. In Supabase, click **Authentication** in the left sidebar → click **Users**
2. Click **Add user** (or the + button) for each of these:

   | Email | Password | Full Name |
   |-------|----------|-----------|
   | `admin@demo.talabat.com` | `Demo@123456` | Demo Admin |
   | `manager@demo.talabat.com` | `Demo@123456` | Demo Manager |
   | `store@demo.talabat.com` | `Demo@123456` | Demo Store User |

3. After creating all three, go back to **SQL Editor** → **New query**
4. Paste and run this (the `$$` block at the bottom of `03_seed.sql`):

```sql
DO $$
DECLARE
  v_admin_id UUID;
  v_manager_id UUID;
  v_store_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'admin@demo.talabat.com';
  SELECT id INTO v_manager_id FROM profiles WHERE email = 'manager@demo.talabat.com';
  SELECT id INTO v_store_id FROM profiles WHERE email = 'store@demo.talabat.com';

  UPDATE profiles SET role = 'admin', full_name = 'Demo Admin' WHERE id = v_admin_id;
  UPDATE profiles SET role = 'area_manager', full_name = 'Demo Manager' WHERE id = v_manager_id;
  UPDATE profiles SET role = 'store_user', full_name = 'Demo Store User',
    store_id = '11111111-0000-0000-0000-000000000001' WHERE id = v_store_id;

  INSERT INTO manager_store_assignments (manager_id, store_id) VALUES
    (v_manager_id, '11111111-0000-0000-0000-000000000001'),
    (v_manager_id, '11111111-0000-0000-0000-000000000002'),
    (v_manager_id, '11111111-0000-0000-0000-000000000003')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo setup complete!';
END;
$$;
```

**1.6 Create the file storage bucket**

> The `02_rls.sql` file already tries to create this. If you see an error, do it manually:

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `return-proofs`
4. Make sure **Public bucket** is **OFF** (private)
5. Click **Create bucket**

**1.7 Get your API keys**

1. Click **Project Settings** (gear icon) → **API**
2. Copy these two values — you'll need them in Part 3:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

### Part 2 — Resend (optional, for supplier emails)

> Skip this if you don't need email notifications. The dashboard works without it — approvals are still recorded.

1. Go to [resend.com](https://resend.com) → sign up free (3,000 emails/month free)
2. Click **API Keys** → **Create API Key**
3. Name it `talabat-returns` → click **Create**
4. Copy the key (starts with `re_`) — you won't see it again
5. For the "From" email: Resend's free tier lets you send from `onboarding@resend.dev` without domain setup. That's fine to start with.

---

### Part 3 — Deploy to Vercel

**3.1 Put the code on GitHub**

1. Download and install [GitHub Desktop](https://desktop.github.com) (free)
2. Open GitHub Desktop → **File** → **Add Local Repository**
3. Navigate to this `talabat-returns` folder → click **Add Repository**
   - If it says "not a repository", click **create a repository** instead
4. Click **Publish repository** (top right)
   - Name: `talabat-returns-dashboard`
   - Keep **Private** checked
5. Click **Publish Repository**

**3.2 Deploy on Vercel**

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account (free)
2. Click **Add New...** → **Project**
3. Find `talabat-returns-dashboard` → click **Import**
4. Under **Environment Variables**, click **Add** for each:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL from step 1.7 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key from step 1.7 |
   | `RESEND_API_KEY` | Your Resend key from Part 2 (or skip if not using email) |
   | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (or your verified domain) |

5. Click **Deploy** and wait ~2 minutes
6. When it says **Congratulations!**, click **Continue to Dashboard**
7. Your app URL is shown (like `talabat-returns-dashboard.vercel.app`) — open it!

---

### Part 4 — First login

1. Open your Vercel app URL
2. Log in with: `admin@demo.talabat.com` / `Demo@123456`
3. You should see the Admin dashboard

**To add your real area managers:**
1. Have each manager sign up at your app URL (or create their account in Supabase Auth)
2. Go to **Admin Panel** → **Users** tab
3. Find the manager → set their role to `Area Manager`
4. Go to **Area Managers** tab → find the manager → check the stores they manage

**To import manager assignments from a CSV:**
1. Go to **Admin Panel** → **Import/Export** tab
2. Download the template → fill it in with: `manager_email,store_code`
3. Upload the CSV → click Import

---

## Adding your real stores

Go to **Admin Panel** → **Stores** tab → click **Add Store** for each store.  
Or use the CSV import in the **Import/Export** tab (format: `code,name,city`).

---

## Daily usage for store users

1. Log in with your store account
2. Click **New Return** (top right on Returns page)
3. Fill in:
   - Portal return number (from the Talabat Portal)
   - Date, supplier, reason
   - SKU details (item name, quantity, price)
   - Upload proof document(s) — required before submitting
4. Click **Submit for Review**

---

## For area managers

- You'll see returns only for your assigned stores
- Click any return to review details and proof documents
- Use **Approve** (enter supplier email to send confirmation) or **Reject** (enter reason + charge amount)
- **Store Charges** tab shows all rejected returns grouped by store with totals

---

## Troubleshooting

**"Invalid login credentials"**  
→ Check that you created the user in Supabase Auth (not just in the SQL seed)

**Returns not showing after login**  
→ Check that the user's `role` and `store_id` are set in the `profiles` table (SQL Editor → `SELECT * FROM profiles`)

**File upload fails**  
→ Check that the `return-proofs` storage bucket exists in Supabase Storage

**Email not sending**  
→ Check that `RESEND_API_KEY` is set in Vercel environment variables. The app works without it — approval is recorded, email is skipped.

**Can't deploy on Vercel**  
→ Make sure the GitHub repo is public, or that you've granted Vercel access to private repos during the GitHub OAuth step

---

## Tech stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js 14 (App Router) | Fast, modern React framework |
| Styling | Tailwind CSS | Utility-first, responsive |
| Auth | Supabase Auth | Free, no credit card |
| Database | Supabase PostgreSQL | Free 500MB, full SQL |
| File Storage | Supabase Storage | Free 1GB |
| Email | Resend | Free 3,000/month |
| Hosting | Vercel | Free, auto-deploy from GitHub |

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.talabat.com | Demo@123456 |
| Area Manager | manager@demo.talabat.com | Demo@123456 |
| Store User | store@demo.talabat.com | Demo@123456 |

> Delete or change these before going live with real data.
