import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowUpDown, FileText, FolderOpen,
  MessageSquare, Scale, CreditCard, LogOut, ChevronRight,
  TrendingUp, ShieldCheck,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../api/client'
import type { ApiResponse } from '../../types'
import clsx from 'clsx'

type Plan = 'BASIC' | 'PROFESSIONAL' | 'BUSINESS' | 'PRACTITIONER'

const PLAN_RANK: Record<Plan, number> = {
  BASIC: 0, PROFESSIONAL: 1, BUSINESS: 2, PRACTITIONER: 3,
}

const NAV_ITEMS: { to: string; icon: React.ElementType; label: string; minPlan?: Plan }[] = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/returns',       icon: FileText,        label: 'Returns',        minPlan: 'BASIC' },
  { to: '/documents',     icon: FolderOpen,      label: 'Documents',      minPlan: 'BASIC' },
  { to: '/transactions',  icon: ArrowUpDown,     label: 'Transactions',   minPlan: 'PROFESSIONAL' },
  { to: '/assistant',     icon: MessageSquare,   label: 'AI Assistant',   minPlan: 'PROFESSIONAL' },
  { to: '/trial-balance', icon: Scale,           label: 'Trial Balance',  minPlan: 'BUSINESS' },
]

const ADMIN_ITEMS = [
  { to: '/admin/users',         icon: ShieldCheck, label: 'Users' },
  { to: '/admin/subscriptions', icon: CreditCard,  label: 'Subscriptions' },
]

export default function AppShell() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN'

  const { data: billingStatus } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ status: string; plan: Plan; expiresAt: string }>>(
        '/billing/status'
      )
      return res.data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const userPlan: Plan = billingStatus?.plan ?? 'BASIC'
  const userRank = PLAN_RANK[userPlan]

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.minPlan || userRank >= PLAN_RANK[item.minPlan]
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-64 flex flex-col bg-white border-r border-slate-200 shrink-0">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-teal" />
              </div>
              <div>
                <div className="font-display font-bold text-navy text-sm leading-tight">
                  TaxFlow
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                  NAMIBIA
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {visibleNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        clsx('sidebar-item', isActive && 'active')
                    }
                >
                  <Icon size={17} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
            ))}

            {/* Admin section — ADMIN role only */}
            {isAdmin && (
                <div className="pt-4">
                  <div className="px-3 pb-1.5">
                <span className="text-[10px] font-semibold text-slate-400
                                 uppercase tracking-widest">
                  Admin
                </span>
                  </div>
                  {ADMIN_ITEMS.map(({ to, icon: Icon, label }) => (
                      <NavLink
                          key={to}
                          to={to}
                          className={({ isActive }) =>
                              clsx('sidebar-item', isActive && 'active')
                          }
                      >
                        <Icon size={17} className="shrink-0" />
                        <span>{label}</span>
                      </NavLink>
                  ))}
                </div>
            )}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-slate-100 p-3 space-y-1">
            {/* Billing */}
            <NavLink
                to="/billing"
                className={({ isActive }) =>
                    clsx('sidebar-item', isActive && 'active')
                }
            >
              <CreditCard size={17} className="shrink-0" />
              <span>Billing</span>
            </NavLink>

            {/* User */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg
                          hover:bg-slate-50 cursor-pointer transition-colors group">
              <div className="w-7 h-7 rounded-full bg-navy flex items-center
                            justify-center text-white text-xs font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy truncate">
                  {user?.fullName ?? 'User'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email}
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300
                          group-hover:text-slate-400 transition-colors" />
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="sidebar-item w-full text-left text-red-500
                       hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={17} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
  )
}