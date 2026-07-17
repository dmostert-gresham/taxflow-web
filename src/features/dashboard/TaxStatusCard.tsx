import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { KeyRound, CheckCircle, Clock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import { useTaxYearStore } from '../../stores/taxYearStore'
import type { ApiResponse } from '../../types'
import clsx from 'clsx'

interface ItasCredentialStatus {
  stored: boolean
  tin?: string
  storedAt?: string
}

interface ItasTaxStatus {
  found: boolean
  taxYear: number
  returnStatus: string | null
  dueDate: string | null
  outstandingBalance: string | null
}

function statusVariant(returnStatus: string | null): {
  color: string
  bg: string
  icon: React.ReactNode
} {
  const s = (returnStatus ?? '').toLowerCase()
  if (s.includes('filed') || s.includes('submitted') || s.includes('accepted')) {
    return { color: 'text-teal-dark', bg: 'bg-teal/5 border-teal/20', icon: <CheckCircle size={16} className="text-teal-dark" /> }
  }
  if (s.includes('pending') || s.includes('draft')) {
    return { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <Clock size={16} className="text-amber-500" /> }
  }
  return { color: 'text-navy', bg: 'bg-navy/5 border-navy/20', icon: <AlertCircle size={16} className="text-slate-400" /> }
}

export default function TaxStatusCard() {
  const TAX_YEAR = useTaxYearStore((s) => s.taxYear)
  // TAX_YEAR is "2025/26" — backend expects the integer start year (2025)
  const taxYearInt = parseInt(TAX_YEAR.split('/')[0], 10)

  const { data: credStatus, isLoading: credLoading } = useQuery({
    queryKey: ['itas-credentials-status'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ItasCredentialStatus>>('/itas/credentials/status')
      return res.data.data
    },
  })

  const {
    data: taxStatus,
    isLoading: statusLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['itas-tax-status', taxYearInt],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ItasTaxStatus>>(
        `/itas/tax-status?taxYear=${taxYearInt}`
      )
      return res.data.data
    },
    enabled: credStatus?.stored === true,
    retry: false,
    staleTime: 1000 * 60 * 55, // 55 min — just under the backend 1-hour cache
  })

  if (credLoading) {
    return (
      <div className="card p-5 flex items-center justify-center min-h-[120px]">
        <Loader2 size={20} className="text-slate-300 animate-spin" />
      </div>
    )
  }

  if (!credStatus?.stored) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">NamRA / ITAS status</span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed mb-3">
          Connect your ITAS e-Portal credentials to see your filing status and outstanding balance.
        </p>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy hover:underline"
        >
          Connect ITAS <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  if (statusLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">NamRA / ITAS status</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Loader2 size={14} className="animate-spin" />
          Fetching from ITAS portal…
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">NamRA / ITAS status</span>
        </div>
        <p className="text-xs text-red-500">{extractErrorMessage(error)}</p>
      </div>
    )
  }

  if (!taxStatus?.found) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">NamRA / ITAS status</span>
        </div>
        <p className="text-slate-400 text-xs">No return found for {TAX_YEAR} on ITAS.</p>
      </div>
    )
  }

  const { color, bg, icon } = statusVariant(taxStatus.returnStatus)

  return (
    <div className={clsx('card p-5 border', bg)}>
      <div className="flex items-center gap-2 mb-3">
        <KeyRound size={15} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-600">NamRA / ITAS status</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className={clsx('font-semibold text-sm', color)}>
          {taxStatus.returnStatus ?? 'Unknown'}
        </span>
      </div>

      <div className="space-y-1.5">
        {taxStatus.dueDate && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Due date</span>
            <span className="font-medium text-navy">{taxStatus.dueDate}</span>
          </div>
        )}
        {taxStatus.outstandingBalance && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Outstanding</span>
            <span className="font-medium text-navy">{taxStatus.outstandingBalance}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Tax year</span>
          <span className="font-medium text-navy">{taxStatus.taxYear}</span>
        </div>
      </div>
    </div>
  )
}
