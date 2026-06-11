import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse, AuthResponse } from '../../types'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'INDIVIDUAL',   label: 'Individual Taxpayer' },
  { value: 'BUSINESS',     label: 'Business / SME' },
  { value: 'PRACTITIONER', label: 'Tax Practitioner' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const login    = useAuthStore((s) => s.login)

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', role: 'INDIVIDUAL', tin: '',
  })
  const [showPass, setShowPass]         = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/^\d{8}$/.test(form.tin)) {
      setError('Taxpayer Identification Number must be exactly 8 digits.')
      return
    }
    if (!privacyConsent) {
      setError('You must agree to the Privacy Policy to create an account.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', form)
      const { token, userId, email, fullName, role, tin } = res.data.data
      login(token, { id: userId, email, fullName, role, tin })
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-teal" />
            </div>
            <span className="font-display font-bold text-navy">TaxFuse</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-navy">Create account</h2>
            <p className="text-slate-500 mt-1 text-sm">
              Start managing your taxes smarter
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                  type="text"
                  className="input"
                  placeholder="John Smith"
                  value={form.fullName}
                  onChange={set('fullName')}
                  required
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={set('password')}
                    required
                    minLength={8}
                />
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                           hover:text-slate-600"
                    onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Account type</label>
              <select
                  className="input"
                  value={form.role}
                  onChange={set('role')}
              >
                {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Taxpayer Identification Number (TIN)</label>
              <input
                  type="text"
                  className="input"
                  placeholder="8-digit TIN"
                  value={form.tin}
                  onChange={(e) => {
                    // Only allow digits, max 8
                    const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                    setForm((f) => ({ ...f, tin: val }))
                  }}
                  required
                  maxLength={8}
                  inputMode="numeric"
              />
              <p className="text-xs text-slate-400 mt-1">
                Your 8-digit TIN — found on your tax authority correspondence
              </p>
            </div>

            <div className="flex items-start gap-3">
              <input
                  id="privacy-consent"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy accent-navy cursor-pointer"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
              />
              <label htmlFor="privacy-consent" className="text-sm text-slate-600 cursor-pointer">
                I have read and agree to the{' '}
                <Link to="/privacy" target="_blank" className="text-navy font-medium hover:underline">
                  Privacy Policy
                </Link>
                . I consent to TaxFuse processing my personal information to provide tax services.
              </label>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3
                            text-sm text-red-600">
                  {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating account…</>
              ) : (
                  'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-navy font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
  )
}