import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getClientId } from '../utils/clientId'

type Mode = 'login' | 'set-password'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function callAuth(path: string, body: Record<string, unknown>): Promise<{ token: string }> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const err = new Error(data.message || data.error || `Request failed (${response.status})`) as Error & { code?: string; status?: number }
      err.code = data.code
      err.status = response.status
      throw err
    }
    return data
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true); setError('')
    try {
      const data = await callAuth('/auth/login', { identifier, password, clientId: getClientId() })
      login(data.token); navigate('/dashboard')
    } catch (err: any) {
      if (err.status === 403 && err.code === 'password_reset_required') {
        // Spec §5 — switch to "set new password" mode and carry the identifier.
        setMode('set-password')
        setError('This account needs a new password before you can sign in.')
        setPassword('')
        return
      }
      if (err.status === 403 && err.code === 'device_pending_approval') {
        setError('This device is awaiting Manager approval. Ask a Manager to approve it from the admin console, then sign in again.'); return
      }
      if (err.status === 403 && err.code === 'device_rejected') {
        setError('This device has been rejected by a Manager.'); return
      }
      const isAuthError = err.status === 401 || (err.message && err.message.toLowerCase().includes('password'))
      setError(isAuthError ? 'Please enter correct password' : err.message || 'Invalid email or password.')
    } finally { setIsLoading(false) }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setIsLoading(true); setError('')
    try {
      const data = await callAuth('/auth/set-password', { identifier, new_password: newPassword, clientId: getClientId() })
      login(data.token); navigate('/dashboard')
    } catch (err: any) {
      if (err.status === 403 && err.code === 'device_pending_approval') {
        setError('Password set. Your device is now awaiting Manager approval before you can sign in.'); return
      }
      if (err.status === 403 || err.status === 409) {
        setError(err.message || 'This account is no longer eligible for password reset. Ask a Manager.')
        // Drop back to login form so the user can try again with the new password.
        setMode('login')
        setNewPassword(''); setConfirmPassword('')
        return
      }
      setError(err.message || 'Failed to set password.')
    } finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      <div
        className="absolute inset-0 z-0 opacity-[0.06] grayscale pointer-events-none"
        style={{ backgroundImage: 'url("/factory-bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(1px)' }}
      />
      <div className="absolute top-0 flex w-full justify-center opacity-50">
        <div className="absolute left-[-10%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-[100px] mix-blend-multiply opacity-70" />
        <div className="absolute right-[-10%] top-[-5rem] h-[25rem] w-[25rem] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply opacity-70" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto p-10 backdrop-blur-md bg-white/70 dark:bg-card/80 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border border-slate-100">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {mode === 'login' ? 'Welcome Back' : 'Set a New Password'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login'
              ? 'Log in to manage production, inventory, and sales.'
              : 'A Manager has prepared this account. Choose a password (≥ 8 chars) to continue.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-200 text-red-600 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">{error}</p>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <FieldRow label="Email or Username" icon={<Mail className="h-5 w-5" />}>
              <input
                type="text" required disabled={isLoading}
                placeholder="you@example.com or username"
                className={INPUT_CLASS}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Password" icon={<Lock className="h-5 w-5" />} right={
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-blue-600"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }>
              <input
                type={showPassword ? 'text' : 'password'} required disabled={isLoading}
                placeholder="••••••••"
                className={INPUT_CLASS_WITH_RIGHT}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FieldRow>
            <PrimaryButton isLoading={isLoading} label="Access Dashboard" />
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-5">
            <FieldRow label="Account" icon={<Mail className="h-5 w-5" />}>
              <input
                type="text" required disabled
                className={INPUT_CLASS}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="New password" icon={<KeyRound className="h-5 w-5" />} right={
              <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-blue-600"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }>
              <input
                type={showPassword ? 'text' : 'password'} required minLength={8} disabled={isLoading}
                placeholder="At least 8 characters"
                className={INPUT_CLASS_WITH_RIGHT}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Confirm new password" icon={<KeyRound className="h-5 w-5" />}>
              <input
                type={showPassword ? 'text' : 'password'} required minLength={8} disabled={isLoading}
                placeholder="Re-enter password"
                className={INPUT_CLASS}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FieldRow>
            <PrimaryButton isLoading={isLoading} label="Set password & sign in" />
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setNewPassword(''); setConfirmPassword('') }}
              className="block text-center w-full text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <Lock className="h-3 w-3" />
          <span>Secure login. Device approval per spec §2.2.</span>
        </div>
      </div>
    </div>
  )
}

// ---------- inline helpers (no shared dep) ----------

const INPUT_CLASS = 'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-50'
const INPUT_CLASS_WITH_RIGHT = INPUT_CLASS.replace('pr-4', 'pr-10')

function FieldRow({ label, icon, right, children }: { label: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-600">
          {icon}
        </div>
        {children}
        {right}
      </div>
    </div>
  )
}

function PrimaryButton({ isLoading, label }: { isLoading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="group relative mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-3.5 px-4 font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/40 disabled:pointer-events-none disabled:opacity-70"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Working…</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </button>
  )
}
