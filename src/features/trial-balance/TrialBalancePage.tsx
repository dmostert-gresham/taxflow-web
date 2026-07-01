import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, RefreshCw, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api, formatNAD, extractErrorMessage } from '../../api/client'
import type { ApiResponse, TrialBalanceResult, CITCalculation } from '../../types'
import { useTaxYearStore } from '../../stores/taxYearStore'
import toast from 'react-hot-toast'

const TAX_LINES  = [
  'TRADING_INCOME', 'SERVICE_INCOME', 'OTHER_INCOME',
  'COST_OF_SALES', 'SALARIES_AND_WAGES', 'RENT_EXPENSE',
  'VEHICLE_EXPENSES', 'DEPRECIATION', 'PROFESSIONAL_FEES',
  'BANK_CHARGES', 'NON_DEDUCTIBLE_EXPENSE', 'CAPITAL_ACCOUNT',
]

export default function TrialBalancePage() {
  const fileRef    = useRef<HTMLInputElement>(null)
  const taxYear = useTaxYearStore((s) => s.taxYear)
  const [accounts, setAccounts] = useState<TrialBalanceResult['accounts']>([])
  const [cit, setCit] = useState<CITCalculation | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('taxYear', taxYear)
      const res = await api.post<ApiResponse<TrialBalanceResult>>(
        '/trial-balance/import', formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return res.data.data
    },
    onSuccess: (data) => {
      setAccounts(data.accounts)
      setStep(2)
      toast.success(`${data.accounts.length} accounts imported`)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  // Calculate CIT mutation
  const calcMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<CITCalculation>>(
        '/trial-balance/calculate',
        { taxYear, accounts }
      )
      return res.data.data
    },
    onSuccess: (data) => {
      setCit(data)
      setStep(3)
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const updateMapping = (index: number, taxLine: string) => {
    setAccounts((prev) =>
      prev.map((a, i) => i === index ? { ...a, mappedTaxLine: taxLine } : a)
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Trial Balance Import</h1>
        <p className="page-subtitle">Import your accountant's trial balance and calculate CIT</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['Import CSV', 'Review Mappings', 'Calculate CIT'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
              ${step > i + 1 ? 'bg-teal/10 text-teal-dark' :
                step === i + 1 ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > i + 1 ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < 2 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Upload Trial Balance CSV</h2>
          <p className="text-sm text-slate-500">
            Export a Trial Balance CSV from Pastel, Sage or any accounting package.
            Required columns: Account Code, Account Name, Debit, Credit.
          </p>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Tax year: <span className="font-semibold text-navy">{taxYear}</span>
            </span>

            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {importMutation.isPending ? (
                <><RefreshCw size={15} className="animate-spin" /> Importing…</>
              ) : (
                <><Upload size={15} /> Upload CSV</>
              )}
            </button>
          </div>

          {/* Sample format */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Expected CSV format:</p>
            <pre className="text-xs text-slate-600 font-mono">
{`Account Code,Account Name,Debit,Credit
4000,Sales Revenue,,450000.00
5000,Cost of Goods Sold,180000.00,
6000,Salaries and Wages,95000.00,`}
            </pre>
          </div>
        </div>
      )}

      {/* Step 2 — Review mappings */}
      {step === 2 && accounts.length > 0 && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="section-title mb-0">Review tax line mappings</h2>
              <p className="text-xs text-slate-400">
                Adjust any incorrect AI suggestions
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="table-header text-left">Code</th>
                  <th className="table-header text-left">Account Name</th>
                  <th className="table-header text-right">Debit</th>
                  <th className="table-header text-right">Credit</th>
                  <th className="table-header text-left">Tax Line</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="table-cell font-mono text-xs text-slate-400">{acc.accountCode}</td>
                    <td className="table-cell text-navy">{acc.accountName}</td>
                    <td className="table-cell text-right font-mono text-sm text-slate-600">
                      {acc.debit > 0 ? formatNAD(acc.debit) : '—'}
                    </td>
                    <td className="table-cell text-right font-mono text-sm text-slate-600">
                      {acc.credit > 0 ? formatNAD(acc.credit) : '—'}
                    </td>
                    <td className="table-cell">
                      <select
                        value={acc.mappedTaxLine ?? acc.suggestedTaxLine ?? ''}
                        onChange={(e) => updateMapping(i, e.target.value)}
                        className="input text-xs py-1.5 w-full"
                      >
                        <option value="">— Select —</option>
                        {TAX_LINES.map((tl) => (
                          <option key={tl} value={tl}>{tl.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline">
              ← Back
            </button>
            <button
              onClick={() => calcMutation.mutate()}
              disabled={calcMutation.isPending}
              className="btn-teal flex items-center gap-2"
            >
              {calcMutation.isPending ? (
                <><RefreshCw size={15} className="animate-spin" /> Calculating…</>
              ) : (
                <><Calculator size={15} /> Calculate CIT</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — CIT result */}
      {step === 3 && cit && (
        <div className="space-y-4">
          {/* Result banner */}
          <div className="card p-6 bg-navy/3 border-navy/10 border-2">
            <div className="text-slate-500 text-sm">Estimated CIT Payable</div>
            <div className="font-display text-4xl font-bold text-navy mt-1">
              {formatNAD(cit.citPayable)}
            </div>
            <div className="text-slate-400 text-xs mt-1.5">
              {cit.effectiveRate.toFixed(1)}% effective rate · {taxYear}
            </div>
          </div>

          {/* Breakdown */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="section-title mb-0">CIT breakdown</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: 'Gross Income',      value: cit.grossIncome },
                { label: 'Total Deductions',  value: -cit.totalDeductions },
                { label: 'Taxable Profit',    value: cit.taxableProfit },
                { label: 'CIT Payable (32%)', value: cit.citPayable },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-5 py-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-mono font-medium text-navy">
                    {value < 0 ? `(${formatNAD(Math.abs(value))})` : formatNAD(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              This is an estimate based on the standard 32% CIT rate under ITA s23.
              Consult a registered tax practitioner to verify before filing.
            </p>
          </div>

          <button onClick={() => { setStep(1); setAccounts([]); setCit(null) }}
                  className="btn-outline">
            ← Start over
          </button>
        </div>
      )}
    </div>
  )
}
