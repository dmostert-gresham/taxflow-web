import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, LogIn, Loader2, Users } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, ClientSummary, AuthResponse } from '../../types'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'INDIVIDUAL', label: 'Individual Taxpayer' },
  { value: 'BUSINESS',   label: 'Business / SME' },
]

const STATUS_CLASS: Record<string, string> = {
  ACTIVE:    'badge-green',
  PENDING:   'bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs font-medium',
  EXPIRED:   'bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs font-medium',
  CANCELLED: 'bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-xs font-medium',
  FAILED:    'bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs font-medium',
}

const emptyForm = { fullName: '', email: '', password: '', role: 'INDIVIDUAL', tin: '' }

export default function PractitionerClientsPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const impersonate  = useAuthStore((s) => s.impersonate)

  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState(emptyForm)
  const [formError,    setFormError]    = useState('')
  const [removingId,   setRemovingId]   = useState<number | null>(null)
  const [managingId,   setManagingId]   = useState<number | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['practitioner-clients'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ClientSummary[]>>('/practitioner/clients')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await api.post<ApiResponse<ClientSummary>>('/practitioner/clients', data)
      return res.data.data
    },
    onSuccess: () => {
      toast.success('Client account created')
      queryClient.invalidateQueries({ queryKey: ['practitioner-clients'] })
      setShowForm(false)
      setForm(emptyForm)
      setFormError('')
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await api.delete(`/practitioner/clients/${clientId}`)
    },
    onSuccess: () => {
      toast.success('Client removed')
      queryClient.invalidateQueries({ queryKey: ['practitioner-clients'] })
      setRemovingId(null)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const handleManage = async (client: ClientSummary) => {
    setManagingId(client.id)
    try {
      const res = await api.post<ApiResponse<AuthResponse>>(
        `/practitioner/clients/${client.id}/token`
      )
      const { token, userId, email, fullName, role, tin } = res.data.data
      impersonate(token, { id: userId, email, fullName, role, tin })
      navigate('/dashboard')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setManagingId(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (!/^\d{8}$/.test(form.tin)) {
      setFormError('TIN must be exactly 8 digits.')
      return
    }
    createMutation.mutate(form)
  }

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My Clients</h1>
          <p className="page-subtitle">Manage the individuals and businesses in your care</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError('') }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add Client
        </button>
      </div>

      {/* Add client form */}
      {showForm && (
        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="font-display font-semibold text-navy">New Client Account</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" type="text" placeholder="John Smith"
                value={form.fullName} onChange={set('fullName')} required />
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="client@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters"
                value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <div>
              <label className="label">Account type</label>
              <select className="input" value={form.role} onChange={set('role')}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">TIN (8 digits)</label>
              <input
                className="input"
                type="text"
                placeholder="12345678"
                value={form.tin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setForm((f) => ({ ...f, tin: val }))
                }}
                required
                maxLength={8}
                inputMode="numeric"
              />
            </div>

            {formError && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 rounded-lg
                              px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {createMutation.isPending
                  ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                  : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setFormError('') }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400 py-12 justify-center">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading clients…</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 space-y-2">
          <Users size={32} className="mx-auto text-slate-300" />
          <p className="font-medium">No clients yet</p>
          <p className="text-sm">Click "Add Client" to create your first client account.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{client.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{client.email}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">
                    {client.role.charAt(0) + client.role.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">
                    {client.plan.charAt(0) + client.plan.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_CLASS[client.subscriptionStatus] ?? STATUS_CLASS.CANCELLED}>
                      {client.subscriptionStatus.charAt(0) + client.subscriptionStatus.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {removingId === client.id ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Remove?</span>
                          <button
                            onClick={() => removeMutation.mutate(client.id)}
                            className="text-red-500 hover:text-red-600 font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setRemovingId(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleManage(client)}
                            disabled={managingId === client.id}
                            className="flex items-center gap-1.5 text-xs font-medium
                                       text-navy hover:text-teal transition-colors disabled:opacity-50"
                          >
                            {managingId === client.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <LogIn size={13} />}
                            Manage
                          </button>
                          <button
                            onClick={() => setRemovingId(client.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
