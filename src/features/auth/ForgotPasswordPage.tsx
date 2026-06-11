import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Loader2, ArrowLeft, Mail } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    try {
      await api.post<ApiResponse<void>>('/auth/forgot-password', { email })
      setSent(true)
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

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-teal/10 rounded-full flex items-center justify-center mx-auto">
              <Mail size={24} className="text-teal-dark" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy">Check your inbox</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              If <strong>{email}</strong> is registered, you'll receive a password reset link
              shortly. The link expires in 1 hour.
            </p>
            <p className="text-xs text-slate-400">
              Didn't get an email? Check your spam folder, or{' '}
              <button
                className="text-navy font-medium hover:underline"
                onClick={() => { setSent(false) }}
              >
                try again
              </button>
              .
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-navy font-medium hover:underline mt-4"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-navy">Forgot password?</h2>
              <p className="text-slate-500 mt-1 text-sm">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending…</>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-navy font-medium hover:underline"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
