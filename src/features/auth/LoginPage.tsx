import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse, AuthResponse } from '../../types'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email, password,
      })
      const { token, userId, email: userEmail, fullName, role, tin, country, taxpayerCategory } = res.data.data
      login(token, { id: userId, email: userEmail, fullName, role, tin, country: country ?? 'NAMIBIA', taxpayerCategory: taxpayerCategory ?? 'PROVISIONAL' })
      toast.success(`Welcome back, ${fullName.split(' ')[0]}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="min-h-screen bg-navy flex">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12
                      bg-gradient-to-br from-navy to-navy-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-lg">TaxFuse</div>
              <div className="text-teal/70 text-xs tracking-widest font-medium">
                TAX MANAGEMENT
              </div>
            </div>
          </div>

          <div>
            <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Smart tax management<br />
              for <span className="text-teal">everyone</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed max-w-sm">
              Upload your bank statements, let AI classify your transactions, and
              generate your tax return in minutes — not hours.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { label: 'Time saved', value: '3+ hours' },
                { label: 'Accuracy', value: '99%' },
                { label: 'NamRA & SARS compliant', value: '✓' },
                { label: 'Data security', value: 'Bank-grade' },
              ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-teal font-display font-bold text-xl">{value}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                  </div>
              ))}
            </div>
          </div>

          <div className="text-slate-500 text-xs">
            © {new Date().getFullYear()} TaxFuse
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-teal" />
              </div>
              <span className="font-display font-bold text-navy">TaxFuse</span>
            </div>

            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-navy">Welcome back</h2>
              <p className="text-slate-500 mt-1 text-sm">
                Sign in to your TaxFuse account
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

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                      type={showPass ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
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

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-navy transition-colors">
                  Forgot password?
                </Link>
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
                    <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                ) : (
                    'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-navy font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
  )
}