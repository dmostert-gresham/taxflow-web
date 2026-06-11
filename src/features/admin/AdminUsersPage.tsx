import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ShieldCheck, ChevronLeft, ChevronRight,
    ChevronDown, ChevronUp, Search, Loader2, Trash2,
} from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/authStore'

interface UserSummary {
    id: number
    email: string
    fullName: string
    role: string
    tin: string
    active: boolean
    createdAt: string
    subscriptionPlan: string | null
    subscriptionStatus: string | null
    subscriptionExpiresAt: string | null
}

interface SubscriptionDetail {
    id: number
    userId: number
    userEmail: string
    plan: string
    status: string
    amountNad: number | null
    startsAt: string | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
    currentlyActive: boolean
}

interface PageResponse<T> {
    content: T[]
    totalElements: number
    totalPages: number
    number: number
    size: number
}

const ROLES = ['INDIVIDUAL', 'BUSINESS', 'PRACTITIONER', 'ADMIN']
const PLANS = ['BASIC', 'PROFESSIONAL', 'BUSINESS', 'PRACTITIONER']

const roleBadgeClass = (role: string) => clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    role === 'ADMIN'        ? 'bg-coral/10 text-coral' :
    role === 'PRACTITIONER' ? 'bg-navy/10 text-navy' :
    role === 'BUSINESS'     ? 'bg-teal/10 text-teal-dark' :
                              'bg-slate-100 text-slate-600'
)

const statusClass = (status: string | null) => clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    status === 'ACTIVE'    ? 'bg-teal/10 text-teal-dark' :
    status === 'EXPIRED'   ? 'bg-amber-100 text-amber-700' :
    status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
    status === 'PENDING'   ? 'bg-blue-100 text-blue-600' :
                             'bg-slate-100 text-slate-400'
)

