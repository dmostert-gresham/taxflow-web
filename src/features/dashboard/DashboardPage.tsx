import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Upload, FileText, Search, MessageSquare,
  AlertCircle, TrendingUp, TrendingDown, Minus,
  Calendar, ArrowRight, Lock,
} from 'lucide-react'
import { api, formatNAD } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { ApiResponse, TaxReturnModel, Paye5Result } from '../../types'
import clsx from 'clsx'

type Plan = 'BASIC' | 'PROFESSIONAL' | 'BUSINESS' | 'PRACTITIONER'
const PLAN_RANK: Record<Plan, number> = { BASIC: 0, PROFESSIONAL: 1, BUSINESS: 2, PRACTITIONER: 3 }

// Tax year runs March 1 → last day of February.
// March–December: the year that ended this past Feb = (year-1)/(year)
// January–February: the year that ended last Feb    = (year-2)/(year-1)
function currentTaxYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startYear = now.getMonth() >= 2 ? year - 1 : year - 2
  return `${startYear}/${String(startYear + 1).slice(2)}`
}

const TAX_YEAR = currentTaxYear()

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function daysUntilDeadline() {
  const deadline = new Date(`${new Date().getFullYear()}-06-30`)
  const now = new Date()
  if (deadline < now) deadline.setFullYear(deadline.getFullYear() + 1)
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ status: string; plan: string; expiresAt: string }>>(
        '/billing/status'
      )
      return res.data.data
    },
  })

  const activePlan =
    subscription?.status === 'ACTIVE' ? (subscription.plan as Plan) : 'BASIC'

  const canAccess = (required: Plan) =>
    PLAN_RANK[activePlan] >= PLAN_RANK[required]

  const { data: savedDeductions } = useQuery({
    queryKey: ['deductions', TAX_YEAR],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{
        grossIncome: number
        payeAlreadyPaid: number; pensionContributions: number
        medicalExpenses: number; donations: number
        studyLoanInterest: number; otherDeductions: number
      }>>('/deductions', { params: { taxYear: TAX_YEAR } })
      return res.data.data
    },
  })

  const { data: paye5Data } = useQuery({
    queryKey: ['paye5', TAX_YEAR],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paye5Result & { found: boolean }>>(
        `/documents/paye5?taxYear=${encodeURIComponent(TAX_YEAR)}`
      )
      return res.data.data
    },
  })

  const hasPaye5      = paye5Data?.found === true
  const resolvedGross = hasPaye5 ? (paye5Data?.grossIncome          ?? 0) : (savedDeductions?.grossIncome          ?? 0)
  const resolvedPaye  = hasPaye5 ? (paye5Data?.payeDeducted         ?? 0) : (savedDeductions?.payeAlreadyPaid      ?? 0)
  const resolvedPension = hasPaye5 ? (paye5Data?.pensionContributions ?? 0) : (savedDeductions?.pensionContributions ?? 0)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tax-return', TAX_YEAR, resolvedGross, resolvedPaye, resolvedPension,
               savedDeductions?.medicalExpenses, savedDeductions?.donations,
               savedDeductions?.studyLoanInterest, savedDeductions?.otherDeductions],
    queryFn: async () => {
      const res = await api.post<ApiResponse<TaxReturnModel>>('/returns/calculate', {
        taxYear: TAX_YEAR,
        ...(resolvedGross > 0 ? { grossIncome: resolvedGross } : {}),
        payeAlreadyPaid:           resolvedPaye,
        pensionContributions:      resolvedPension,
        medicalExpenses:           savedDeductions?.medicalExpenses   ?? 0,
        donationsToApprovedBodies: savedDeductions?.donations         ?? 0,
        studyLoanInterest:         savedDeductions?.studyLoanInterest ?? 0,
        otherDeductions:           savedDeductions?.otherDeductions   ?? 0,
      })
      return res.data.data
    },
  })

  const days     = daysUntilDeadline()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="page-subtitle">
          Here's your tax overview for {TAX_YEAR}
        </p>
      </div>

      {/* Status + deadline row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main status card */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="card p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="card p-8 text-center">
              <AlertCircle size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No tax data yet for {TAX_YEAR}</p>
              <Link to="/transactions" className="btn-primary inline-flex mt-4 text-sm gap-2">
                <Upload size={15} /> Import bank statement
              </Link>
            </div>
          ) : data ? (
            <StatusCard data={data} />
          ) : null}
        </div>

        {/* Deadline card */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filing deadline</span>
          </div>
          <div>
            <div className={clsx(
              'font-display text-4xl font-bold',
              days <= 14 ? 'text-coral' : days <= 30 ? 'text-amber-500' : 'text-teal'
            )}>
              {days}
            </div>
            <div className="text-slate-500 text-sm mt-1">days remaining</div>
            <div className="text-slate-400 text-xs mt-1">30 June {new Date().getFullYear()}</div>
          </div>
          <div className={clsx(
            'mt-4 text-xs font-medium px-3 py-1.5 rounded-full inline-block',
            days <= 14
              ? 'bg-red-50 text-red-600'
              : days <= 30
                ? 'bg-amber-50 text-amber-600'
                : 'bg-teal/10 text-teal-dark'
          )}>
            {days <= 14 ? '⚠️ Urgent' : days <= 30 ? '📅 Coming up' : '✓ On track'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Gross Income"
            value={formatNAD(data.grossIncome)}
            icon={<TrendingUp size={18} className="text-teal" />}
            bg="bg-teal/5"
          />
          <StatCard
            label="Total Deductions"
            value={formatNAD(data.totalDeductions)}
            icon={<TrendingDown size={18} className="text-blue-500" />}
            bg="bg-blue-50"
          />
          <StatCard
            label="Net Tax Payable"
            value={formatNAD(data.netTax)}
            icon={<Minus size={18} className="text-coral" />}
            bg="bg-coral/5"
          />
          <StatCard
            label="Effective Rate"
            value={`${data.effectiveTaxRate.toFixed(1)}%`}
            icon={<TrendingUp size={18} className="text-slate-400" />}
            bg="bg-slate-50"
          />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="section-title">Quick actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            {
              to: '/transactions',
              icon: <Upload size={20} className="text-navy" />,
              label: 'Import Statement',
              desc: 'Upload FNB or Bank Windhoek CSV',
              bg: 'bg-navy/5 hover:bg-navy/10',
              requiredPlan: 'PROFESSIONAL' as Plan,
            },
            {
              to: '/returns',
              icon: <FileText size={20} className="text-teal-dark" />,
              label: 'View Return',
              desc: 'See your full ITX breakdown',
              bg: 'bg-teal/5 hover:bg-teal/10',
              requiredPlan: 'BASIC' as Plan,
            },
            {
              to: '/transactions?action=classify',
              icon: <Search size={20} className="text-blue-600" />,
              label: 'Find Deductions',
              desc: 'AI-powered deduction finder',
              bg: 'bg-blue-50 hover:bg-blue-100',
              requiredPlan: 'PROFESSIONAL' as Plan,
            },
            {
              to: '/assistant',
              icon: <MessageSquare size={20} className="text-coral" />,
              label: 'Ask AI Assistant',
              desc: 'Tax questions answered',
              bg: 'bg-coral/5 hover:bg-coral/10',
              requiredPlan: 'PROFESSIONAL' as Plan,
            },
          ] as const).map(({ to, icon, label, desc, bg, requiredPlan }) => {
            const allowed = canAccess(requiredPlan)
            if (!allowed) return (
              <div
                key={to}
                className="card p-4 opacity-50 cursor-not-allowed select-none"
              >
                <div className="mb-3">{icon}</div>
                <div className="font-medium text-navy text-sm">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400">
                  <Lock size={11} /> {requiredPlan.charAt(0) + requiredPlan.slice(1).toLowerCase()} plan
                </div>
              </div>
            )
            return (
              <Link
                key={to}
                to={to}
                className={clsx('card p-4 transition-colors cursor-pointer group', bg)}
              >
                <div className="mb-3">{icon}</div>
                <div className="font-medium text-navy text-sm">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400
                                group-hover:text-navy transition-colors">
                  Open <ArrowRight size={12} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusCard({ data }: { data: TaxReturnModel }) {
  const isRefund    = data.status === 'REFUND'
  const isLiability = data.status === 'LIABILITY'

  const color = isRefund ? 'text-teal-dark' : isLiability ? 'text-coral' : 'text-navy'
  const bg    = isRefund ? 'bg-teal/5 border-teal/20' : isLiability ? 'bg-coral/5 border-coral/20' : 'bg-navy/5 border-navy/20'
  const icon  = isRefund ? '🎉' : isLiability ? '⚠️' : '✓'

  return (
    <div className={clsx('card p-6 border', bg)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-500 text-sm font-medium">
            {isRefund ? 'Refund due' : isLiability ? 'Tax owed' : 'All square'} {icon}
          </div>
          <div className={clsx('font-display text-4xl font-bold mt-1', color)}>
            {formatNAD(data.refundOrLiability)}
          </div>
          <div className="text-slate-400 text-xs mt-1.5">
            Based on {data.transactionCount} transactions · {data.taxYear}
          </div>
        </div>
        <Link
          to="/returns"
          className="btn-outline text-sm flex items-center gap-1.5 shrink-0"
        >
          View return <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-400">Taxable income</div>
          <div className="font-semibold text-navy text-sm mt-0.5">
            {formatNAD(data.taxableIncome)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">
            {(data.provisionalTaxPaid ?? 0) > 0 ? 'Provisional tax paid' : 'PAYE paid'}
          </div>
          <div className="font-semibold text-navy text-sm mt-0.5">
            {formatNAD(data.payeAlreadyPaid)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Tax rate</div>
          <div className="font-semibold text-navy text-sm mt-0.5">
            {data.effectiveTaxRate.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, bg,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string
}) {
  return (
    <div className="card p-4">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-3', bg)}>
        {icon}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value text-xl">{value}</div>
    </div>
  )
}
