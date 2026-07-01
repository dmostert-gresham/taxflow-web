import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, Download, Wand2,
  TrendingUp, TrendingDown, Minus, ArrowRight,
  Scale, BadgeCheck, RefreshCw, Trash2, AlertTriangle, Receipt, X,
} from 'lucide-react'
import { api, formatNAD } from '../../api/client'
import type { ApiResponse, TaxReturnModel, DeductionSuggestion, IncomeSummary, Paye5Result, Transaction } from '../../types'
import { useTaxYearStore, TAX_YEARS } from '../../stores/taxYearStore'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function ReturnsPage() {
  const [searchParams] = useSearchParams()

  // URL params injected by the "Pre-fill Tax Return" shortcut on DocumentsPage
  const urlTaxYear     = searchParams.get('taxYear')     ?? ''
  const urlGrossIncome = searchParams.get('grossIncome') ?? ''
  const urlPaye        = searchParams.get('paye')        ?? ''
  const urlPension     = searchParams.get('pension')     ?? ''

  const hasUrlTaxYear  = (TAX_YEARS as readonly string[]).includes(urlTaxYear)
  const hasUrlPrefill  = urlGrossIncome !== '' || urlPaye !== '' || urlPension !== ''

  // Align the global tax year with a deep-link ?taxYear= param once, synchronously,
  // before the store is read below — so prefill guards see the correct year on the
  // very first render (preserving the no-overwrite behaviour for gross/paye/pension).
  useState(() => {
    if (hasUrlTaxYear && urlTaxYear !== useTaxYearStore.getState().taxYear) {
      useTaxYearStore.getState().setTaxYear(urlTaxYear as typeof TAX_YEARS[number])
    }
    return null
  })

  const taxYear    = useTaxYearStore((s) => s.taxYear)
  const setTaxYear  = useTaxYearStore((s) => s.setTaxYear)
  const initialTaxYear = hasUrlTaxYear ? urlTaxYear : taxYear
  const [grossIncome, setGrossIncome]       = useState(urlGrossIncome || '0')
  const [paye, setPaye]                     = useState(urlPaye    || '0')
  const [pension, setPension]               = useState(urlPension || '0')
  const [medical, setMedical]               = useState('0')
  const [donations, setDonations]           = useState('0')
  const [studyLoan, setStudyLoan]           = useState('0')
  const [otherDeductions, setOtherDeductions] = useState('0')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const queryClient = useQueryClient()

  // urlPrefillRef: when paye/pension came from URL params, skip overwriting them from the
  // server on the first render. Cleared to false after the first server sync.
  const urlPrefillRef  = useRef(hasUrlPrefill)
  // isFirstMountRef: prevents the taxYear-change effect from firing on initial mount,
  // which would otherwise reset the loadedForYear guard we set from URL params.
  const isFirstMountRef = useRef(true)

  // loadedForYear tracks which year's server data has been synced into the form.
  // Pre-set to initialTaxYear when URL params are present so the first effect doesn't
  // overwrite paye/pension; null otherwise so server data loads normally on mount.

  const [loadedForYear, setLoadedForYear] = useState<string | null>(
    hasUrlPrefill ? initialTaxYear : null
  )

  const { data: savedDeductions } = useQuery({
    queryKey: ['deductions', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{
        grossIncome: number
        payeAlreadyPaid: number; pensionContributions: number
        medicalExpenses: number; donations: number
        studyLoanInterest: number; otherDeductions: number
      }>>('/deductions', { params: { taxYear } })
      return res.data.data
    },
    refetchOnWindowFocus: false,
  })

  // If a PAYE5 cert exists for this year, its values are authoritative for
  // grossIncome, PAYE paid, and pension — those fields become read-only on this page.
  const { data: paye5Data } = useQuery({
    queryKey: ['paye5', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paye5Result & { found: boolean }>>(
        `/documents/paye5?taxYear=${encodeURIComponent(taxYear)}`
      )
      return res.data.data
    },
    refetchOnWindowFocus: false,
  })

  const hasPaye5       = paye5Data?.found === true
  const displayGross   = hasPaye5 ? String(paye5Data?.grossIncome          ?? 0) : grossIncome
  const displayPaye    = hasPaye5 ? String(paye5Data?.payeDeducted         ?? 0) : paye
  const displayPension = hasPaye5 ? String(paye5Data?.pensionContributions ?? 0) : pension

  // Only sync server → state when tax year changes or on first load.
  // Never sync after a save — the PUT already persisted the current state.
  // When URL params provided paye/pension (from DocumentsPage pre-fill shortcut),
  // keep those values but still sync the remaining fields from the server.
  useEffect(() => {
    if (!savedDeductions) return
    if (loadedForYear === taxYear) return   // already loaded for this year
    if (!urlPrefillRef.current) {
      setGrossIncome(String(savedDeductions.grossIncome          || 0))
      setPaye(       String(savedDeductions.payeAlreadyPaid      || 0))
      setPension(    String(savedDeductions.pensionContributions || 0))
    }
    setMedical(        String(savedDeductions.medicalExpenses      || 0))
    setDonations(      String(savedDeductions.donations            || 0))
    setStudyLoan(      String(savedDeductions.studyLoanInterest    || 0))
    setOtherDeductions(String(savedDeductions.otherDeductions      || 0))
    setLoadedForYear(taxYear)
    // After first sync, clear the URL prefill guard so year changes sync normally
    urlPrefillRef.current = false
  }, [savedDeductions, taxYear, loadedForYear])

  // When tax year changes, reset the loadedForYear flag so the
  // next server response syncs into the fields.
  // Skip on initial mount — we may have pre-set loadedForYear from URL params.
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }
    setLoadedForYear(null)
  }, [taxYear])

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/statements', { params: { taxYear } })
      await api.delete('/documents/paye5', { params: { taxYear } })
    },
    onSuccess: async () => {
      // Delete saved deductions from the database too
      await api.put('/deductions', {
        taxYear,
        grossIncome: 0, payeAlreadyPaid: 0, pensionContributions: 0,
        medicalExpenses: 0, donations: 0,
        studyLoanInterest: 0, otherDeductions: 0,
      })
      // Clear local fields
      setGrossIncome('0'); setPaye('0'); setPension('0'); setMedical('0')
      setDonations('0'); setStudyLoan('0'); setOtherDeductions('0')
      // Update cache directly so useEffect doesn't fight us
      queryClient.setQueryData(['deductions', taxYear], {
        grossIncome: 0, payeAlreadyPaid: 0, pensionContributions: 0,
        medicalExpenses: 0, donations: 0,
        studyLoanInterest: 0, otherDeductions: 0,
      })
      setLoadedForYear(taxYear)
      queryClient.invalidateQueries({ queryKey: ['transactions', taxYear] })
      queryClient.setQueryData(['paye5', taxYear], { found: false })
      queryClient.removeQueries({ queryKey: ['tax-return', taxYear] })
      setShowResetDialog(false)
      toast.success(`${taxYear} return has been reset`)
    },
    onError: () => {
      setShowResetDialog(false)
      toast.error('Could not reset return. Please try again.')
    },
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tax-return', taxYear, displayGross, displayPaye, displayPension, medical, donations, studyLoan, otherDeductions],
    queryFn: async () => {
      const grossIncomeVal = parseFloat(displayGross) || 0
      const res = await api.post<ApiResponse<TaxReturnModel>>('/returns/calculate', {
        taxYear,
        ...(grossIncomeVal > 0 ? { grossIncome: grossIncomeVal } : {}),
        payeAlreadyPaid:           parseFloat(displayPaye)    || 0,
        pensionContributions:      parseFloat(displayPension)  || 0,
        medicalExpenses:           parseFloat(medical)         || 0,
        donationsToApprovedBodies: parseFloat(donations)       || 0,
        studyLoanInterest:         parseFloat(studyLoan)       || 0,
        otherDeductions:           parseFloat(otherDeductions) || 0,
      })
      return res.data.data
    },
    enabled: !!taxYear,
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ status: string; plan: string; expiresAt: string }>>(
        '/billing/status'
      )
      return res.data.data
    },
  })

  const canImportTrialBalance =
    subscription?.status === 'ACTIVE' &&
    (subscription.plan === 'BUSINESS' || subscription.plan === 'PRACTITIONER')

  const { data: deductions = [] } = useQuery({
    queryKey: ['deduction-suggestions', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DeductionSuggestion[]>>('/returns/deductions', {
        params: { taxYear },
      })
      return res.data.data
    },
  })

  const { data: incomeSummary = [] } = useQuery({
    queryKey: ['income-summary', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<IncomeSummary[]>>('/returns/income', {
        params: { taxYear },
      })
      return res.data.data
    },
  })

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    const grossVal = parseFloat(displayGross) || 0
    try {
      const res = await api.get('/pdf/itx-return', {
        params: {
          taxYear,
          ...(grossVal > 0 ? { grossIncome: grossVal } : {}),
          payeAlreadyPaid:           parseFloat(displayPaye)    || 0,
          pensionContributions:      parseFloat(displayPension)  || 0,
          medicalExpenses:           parseFloat(medical)         || 0,
          donationsToApprovedBodies: parseFloat(donations)       || 0,
          studyLoanInterest:         parseFloat(studyLoan)       || 0,
          otherDeductions:           parseFloat(otherDeductions) || 0,
        },
        responseType: 'blob',
      })
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `TaxFuse_ITX_${taxYear.replace('/', '-')}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not generate PDF. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const taxYearInt = parseInt('20' + taxYear.split('/')[1])

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Tax Returns</h1>
            <p className="page-subtitle">Your ITX return breakdown</p>
          </div>
          <div className="text-sm text-slate-500">
            Tax year: <span className="font-semibold text-navy">{taxYear}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — result */}
          <div className="lg:col-span-2 space-y-5">
            {/* Result */}
            {isLoading ? (
                <div className="card p-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
                </div>
            ) : isError ? (
                <div className="card p-8 text-center">
                  <AlertCircle size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No transaction data for {taxYear}</p>
                </div>
            ) : data ? (
                <>
                  <StatusBanner data={data} />
                  <BreakdownCard data={data} hasPaye5={hasPaye5} taxYear={taxYear} />
                </>
            ) : null}
          </div>

          {/* Right column — actions + deductions */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="card p-5 space-y-3">
              <h2 className="section-title">Actions</h2>

              <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf || !data}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Download size={15} />
                {downloadingPdf ? 'Generating PDF…' : 'Download ITX PDF'}
              </button>

              <Link
                  to={`/returns/itas?taxYear=${taxYearInt}`}
                  className="btn-teal w-full flex items-center justify-center gap-2 text-sm"
              >
                <Wand2 size={15} />
                Pre-fill ITAS Return
              </Link>

              {canImportTrialBalance && (
                <Link
                    to="/trial-balance"
                    className="btn-outline w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Scale size={15} />
                  Import Trial Balance
                </Link>
              )}

              <div className="pt-1 border-t border-slate-100">
                <button
                    onClick={() => setShowResetDialog(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm
                           text-red-500 hover:text-red-600 hover:bg-red-50
                           py-2.5 px-4 rounded-lg transition-colors font-medium"
                >
                  <Trash2 size={15} />
                  Reset Return
                </button>
              </div>
            </div>

            {/* Income from transactions */}
            {incomeSummary.length > 0 && (
                <div className="card p-5">
                  <h2 className="section-title flex items-center gap-2">
                    <TrendingUp size={16} className="text-teal" />
                    Income detected
                  </h2>
                  <div className="space-y-3 mt-3">
                    {incomeSummary.map((item) => (
                        <div key={item.category} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-navy">{item.displayName}</div>
                            <div className="text-xs text-slate-400">{item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}</div>
                          </div>
                          <div className="text-sm font-semibold text-teal-dark shrink-0">
                            {formatNAD(item.totalAmount)}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
            )}

            {/* Deduction suggestions */}
            {deductions.length > 0 && (
                <div className="card p-5">
                  <h2 className="section-title flex items-center gap-2">
                    <BadgeCheck size={16} className="text-teal" />
                    Deductions found
                  </h2>
                  <div className="space-y-3 mt-3">
                    {deductions.slice(0, 5).map((d) => (
                        <div key={d.category} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-navy">{d.displayName}</div>
                            <div className="text-xs text-slate-400">{d.itaReference}</div>
                          </div>
                          <div className="text-sm font-semibold text-teal-dark shrink-0">
                            {formatNAD(d.totalAmount)}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
            )}

            {/* Previous years */}
            <div className="card p-5">
              <h2 className="section-title">Previous years</h2>
              <div className="space-y-1">
                {TAX_YEARS.filter((y) => y !== taxYear).map((y) => (
                    <button
                        key={y}
                        onClick={() => setTaxYear(y)}
                        className="w-full flex items-center justify-between px-3 py-2.5
                             rounded-lg hover:bg-slate-50 transition-colors text-sm text-left"
                    >
                      <span className="text-slate-600">{y}</span>
                      <ArrowRight size={14} className="text-slate-300" />
                    </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Reset confirmation dialog */}
        {showResetDialog && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
                        flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-panel max-w-md w-full p-6 animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center
                              justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-navy text-lg">
                      Reset {taxYear} return?
                    </h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      This will permanently delete all <strong>transactions</strong> for
                      the <strong>{taxYear}</strong> tax year and reset your deductions
                      to zero. This cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                      onClick={() => setShowResetDialog(false)}
                      disabled={resetMutation.isPending}
                      className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 text-sm
                           font-medium py-2.5 px-4 rounded-lg
                           bg-red-500 text-white hover:bg-red-600
                           disabled:opacity-50 transition-colors"
                  >
                    {resetMutation.isPending ? (
                        <><RefreshCw size={15} className="animate-spin" /> Resetting…</>
                    ) : (
                        <><Trash2 size={15} /> Yes, reset return</>
                    )}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}

function StatusBanner({ data }: { data: TaxReturnModel }) {
  const isRefund    = data.status === 'REFUND'
  const isLiability = data.status === 'LIABILITY'

  return (
      <div className={clsx(
          'card p-6 border-2',
          isRefund    ? 'bg-teal/5 border-teal/30' :
              isLiability ? 'bg-coral/5 border-coral/30' : 'bg-navy/5 border-navy/20'
      )}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isRefund ? (
                  <TrendingUp size={18} className="text-teal" />
              ) : isLiability ? (
                  <TrendingDown size={18} className="text-coral" />
              ) : (
                  <Minus size={18} className="text-navy" />
              )}
              <span className={clsx(
                  'font-display font-semibold',
                  isRefund ? 'text-teal-dark' : isLiability ? 'text-coral' : 'text-navy'
              )}>
              {isRefund ? 'You are getting a refund' : isLiability ? 'Tax still owed' : 'All square'}
            </span>
            </div>
            <div className={clsx(
                'font-display text-4xl font-bold',
                isRefund ? 'text-teal-dark' : isLiability ? 'text-coral' : 'text-navy'
            )}>
              {formatNAD(data.refundOrLiability)}
            </div>
          </div>
          <div className="text-right text-sm text-slate-400">
            <div>Effective rate</div>
            <div className="font-semibold text-navy text-lg mt-0.5">
              {data.effectiveTaxRate.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
  )
}

function BreakdownCard({ data, hasPaye5 = false, taxYear }: { data: TaxReturnModel; hasPaye5?: boolean; taxYear: string }) {
  const [drill, setDrill] = useState<{ label: string; categories: string[] } | null>(null)

  const { data: allTxns = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Transaction[]>>('/statements')
      return res.data.data
    },
    staleTime: 60_000,
  })

  const hasBreakdown = data.salary != null
  const p5 = hasPaye5 ? ' (PAYE5)' : ''
  const provisionalTaxPaid = data.provisionalTaxPaid ?? 0
  const payePrepaidLabel = hasPaye5 && provisionalTaxPaid > 0
    ? 'Tax Prepaid (PAYE5 + Provisional)'
    : hasPaye5
      ? 'PAYE Already Paid (PAYE5)'
      : provisionalTaxPaid > 0
        ? 'Provisional Tax Paid'
        : 'PAYE Already Paid'

  type RowType = 'income-item' | 'income' | 'deduction-item' | 'deduction' | 'subtotal' | 'tax' | 'result'
  const rows: { label: string; value: number; type: RowType; categories?: string[] }[] = []

  if (hasBreakdown) {
    if ((data.salary         ?? 0) > 0) rows.push({ label: `Salary${p5}`,           value:  data.salary!,         type: 'income-item', categories: ['SALARY'] })
    if ((data.commission     ?? 0) > 0) rows.push({ label: 'Commission',             value:  data.commission!,     type: 'income-item', categories: ['COMMISSION'] })
    if ((data.freelanceIncome ?? 0) > 0) rows.push({ label: 'Freelance / Contract', value:  data.freelanceIncome!, type: 'income-item', categories: ['FREELANCE_INCOME'] })
    if ((data.rentalIncome   ?? 0) > 0) rows.push({ label: 'Rental Income',          value:  data.rentalIncome!,   type: 'income-item', categories: ['RENTAL_INCOME'] })
    if ((data.interestIncome ?? 0) > 0) rows.push({ label: 'Interest Income',        value:  data.interestIncome!, type: 'income-item', categories: ['INTEREST_INCOME'] })
    if ((data.businessIncome ?? 0) > 0) rows.push({ label: 'Business / Gratuity',   value:  data.businessIncome!, type: 'income-item', categories: ['BUSINESS_INCOME', 'GRATUITY'] })
    if ((data.allowanceIncome ?? 0) > 0) rows.push({ label: 'Allowances',            value:  data.allowanceIncome!,type: 'income-item', categories: ['ENTERTAINMENT_ALLOWANCE', 'VEHICLE_ALLOWANCE', 'SUBSISTENCE_ALLOWANCE', 'HOUSING_ALLOWANCE'] })
    if ((data.otherIncome    ?? 0) > 0) rows.push({ label: 'Other Income',           value:  data.otherIncome!,    type: 'income-item', categories: ['OTHER_INCOME'] })
  }

  rows.push({ label: hasBreakdown ? 'Total Income' : `Gross Income${p5}`, value: data.grossIncome, type: 'income' })

  if (data.pensionContributions      > 0) rows.push({ label: `Pension Contributions${p5}`, value: -data.pensionContributions,     type: 'deduction-item', categories: ['PENSION', 'PROVIDENT_FUND', 'RETIREMENT_ANNUITY'] })
  if (data.medicalExpenses           > 0) rows.push({ label: 'Medical Expenses',            value: -data.medicalExpenses,          type: 'deduction-item', categories: ['MEDICAL'] })
  if (data.donationsToApprovedBodies > 0) rows.push({ label: 'Donations',                   value: -data.donationsToApprovedBodies,type: 'deduction-item', categories: ['DONATIONS'] })
  if (data.studyLoanInterest         > 0) rows.push({ label: 'Study Loan Interest',         value: -data.studyLoanInterest,        type: 'deduction-item', categories: ['STUDY_LOAN'] })
  if (data.otherDeductions           > 0) rows.push({ label: 'Other Deductions',             value: -data.otherDeductions,          type: 'deduction-item', categories: ['HOME_OFFICE', 'PROFESSIONAL_FEES', 'VEHICLE_BUSINESS', 'TRAVEL_BUSINESS'] })

  rows.push({ label: 'Taxable Income',              value:  data.taxableIncome,    type: 'subtotal' })
  rows.push({ label: 'Gross Tax',                   value:  data.grossTax,         type: 'tax' })
  rows.push({ label: payePrepaidLabel,               value: -data.payeAlreadyPaid,  type: 'deduction' })
  rows.push({ label: 'Net Tax Payable',             value:  data.netTax,           type: 'subtotal' })
  rows.push({ label: 'Refund / (Tax Owed)',         value:  data.refundOrLiability,type: 'result' })

  const drillTxns = drill
    ? allTxns
        .filter((t) => t.taxYear === taxYear && drill.categories.includes(t.category ?? ''))
        .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))
    : []

  return (
    <>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="section-title mb-0">ITX breakdown</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {rows.map(({ label, value, type, categories }) => (
              <div
                  key={label}
                  className={clsx(
                      'flex items-center justify-between px-5 py-3',
                      (type === 'subtotal' || type === 'income') && 'bg-slate-50',
                      type === 'result'      && 'bg-navy/3 font-semibold',
                      type === 'income-item' && 'pl-8',
                      type === 'deduction-item' && 'pl-8',
                  )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={clsx(
                      'text-sm',
                      type === 'result'       ? 'text-navy font-semibold' :
                      type === 'income-item'  ? 'text-slate-500' :
                      type === 'deduction-item' ? 'text-slate-500' : 'text-slate-600'
                  )}>
                    {label}
                  </span>
                  {categories && (
                    <button
                        onClick={() => setDrill({ label, categories })}
                        className="text-slate-300 hover:text-teal transition-colors shrink-0"
                        title="View underlying transactions"
                    >
                      <Receipt size={13} />
                    </button>
                  )}
                </div>
                <span className={clsx(
                    'font-mono text-sm font-medium',
                    value < 0              ? 'text-coral' :
                    type === 'result'      ? (value >= 0 ? 'text-teal-dark' : 'text-coral') :
                    type === 'income-item' ? 'text-slate-600' :
                    type === 'income'      ? 'text-navy font-semibold' : 'text-slate-700'
                )}>
                  {value < 0 ? `(${formatNAD(Math.abs(value))})` : formatNAD(value)}
                </span>
              </div>
          ))}
        </div>
      </div>

      {drill && (
        <LineTransactionsModal
          label={drill.label}
          taxYear={taxYear}
          transactions={drillTxns}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  )
}

/** Prettify a TransactionCategory enum name, e.g. FREELANCE_INCOME → "Freelance Income". */
function prettyCategory(c?: string): string {
  if (!c) return 'Uncategorised'
  return c.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}

/** Modal listing the transactions that make up a single Return-breakdown line. */
function LineTransactionsModal({
  label, taxYear, transactions, onClose,
}: {
  label: string
  taxYear: string
  transactions: Transaction[]
  onClose: () => void
}) {
  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-panel max-w-lg w-full max-h-[80vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-navy truncate">{label}</h3>
            <p className="text-xs text-slate-400">{taxYear} · underlying transactions</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No matching transactions for {taxYear}.
            <div className="text-xs text-slate-400 mt-1.5">
              This amount may have been entered manually or taken from an uploaded certificate,
              rather than derived from classified transactions.
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto divide-y divide-slate-50">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm text-navy truncate">{t.description}</div>
                    <div className="text-xs text-slate-400">
                      {t.transactionDate} · {prettyCategory(t.category)}
                      {t.deductiblePercentage != null && t.deductiblePercentage !== 100 && (
                        <span> · {t.deductiblePercentage}% deductible</span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-slate-600 shrink-0">
                    {formatNAD(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs font-medium text-slate-500">
                {transactions.length} transaction{transactions.length === 1 ? '' : 's'}
              </span>
              <span className="font-mono text-sm font-semibold text-navy">{formatNAD(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}