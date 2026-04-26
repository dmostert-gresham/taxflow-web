import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface UserSummary {
    id: number
    email: string
    fullName: string
    role: string
    tin: string
    isBeta: boolean
    active: boolean
    createdAt: string
    subscriptionPlan: string | null
    subscriptionStatus: string | null
    subscriptionExpiresAt: string | null
}

interface PageResponse<T> {
    content: T[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}

const ROLES = ['INDIVIDUAL', 'BUSINESS', 'PRACTITIONER', 'ADMIN']

const roleBadgeClass = (role: string) => clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    role === 'ADMIN'        ? 'bg-coral/10 text-coral' :
        role === 'PRACTITIONER' ? 'bg-navy/10 text-navy' :
            role === 'BUSINESS'     ? 'bg-teal/10 text-teal-dark' :
                'bg-slate-100 text-slate-600'
)

const subStatusClass = (status: string | null) => clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    status === 'ACTIVE'    ? 'bg-teal/10 text-teal-dark' :
        status === 'EXPIRED'   ? 'bg-amber-100 text-amber-700' :
            status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-slate-400'
)

export default function AdminUsersPage() {
    const queryClient = useQueryClient()
    const [page, setPage]           = useState(0)
    const [editingRole, setEditingRole] = useState<number | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['admin-users', page],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResponse<UserSummary>>>(
                `/admin/users?page=${page}&size=20&sort=createdAt,desc`
            )
            return res.data.data
        },
    })

    const changeRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: number; role: string }) =>
            api.patch(`/admin/users/${id}/role`, { role }),
        onSuccess: () => {
            toast.success('Role updated')
            setEditingRole(null)
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
    })

    const toggleBetaMutation = useMutation({
        mutationFn: async ({ id, isBeta }: { id: number; isBeta: boolean }) =>
            api.patch(`/admin/users/${id}/beta`, { isBeta }),
        onSuccess: () => {
            toast.success('Beta flag updated')
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
    })

    const users       = data?.content ?? []
    const totalPages  = data?.totalPages ?? 1
    const totalUsers  = data?.totalElements ?? 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <ShieldCheck size={22} className="text-navy" />
                        User Management
                    </h1>
                    <p className="page-subtitle">
                        {totalUsers} registered user{totalUsers !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading users…
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">TIN</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Beta</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Subscription</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Joined</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    {/* User */}
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-navy">{user.fullName}</div>
                                        <div className="text-xs text-slate-400">{user.email}</div>
                                    </td>

                                    {/* TIN */}
                                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500 bg-slate-100
                                       px-2 py-0.5 rounded">
                        {user.tin}
                      </span>
                                    </td>

                                    {/* Role — inline editor */}
                                    <td className="px-4 py-3">
                                        {editingRole === user.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <select
                                                    className="input py-1 text-xs"
                                                    defaultValue={user.role}
                                                    onChange={(e) =>
                                                        changeRoleMutation.mutate({ id: user.id, role: e.target.value })
                                                    }
                                                    disabled={changeRoleMutation.isPending}
                                                    autoFocus
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="text-xs text-slate-400 hover:text-slate-600"
                                                    onClick={() => setEditingRole(null)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className={roleBadgeClass(user.role)}
                                                onClick={() => setEditingRole(user.id)}
                                                title="Click to change role"
                                            >
                                                {user.role}
                                            </button>
                                        )}
                                    </td>

                                    {/* Beta toggle */}
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() =>
                                                toggleBetaMutation.mutate({ id: user.id, isBeta: !user.isBeta })
                                            }
                                            disabled={toggleBetaMutation.isPending}
                                            className={clsx(
                                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                                user.isBeta ? 'bg-teal' : 'bg-slate-200'
                                            )}
                                            title={user.isBeta ? 'Beta — click to remove' : 'Click to grant beta'}
                                        >
                        <span className={clsx(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                            user.isBeta ? 'translate-x-4' : 'translate-x-1'
                        )} />
                                        </button>
                                    </td>

                                    {/* Subscription */}
                                    <td className="px-4 py-3">
                                        {user.subscriptionPlan ? (
                                            <div>
                          <span className={subStatusClass(user.subscriptionStatus)}>
                            {user.subscriptionPlan}
                          </span>
                                                {user.subscriptionExpiresAt && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        Exp {new Date(user.subscriptionExpiresAt).toLocaleDateString('en-NA', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                    })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">None</span>
                                        )}
                                    </td>

                                    {/* Joined */}
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {new Date(user.createdAt).toLocaleDateString('en-NA', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                        })}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}