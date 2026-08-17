import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { KeyRound, RefreshCw, Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { api, apiLong, extractErrorMessage } from '../../api/client'
import type { ApiResponse, ItasTaxpayerStatement } from '../../types'
import clsx from 'clsx'

interface ItasCredentialStatus {
  stored: boolean
  tin?: string
  storedAt?: string
}

// Explanations for the known ITAS Taxpayer Statement columns (FIN / Tax Type / Status /
// Tax Due / Penalty / Interest / Refund / Suspense / Unallocated Amount / Total Balance).
// Matched case-insensitively — fields ITAS shows outside this set just render without a tooltip.
const FIELD_EXPLANATIONS: Record<string, string> = {
  'fin': 'Financial Identification Number — your taxpayer identifier registered with NamRA.',
  'tax type': 'The type of tax this statement covers, e.g. Income Tax.',
  'status': "Your account's current status for this tax type, e.g. Active.",
  'tax due(n$)': 'Total tax assessed as owing, before penalties, interest, or payments are applied.',
  'penalty(n$)': 'Penalties charged for late payment or late filing.',
  'interest(n$)': 'Interest accrued on any overdue amounts.',
  'refund(n$)': 'Amount NamRA owes back to you, e.g. from an overpayment.',
  'suspense(n$)': 'Payments received but not yet allocated to a specific tax due — shown in brackets as a credit.',
  'unallocated amount(n$)': "Funds you've paid that haven't yet been matched to a specific assessment.",
  'total balance(n$)': "Your net balance with NamRA for this tax type — a bracketed amount means you're in credit, a positive amount means you owe.",
}

function explanationFor(label: string): string | undefined {
  return FIELD_EXPLANATIONS[label.trim().toLowerCase()]
}

export default function TaxpayerStatementPage() {
  const queryClient = useQueryClient()

  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  const { data: credStatus, isLoading: credLoading } = useQuery({
    queryKey: ['itas-credentials-status'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ItasCredentialStatus>>('/itas/credentials/status')
      return res.data.data
    },
  })

  const {
    data: statement,
    isLoading: stmtLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['taxpayer-statement'],
    queryFn: async () => {
      // apiLong: a cache miss makes the backend run a live ITAS fetch under the hood
      const res = await apiLong.get<ApiResponse<ItasTaxpayerStatement>>('/itas/taxpayer-statement')
      return res.data.data
    },
    enabled: credStatus?.stored === true,
    retry: false,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshError('')
    try {
      const res = await apiLong.post<ApiResponse<ItasTaxpayerStatement>>('/itas/taxpayer-statement/refresh')
      queryClient.setQueryData(['taxpayer-statement'], res.data.data)
    } catch (err) {
      setRefreshError(extractErrorMessage(err))
    } finally {
      setRefreshing(false)
    }
  }

  const RefreshButton = ({ label = 'Refresh from ITAS' }: { label?: string }) => (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className={clsx('btn-outline flex items-center justify-center gap-2', refreshing && 'opacity-60')}
    >
      {refreshing ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          Fetching from ITAS… (this may take 1–2 minutes)
        </>
      ) : (
        <>
          <RefreshCw size={15} />
          {label}
        </>
      )}
    </button>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Taxpayer Statement</h1>
        <p className="page-subtitle">
          Your Taxpayer Statement from ITAS
        </p>
      </div>

      {credLoading ? (
        <div className="card p-6 flex items-center justify-center min-h-[120px]">
          <Loader2 size={20} className="text-slate-300 animate-spin" />
        </div>
      ) : !credStatus?.stored ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Connect ITAS</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">
            To load your Taxpayer Statement, connect your ITAS e-Portal credentials first.
          </p>
          <Link to="/profile" className="btn-primary inline-flex items-center gap-2">
            Connect ITAS
          </Link>
        </div>
      ) : (
        <>
          {refreshError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {refreshError}
            </div>
          )}

          {stmtLoading ? (
            <div className="card p-6">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Loading your Taxpayer Statement…
              </div>
            </div>
          ) : isError ? (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-sm font-medium text-slate-600">Couldn't load Taxpayer Statement</span>
              </div>
              <p className="text-xs text-red-500 mb-4">{extractErrorMessage(error)}</p>
              <RefreshButton label="Try again" />
            </div>
          ) : !statement?.found ? (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">No statement found</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                No Taxpayer Statement is cached yet. Generate one from ITAS below.
              </p>
              <RefreshButton label="Generate from ITAS" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                {statement.fetchedAt ? (
                  <p className="text-xs text-slate-400">
                    Last refreshed {new Date(statement.fetchedAt).toLocaleString()}
                  </p>
                ) : (
                  <span />
                )}
                <RefreshButton />
              </div>

              {statement.fields.length === 0 ? (
                <p className="text-slate-400 text-sm p-5">
                  The statement was generated but no fields could be read from it.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {statement.fields.map((field, i) => {
                      const explanation = explanationFor(field.label)
                      return (
                        <tr key={i} className={clsx('border-b border-slate-50 last:border-0', i % 2 === 1 && 'bg-slate-50/50')}>
                          <td className="px-5 py-2.5 text-slate-500 w-1/2 align-top">
                            <div className="font-medium text-slate-600">{field.label}</div>
                            {explanation && (
                              <div className="text-xs text-slate-400 mt-0.5">{explanation}</div>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-navy font-medium">{field.value}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
