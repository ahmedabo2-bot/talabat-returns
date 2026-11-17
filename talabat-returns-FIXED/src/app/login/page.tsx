'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, LogIn, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

// The one real email that uses a magic link to their actual inbox.
// Everyone else auto-signs in with a shared internal password.
const ADMIN_EMAIL = 'ahmed.abo.2@talabat.com'
// Internal shared password for all virtual @talabat.com accounts
const VIRTUAL_PASS = 'Talabat@Internal2024!'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)   // only for magic-link flow
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()

    // ââ Admin: magic link (real email) âââââââââââââââââââââââââââââââââââ
    if (normalizedEmail === ADMIN_EMAIL) {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) { setError(authError.message); setLoading(false); return }
      setSent(true)
      setLoading(false)
      return
    }

    // ââ Virtual / internal accounts: instant sign-in (no email needed) âââ
    // 1. Try signing in first (user may already exist)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: VIRTUAL_PASS,
    })

    if (!signInErr) {
      // Success â navigate to dashboard
      router.push('/dashboard')
      return
    }

    // 2. User doesn't exist yet â sign them up (auto-confirmed when Supabase
    //    "Confirm email" is disabled in Auth Settings)
    const isNewUser =
      signInErr.message.toLowerCase().includes('invalid') ||
      signInErr.message.toLowerCase().includes('credentials') ||
      signInErr.message.toLowerCase().includes('no user')

    if (isNewUser) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: VIRTUAL_PASS,
      })
      if (signUpErr && !signUpErr.message.toLowerCase().includes('already')) {
        setError(signUpErr.message)
        setLoading(false)
        return
      }

      // Sign in right after sign-up (works when "Confirm email" is OFF)
      const { error: signInErr2 } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: VIRTUAL_PASS,
      })
      if (signInErr2) {
        setError('Account created â please try signing in again, or ask the admin to confirm your account.')
        setLoading(false)
        return
      }
      router.push('/dashboard')
      return
    }

    // 3. Some other auth error
    setError(signInErr.message)
    setLoading(false)
  }

  const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-brand-500">Talabat</span> Returns Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">Supply Chain Returns Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
          <div className="p-8">
            {sent ? (
              /* Magic-link confirmation screen (admin only) */
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We sent a magic link to <strong className="text-gray-800">{email}</strong>.<br />
                  Click it to sign in â no password needed.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Didn&apos;t receive it? Check your spam folder or{' '}
                  <button onClick={() => setSent(false)} className="text-brand-500 hover:underline">
                    try again
                  </button>.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Enter your Talabat email to access the portal.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="email">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field pl-9"
                        placeholder="name@talabat.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary justify-center py-3 text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4" />
                        {isAdmin ? 'Sending linkâ¦' : 'Signing inâ¦'}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        {isAdmin ? 'Send Magic Link' : 'Sign In'}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
