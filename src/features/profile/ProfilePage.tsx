import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Hash, Calendar, Trash2, AlertTriangle, ShieldCheck, FileText, Globe, Briefcase, KeyRound, Eye, EyeOff, Lock } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, TaxpayerCategory } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface UserProfile {
  id: number
  email: string
  fullName: string
  tin: string
  role: string
  country: string
  taxpayerCategory: TaxpayerCategory
  createdAt: string
}

const CATEGORY_OPTIONS: { value: TaxpayerCategory; label: string; description: string }[] = [
  {
    value: 'PAYE_ONLY',
    label: 'PAYE Only',
    description: 'Employment income only — upload PAYE5, no bank statement import',
  },
  {
    value: 'PAYE_ADDITIONAL',
    label: 'PAYE + Additional income',
    description: 'Employment income plus freelance, rental, or other income',
  },
  {
    value: 'PROVISIONAL',
    label: 'Provisional taxpayer',
    description: 'Self-employed or no PAYE — income derived from transactions',
  },
]

export default function ProfilePage() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmText, setConfirmText]           = useState('')
  const [deleting, setDeleting]                 = useState(false)

  // ITAS credentials state
  const [itasTin, setItasTin]           = useState('')
  const [itasPassword, setItasPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserProfile>>('/users/me')
      return res.data.data
    },
  })

  const categoryMutation = useMutation({
    mutationFn: (taxpayerCategory: TaxpayerCategory) =>
      api.put('/users/me/taxpayer-category', { taxpayerCategory }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Taxpayer type updated')
    },
    onError: () => toast.error('Could not update taxpayer type'),
  })

  const { data: itasStatus } = useQuery({
    queryKey: ['itas-credentials-status'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ stored: boolean; tin?: string; storedAt?: string }>>(
        '/itas/credentials/status'
      )
      return res.data.data
    },
  })

  const saveItasMutation = useMutation({
    mutationFn: () => api.post('/itas/credentials', { tin: itasTin, password: itasPassword }),
    onSuccess: () => {
      toast.success('ITAS credentials saved securely')
      setItasTin('')
      setItasPassword('')
      queryClient.invalidateQueries({ queryKey: ['itas-credentials-status'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const deleteItasMutation = useMutation({
    mutationFn: () => api.delete('/itas/credentials'),
    onSuccess: () => {
      toast.success('ITAS credentials cleared')
      queryClient.invalidateQueries({ queryKey: ['itas-credentials-status'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await api.delete('/users/me')
      logout()
      navigate('/login', { replace: true })
      toast.success('Your account has been deleted.')
    } catch {
      toast.error('Could not delete account. Please try again.')
      setDeleting(false)
    }
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-NA', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Your account details</p>
      </div>

      {isLoading ? (
        <div className="card p-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : profile ? (
        <>
          {/* Avatar + name */}
          <div className="card p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center
                            text-white text-2xl font-bold shrink-0 select-none">
              {profile.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) ?? '?'}
            </div>
            <div>
              <div className="font-display font-bold text-navy text-xl">{profile.fullName}</div>
              <div className="text-slate-400 text-sm mt-0.5">{profile.email}</div>
              {profile.role === 'ADMIN' && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium
                                text-teal-dark bg-teal/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Administrator
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="card divide-y divide-slate-100">
            <DetailRow icon={<User size={15} className="text-slate-400" />} label="Full name">
              {profile.fullName || '—'}
            </DetailRow>
            <DetailRow icon={<Mail size={15} className="text-slate-400" />} label="Email address">
              {profile.email}
            </DetailRow>
            <DetailRow icon={<Hash size={15} className="text-slate-400" />} label="Tax Identification Number (TIN)">
              {profile.tin || <span className="text-slate-400 italic">Not set</span>}
            </DetailRow>
            <DetailRow icon={<Globe size={15} className="text-slate-400" />} label="Tax jurisdiction">
              {profile.country === 'SOUTH_AFRICA' ? 'South Africa' : 'Namibia'}
            </DetailRow>
            <DetailRow icon={<Calendar size={15} className="text-slate-400" />} label="Member since">
              {memberSince}
            </DetailRow>
          </div>

          {/* Taxpayer Type */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Taxpayer type</span>
            </div>
            <div className="space-y-2">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value !== profile.taxpayerCategory) {
                      categoryMutation.mutate(opt.value)
                    }
                  }}
                  disabled={categoryMutation.isPending}
                  className={clsx(
                    'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                    profile.taxpayerCategory === opt.value
                      ? 'border-navy bg-navy/5'
                      : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <div className={clsx(
                    'text-sm font-medium',
                    profile.taxpayerCategory === opt.value ? 'text-navy' : 'text-slate-700',
                  )}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ITAS Credentials */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">ITAS e-Portal credentials</span>
            </div>

            {itasStatus?.stored ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-teal/5 border border-teal/20 rounded-xl px-4 py-3">
                  <Lock size={14} className="text-teal-dark shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-navy">
                      TIN: {itasStatus.tin}
                    </div>
                    {itasStatus.storedAt && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Saved {new Date(itasStatus.storedAt).toLocaleDateString('en-NA', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-teal-dark bg-teal/10 px-2 py-0.5 rounded-full">
                    Encrypted
                  </div>
                </div>
                <button
                  onClick={() => deleteItasMutation.mutate()}
                  disabled={deleteItasMutation.isPending}
                  className="btn-outline text-sm text-red-500 border-red-200 hover:bg-red-50
                             hover:text-red-600 hover:border-red-300 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  {deleteItasMutation.isPending ? 'Clearing…' : 'Clear credentials'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={itasTin}
                  onChange={(e) => setItasTin(e.target.value)}
                  placeholder="Tax Identification Number (TIN)"
                  className="input w-full"
                  inputMode="numeric"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={itasPassword}
                    onChange={(e) => setItasPassword(e.target.value)}
                    placeholder="ITAS e-Portal password"
                    className="input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  onClick={() => saveItasMutation.mutate()}
                  disabled={saveItasMutation.isPending || !itasTin.trim() || !itasPassword.trim()}
                  className={clsx(
                    'btn-primary text-sm w-full',
                    (saveItasMutation.isPending || !itasTin.trim() || !itasPassword.trim()) &&
                      'opacity-50 cursor-not-allowed',
                  )}
                >
                  {saveItasMutation.isPending ? 'Saving…' : 'Save credentials'}
                </button>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your password is encrypted with AES-256-GCM before being stored. It is only
                  decrypted in memory during ITAS portal sessions and is never logged or transmitted
                  to third parties. You can remove it at any time.
                </p>
              </div>
            )}
          </div>

          {/* Privacy & Legal */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Privacy &amp; Legal</span>
            </div>
            <Link
              to="/privacy"
              target="_blank"
              className="text-sm text-navy hover:underline"
            >
              View Privacy Policy
            </Link>
            <p className="text-xs text-slate-400 mt-1">
              Learn what data we collect, how it is used, and how to exercise your rights under PIPA.
            </p>
          </div>

          {/* Danger zone */}
          <div className="card border border-red-100 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800 text-sm">Delete account</div>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Permanently removes your account and all associated data — transactions,
                  returns, documents, and AI chat history. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="btn-outline text-sm text-red-500 border-red-200 hover:bg-red-50
                         hover:text-red-600 hover:border-red-300 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete my account
            </button>
          </div>
        </>
      ) : null}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-panel w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Delete account</div>
                <div className="text-slate-500 text-xs mt-0.5">This action is irreversible</div>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              All your data will be permanently erased: transactions, tax returns, uploaded
              documents, PAYE5 certificates, and AI chat history.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Type <span className="font-mono font-bold text-slate-800">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="input w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowDeleteDialog(false); setConfirmText('') }}
                disabled={deleting}
                className="btn-outline flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || deleting}
                className={clsx(
                  'flex-1 text-sm font-medium py-2 px-4 rounded-lg transition-colors',
                  confirmText === 'DELETE' && !deleting
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="text-xs text-slate-400 w-48 shrink-0">{label}</div>
      <div className="text-sm font-medium text-navy">{children}</div>
    </div>
  )
}
