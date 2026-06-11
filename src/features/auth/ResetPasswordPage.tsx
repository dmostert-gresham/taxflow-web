import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'

export default function ResetPasswordPage() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const token           = params.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-navy">Invalid link</h2>
          <p className="text-slate-500 text-sm">
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-navy font-medium hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await api.post<ApiResponse<void>>('/auth/reset-password', { token, newPassword: password })
      toast.success('Password reset! Please sign in with your new password.')
      navigate('/login', { replace: true })
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
          <h2 className="font-display text-2xl font-bold text-navy">Set new password</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Choose a strong password with at least 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                           hover:text-slate-600 transition-colors"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirm password</label>
            <input
              type={showPass ? 'text' : 'password'}
              className="input"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
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
              <><Loader2 size={16} className="animate-spin" /> Saving…</>
            ) : (
              'Reset password'
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
      </div>
    </div>
  )
}