export default function AdminUsersPage() {
    const queryClient = useQueryClient()
    const currentUser = useAuthStore((s) => s.user)
    const [page, setPage]                   = useState(0)
    const [search, setSearch]               = useState('')
    const [editingRole, setEditingRole]     = useState<number | null>(null)
    const [expanded, setExpanded]           = useState<number | null>(null)
    const [newPlan, setNewPlan]             = useState('')
    const [newExpiry, setNewExpiry]         = useState('')
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['admin-users', page],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResponse<UserSummary>>>(
                `/admin/users?page=${page}&size=20&sort=createdAt,desc`
            )
            return res.data.data
        },
    })

    const { data: subDetail, isLoading: subLoading } = useQuery({
        queryKey: ['admin-sub-detail', expanded],
        queryFn: async () => {
            const res = await api.get<ApiResponse<SubscriptionDetail>>(
                `/admin/users/${expanded}/subscription`
            )
            return res.data.data
        },
        enabled: expanded !== null,
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

    const updateSubMutation = useMutation({
        mutationFn: async ({ userId, action, plan, expiresAt }: {
            userId: number; action: string; plan?: string; expiresAt?: string
        }) => api.patch(`/admin/users/${userId}/subscription`, { action, plan, expiresAt }),
        onSuccess: () => {
            toast.success('Subscription updated')
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
            queryClient.invalidateQueries({ queryKey: ['admin-sub-detail', expanded] })
            setNewPlan('')
            setNewExpiry('')
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
    })

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: number) => api.delete(`/admin/users/${userId}`),
        onSuccess: () => {
            toast.success('User deleted')
            setConfirmDelete(null)
            if (expanded === confirmDelete) setExpanded(null)
            queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        },
        onError: (err) => {
            toast.error(extractErrorMessage(err))
            setConfirmDelete(null)
        },
    })

    const allUsers   = data?.content ?? []
    const users      = search
        ? allUsers.filter(u =>
            u.fullName.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
        : allUsers
    const totalPages = data?.totalPages ?? 1
    const totalUsers = data?.totalElements ?? 0

    const toggleExpand = (id: number) => {
        setExpanded(prev => prev === id ? null : id)
        setNewPlan('')
        setNewExpiry('')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <ShieldCheck size={22} className="text-navy" />
                    User Management
                </h1>
                <p className="page-subtitle">
                    {totalUsers} registered user{totalUsers !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    className="input pl-9"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading users…
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No users found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">TIN</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Subscription</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Joined</th>
                                    <th className="px-4 py-3" />
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <Fragment key={user.id}>
                                        {/* User row */}
                                        <tr
                                            className={clsx(
                                                'border-t border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer',
                                                expanded === user.id && 'bg-slate-50/50'
                                            )}
                                            onClick={() => toggleExpand(user.id)}
                                        >
                                            {/* User */}
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-navy">{user.fullName}</div>
                                                <div className="text-xs text-slate-400">{user.email}</div>
                                            </td>

                                            {/* TIN */}
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    {user.tin}
                                                </span>
                                            </td>

                                            {/* Role — inline editor; stops row-click propagation */}
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                                                        >✕</button>
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

                                            {/* Subscription summary */}
                                            <td className="px-4 py-3">
                                                {user.subscriptionPlan ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium text-navy">{user.subscriptionPlan}</span>
                                                            <span className={statusClass(user.subscriptionStatus)}>
                                                                {user.subscriptionStatus}
                                                            </span>
                                                        </div>
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

                                            {/* Expand chevron */}
                                            <td className="px-4 py-3 text-slate-400">
                                                {expanded === user.id
                                                    ? <ChevronUp size={15} />
                                                    : <ChevronDown size={15} />
                                                }
                                            </td>

                                            {/* Delete */}
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                {user.role !== 'ADMIN' && user.id !== currentUser?.id && (
                                                    confirmDelete === user.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                                                disabled={deleteUserMutation.isPending}
                                                                onClick={() => deleteUserMutation.mutate(user.id)}
                                                            >
                                                                {deleteUserMutation.isPending ? '…' : 'Delete'}
                                                            </button>
                                                            <button
                                                                className="text-xs text-slate-400 hover:text-slate-600"
                                                                onClick={() => setConfirmDelete(null)}
                                                            >Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Delete user"
                                                            onClick={() => setConfirmDelete(user.id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>

                                        {/* Subscription detail panel */}
                                        {expanded === user.id && (
                                            <tr>
                                                <td colSpan={7} className="bg-slate-50 border-t border-slate-100 px-4 py-4">
                                                    {subLoading ? (
                                                        <div className="flex items-center text-slate-400 text-sm gap-2">
                                                            <Loader2 size={14} className="animate-spin" /> Loading subscription…
                                                        </div>
                                                    ) : subDetail ? (
                                                        <div className="space-y-4">
                                                            {/* Detail grid */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                                {[
                                                                    { label: 'Plan',    value: subDetail.plan,   badge: false },
                                                                    { label: 'Status',  value: subDetail.status, badge: true  },
                                                                    { label: 'Started', value: subDetail.startsAt
                                                                            ? new Date(subDetail.startsAt).toLocaleDateString('en-NA')
                                                                            : '—',                               badge: false },
                                                                    { label: 'Expires', value: subDetail.expiresAt
                                                                            ? new Date(subDetail.expiresAt).toLocaleDateString('en-NA')
                                                                            : '—',                               badge: false },
                                                                ].map(({ label, value, badge }) => (
                                                                    <div key={label} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                                        <div className="text-slate-400 mb-0.5">{label}</div>
                                                                        {badge
                                                                            ? <span className={statusClass(value)}>{value}</span>
                                                                            : <div className="font-medium text-navy">{value}</div>
                                                                        }
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                                                {/* Change plan */}
                                                                <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-2">
                                                                    <div className="text-xs font-semibold text-slate-500">Change Plan</div>
                                                                    <select
                                                                        className="input py-1.5 text-xs"
                                                                        value={newPlan}
                                                                        onChange={(e) => setNewPlan(e.target.value)}
                                                                    >
                                                                        <option value="">Select plan…</option>
                                                                        {PLANS.map((p) => (
                                                                            <option key={p} value={p}>{p}</option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        className="btn-primary w-full py-1.5 text-xs"
                                                                        disabled={!newPlan || updateSubMutation.isPending}
                                                                        onClick={() => updateSubMutation.mutate({
                                                                            userId: user.id, action: 'CHANGE_PLAN', plan: newPlan,
                                                                        })}
                                                                    >Apply</button>
                                                                </div>

                                                                {/* Override expiry */}
                                                                <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-2">
                                                                    <div className="text-xs font-semibold text-slate-500">Override Expiry</div>
                                                                    <input
                                                                        type="datetime-local"
                                                                        className="input py-1.5 text-xs"
                                                                        value={newExpiry}
                                                                        onChange={(e) => setNewExpiry(e.target.value)}
                                                                    />
                                                                    <button
                                                                        className="btn-primary w-full py-1.5 text-xs"
                                                                        disabled={!newExpiry || updateSubMutation.isPending}
                                                                        onClick={() => updateSubMutation.mutate({
                                                                            userId: user.id,
                                                                            action: 'OVERRIDE_EXPIRY',
                                                                            expiresAt: new Date(newExpiry).toISOString(),
                                                                        })}
                                                                    >Apply</button>
                                                                </div>

                                                                {/* Cancel */}
                                                                <div className="bg-white rounded-lg border border-slate-100 p-3 space-y-2">
                                                                    <div className="text-xs font-semibold text-slate-500">Cancel Subscription</div>
                                                                    <p className="text-xs text-slate-400">
                                                                        This will mark the subscription as cancelled immediately.
                                                                    </p>
                                                                    <button
                                                                        className="w-full py-1.5 text-xs rounded-lg font-medium
                                                                                   bg-red-50 text-red-600 hover:bg-red-100 transition-colors
                                                                                   disabled:opacity-50"
                                                                        disabled={updateSubMutation.isPending || subDetail.status === 'CANCELLED'}
                                                                        onClick={() => updateSubMutation.mutate({ userId: user.id, action: 'CANCEL' })}
                                                                    >
                                                                        {subDetail.status === 'CANCELLED' ? 'Already Cancelled' : 'Cancel'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-400">No subscription found for this user.</div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination — hidden while search is active */}
                {totalPages > 1 && !search && (
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
