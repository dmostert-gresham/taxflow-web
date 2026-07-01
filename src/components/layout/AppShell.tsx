import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowUpDown, FileText, FolderOpen,
  MessageSquare, Scale, CreditCard, LogOut, ChevronRight,
  TrendingUp, ShieldCheck, Users, X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useTaxYearStore, TAX_YEARS } from '../../stores/taxYearStore'
import { api } from '../../api/client'
import type { ApiResponse } from '../../types'
import clsx from 'clsx'

type Plan = 'BASIC' | 'PROFESSIONAL' | 'BUSINESS' | 'PRACTITIONER'

const PLAN_RANK: Record<Plan, number> = {
  BASIC: 0, PROFESSIONAL: 1, BUSINESS: 2, PRACTITIONER: 3,
}

const NAV_ITEMS: {
  to: string; icon: React.ElementType; label: string;
  minPlan?: Plan; adminHide?: boolean; roleOnly?: string; practitionerHide?: boolean
}[] = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',                       adminHide: true, practitionerHide: true },
  { to: '/returns',              icon: FileText,        label: 'Returns',      minPlan: 'BASIC',  adminHide: true, practitionerHide: true },
  { to: '/documents',            icon: FolderOpen,      label: 'Documents',    minPlan: 'BASIC',  adminHide: true, practitionerHide: true },
  { to: '/transactions',         icon: ArrowUpDown,     label: 'Transactions', minPlan: 'PROFESSIONAL' },
  { to: '/assistant',            icon: MessageSquare,   label: 'AI Assistant', minPlan: 'PROFESSIONAL' },
  { to: '/trial-balance',        icon: Scale,           label: 'Trial Balance', minPlan: 'BUSINESS' },
  { to: '/practitioner/clients', icon: Users,           label: 'My Clients',   roleOnly: 'PRACTITIONER' },
]

const ADMIN_ITEMS = [
  { to: '/admin/users', icon: ShieldCheck, label: 'Users' },
]

export default function AppShell() {
  const { user, logout, practitionerSession, exitImpersonation } = useAuthStore()
  const taxYear    = useTaxYearStore((s) => s.taxYear)
  const setTaxYear = useTaxYearStore((s) => s.setTaxYear)
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin          = user?.role === 'ADMIN'
  const isPractitioner   = user?.role === 'PRACTITIONER'
  const isImpersonating  = !!practitionerSession

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

  const subStatus = billingStatus?.status
  const subLapsed = !isAdmin && !!subStatus && subStatus !== 'ACTIVE'

  const visibleNavItems = subLapsed
    ? []
    : NAV_ITEMS.filter(
        (item) =>
          (!item.adminHide || !isAdmin) &&
          (!item.minPlan || userRank >= PLAN_RANK[item.minPlan]) &&
          (!item.roleOnly || user?.role === item.roleOnly) &&
          (!item.practitionerHide || !isPractitioner || isImpersonating)
      )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleExitImpersonation = () => {
    exitImpersonation()
    navigate('/practitioner/clients')
  }

  const initials = user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  const allowedWhenLapsed = ['/billing', '/profile']
  if (subLapsed && !allowedWhenLapsed.some((p) => location.pathname.startsWith(p))) {
    return <Navigate to="/billing" replace />
  }

  return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-64 flex flex-col bg-white border-r border-slate-200 shrink-0">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                   style={{ background: 'linear-gradient(135deg, #1565C0 0%, #00C8EE 100%)' }}>
                <TrendingUp size={16} className="text-white" />
              </div>
              <div>
                <div className="font-display font-bold text-sm leading-tight">
                  <span className="text-navy">Tax</span>
                  <span style={{ background: 'linear-gradient(90deg, #1565C0, #00C8EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Fuse</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                  SMART TAX
                </div>
              </div>
            </div>
          </div>

          {/* Tax year selector — single source of truth for the whole app */}
          <div className="px-4 py-3 border-b border-slate-100">
            <label htmlFor="sidebar-tax-year"
                   className="block text-[10px] font-semibold text-slate-400 tracking-wide uppercase mb-1">
              Tax Year
            </label>
            <select
              id="sidebar-tax-year"
              className="input w-full text-sm"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value as typeof taxYear)}
            >
              {TAX_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
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
            {!isAdmin && (
              <NavLink
                  to="/billing"
                  className={({ isActive }) =>
                      clsx('sidebar-item', isActive && 'active')
                  }
              >
                <CreditCard size={17} className="shrink-0" />
                <span>Billing</span>
              </NavLink>
            )}

            {/* User */}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                  isActive ? 'bg-navy/5' : 'hover:bg-slate-50'
                )
              }
            >
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
            </NavLink>

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
          {/* Impersonation banner */}
          {isImpersonating && (
            <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5
                            flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Users size={15} className="text-amber-600" />
                <span>
                  Viewing as <span className="font-semibold">{user?.fullName}</span>
                </span>
              </div>
              <button
                onClick={handleExitImpersonation}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700
                           hover:text-amber-900 transition-colors"
              >
                <X size={13} />
                Exit to my account
              </button>
            </div>
          )}

          <div className="max-w-6xl mx-auto px-8 py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
  )
}
