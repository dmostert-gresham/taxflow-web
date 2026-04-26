import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface UserSummary {
    id: number
    email: string
    fullName: string
    role: string
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
}

const PLANS = ['BASIC', 'PROFESSIONAL', 'BUSINESS', 'PRACTITIONER']

const statusClass = (status: string | null) => clsx(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    status === 'ACTIVE'    ? 'bg-teal/10 text-teal-dark' :
        status === 'EXPIRED'   ? 'bg-amber-100 text-amber-700' :
            status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                status === 'PENDING'   ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-400'
)

export default function AdminSubscriptionsPage() {
    const queryClient = useQueryClient()
    const [search, setSearch]         = useState('')
    const [expanded, setExpanded]     = useState<number | null>(null)
    const [newPlan, setNewPlan]       = useState('')
    const [newExpiry, setNewExpiry]   = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['admin-users-subs'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResponse<UserSummary>>>(
                '/admin/users?page=0&size=100&sort=createdAt,desc'
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

    const updateMutation = useMutation({
        mutationFn: async ({ userId, action, plan, expiresAt }: {
            userId: number
            action: string
            plan?: string
            expiresAt?: string
        }) =>
            api.patch(`/admin/users/${userId}/subscription`, { action, plan, expiresAt }),
        onSuccess: () => {
            toast.success('Subscription updated')
            queryClient.invalidateQueries({ queryKey: ['admin-users-subs'] })
            queryClient.invalidateQueries({ queryKey: ['admin-sub-detail', expanded] })
            setNewPlan('')
            setNewExpiry('')
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
    })

    const users = (data?.content ?? []).filter((u) =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    const toggleExpand = (id: number) =>
        setExpanded((prev) => (prev === id ? null : id))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <CreditCard size={22} className="text-navy" />
                    Subscription Management
                </h1>
                <p className="page-subtitle">View and manage user subscriptions</p>
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

            {/* List */}
            <div className="card overflow-hidden p-0 divide-y divide-slate-100">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading…
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">No users found</div>
                ) : (
                    users.map((user) => (
                        <div key={user.id}>
                            {/* Row */}
                            <button
                                className="w-full flex items-center justify-between px-4 py-3.5
                           hover:bg-slate-50 transition-colors text-left"
                                onClick={() => toggleExpand(user.id)}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="min-w-0">
                                        <div className="font-medium text-navy text-sm">{user.fullName}</div>
                                        <div className="text-xs text-slate-400">{user.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    {user.subscriptionPlan ? (
                                        <div className="text-right">
                      <span className={statusClass(user.subscriptionStatus)}>
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
                                        <span className="text-xs text-slate-400">No subscription</span>
                                    )}
                                    {expanded === user.id
                                        ? <ChevronUp size={15} className="text-slate-400" />
                                        : <ChevronDown size={15} className="text-slate-400" />
                                    }
                                </div>
                            </button>

                            {/* Expanded detail panel */}
                            {expanded === user.id && (
                                <div className="bg-slate-50 border-t border-slate-100 px-4 py-4 space-y-4">
                                    {subLoading ? (
                                        <div className="flex items-center text-slate-400 text-sm gap-2">
                                            <Loader2 size={14} className="animate-spin" /> Loading detail…
                                        </div>
                                    ) : subDetail ? (
                                        <>
                                            {/* Detail grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                {[
                                                    { label: 'Plan',    value: subDetail.plan },
                                                    { label: 'Status',  value: subDetail.status },
                                                    { label: 'Started', value: subDetail.startsAt
                                                            ? new Date(subDetail.startsAt).toLocaleDateString('en-NA')
                                                            : '—' },
                                                    { label: 'Expires', value: subDetail.expiresAt
                                                            ? new Date(subDetail.expiresAt).toLocaleDateString('en-NA')
                                                            : '—' },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                        <div className="text-slate-400 mb-0.5">{label}</div>
                                                        <div className="font-medium text-navy">{value}</div>
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
                                                        disabled={!newPlan || updateMutation.isPending}
                                                        onClick={() => updateMutation.mutate({
                                                            userId: user.id, action: 'CHANGE_PLAN', plan: newPlan,
                                                        })}
                                                    >
                                                        Apply
                                                    </button>
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
                                                        disabled={!newExpiry || updateMutation.isPending}
                                                        onClick={() => updateMutation.mutate({
                                                            userId: user.id,
                                                            action: 'OVERRIDE_EXPIRY',
                                                            expiresAt: new Date(newExpiry).toISOString(),
                                                        })}
                                                    >
                                                        Apply
                                                    </button>
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
                                                        disabled={
                                                            updateMutation.isPending ||
                                                            subDetail.status === 'CANCELLED'
                                                        }
                                                        onClick={() => updateMutation.mutate({
                                                            userId: user.id, action: 'CANCEL',
                                                        })}
                                                    >
                                                        {subDetail.status === 'CANCELLED' ? 'Already Cancelled' : 'Cancel'}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-slate-400">
                                            No subscription found for this user.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}