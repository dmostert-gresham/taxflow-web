import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Shield, CheckCircle2, AlertCircle,
  RefreshCw, Clock, Save, Eye,
} from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse, Paye5Result } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TAX_YEARS = ['2025/26', '2024/25', '2023/24', '2022/23']

const OTHER_DOCS = [
  { emoji: '🧾', title: 'Receipts & Invoices',   desc: 'Upload expense receipts' },
  { emoji: '🏥', title: 'Medical Certificates',   desc: 'Medical aid statements' },
  { emoji: '🏦', title: 'Pension Certificates',   desc: 'Retirement fund statements' },
  { emoji: '📚', title: 'Study Loan Statements',  desc: 'Interest certificates' },
  { emoji: '❤️', title: 'Donation Receipts',      desc: 'Approved charity receipts' },
]

interface EditableValues {
  grossIncome:          string
  payeDeducted:         string
  pensionContributions: string
  medicalContributions: string
  employerTin:          string
}

const EMPTY_VALUES: EditableValues = {
  grossIncome:          '',
  payeDeducted:         '',
  pensionContributions: '',
  medicalContributions: '',
  employerTin:          '',
}

function toEditable(data: Partial<Paye5Result>): EditableValues {
  return {
    grossIncome:          data.grossIncome          != null ? String(data.grossIncome)          : '',
    payeDeducted:         data.payeDeducted         != null ? String(data.payeDeducted)         : '',
    pensionContributions: data.pensionContributions != null ? String(data.pensionContributions) : '',
    medicalContributions: data.medicalContributions != null ? String(data.medicalContributions) : '',
    employerTin:          data.employerTin          != null ? data.employerTin                  : '',
  }
}

function parseDecimal(val: string): number | null {
  const n = parseFloat(val.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

export default function DocumentsPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const fileRef      = useRef<HTMLInputElement>(null)

  const [taxYear, setTaxYear]         = useState(TAX_YEARS[0])
  const [uploading, setUploading]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [hasOcrResult, setHasOcrResult] = useState(false)
  const [error, setError]             = useState('')
  const [values, setValues]           = useState<EditableValues>(EMPTY_VALUES)

  // Load previously saved PAYE5 data for the selected tax year
  const { data: saved } = useQuery({
    queryKey: ['paye5', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paye5Result & { found: boolean; uploadedAt?: string }>>(
        `/documents/paye5?taxYear=${encodeURIComponent(taxYear)}`
      )
      return res.data.data
    },
  })

  // When saved data loads (or year changes), populate the form — but only if no fresh OCR result
  useEffect(() => {
    if (!hasOcrResult && saved?.found) {
      setValues(toEditable(saved))
    }
  }, [saved, hasOcrResult])

  const handleTaxYearChange = (year: string) => {
    setTaxYear(year)
    setHasOcrResult(false)
    setValues(EMPTY_VALUES)
    setError('')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('taxYear', taxYear)

    try {
      const res = await api.post<ApiResponse<Paye5Result>>('/documents/paye5', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = res.data.data
      if (data.success) {
        setValues(toEditable(data))
        setHasOcrResult(true)
        toast.success(`${data.fieldsFound} fields detected — review and save`)
        queryClient.invalidateQueries({ queryKey: ['paye5', taxYear] })
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/documents/paye5', {
        taxYear,
        grossIncome:          parseDecimal(values.grossIncome),
        payeDeducted:         parseDecimal(values.payeDeducted),
        pensionContributions: parseDecimal(values.pensionContributions),
        medicalContributions: parseDecimal(values.medicalContributions),
        employerTin:          values.employerTin.trim() || undefined,
      })
      toast.success('PAYE5 saved')
      setHasOcrResult(false)
      queryClient.invalidateQueries({ queryKey: ['paye5', taxYear] })
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePrefill = () => {
    const params = new URLSearchParams({ taxYear })
    const gross   = parseDecimal(values.grossIncome)
    const paye    = parseDecimal(values.payeDeducted)
    const pension = parseDecimal(values.pensionContributions)
    if (gross   != null) params.set('grossIncome', String(gross))
    if (paye    != null) params.set('paye',         String(paye))
    if (pension != null) params.set('pension',      String(pension))
    navigate(`/returns?${params}`)
  }

  const handleQuickView = async () => {
    try {
      const res = await api.get<Blob>(
        `/documents/paye5/file?taxYear=${encodeURIComponent(taxYear)}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank', 'noopener')
    } catch {
      toast.error('Could not load document')
    }
  }

  const hasValues = Object.values(values).some((v) => v !== '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">Upload your PAYE5 and other tax certificates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — PAYE5 upload */}
        <div className="lg:col-span-2 space-y-5">
          {/* Privacy notice */}
          <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 flex gap-3">
            <Shield size={16} className="text-teal shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Documents are processed offline on our secure server. Your files are
              never sent to external AI services.
            </p>
          </div>

          {/* Tax year + upload */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">PAYE5 Certificate</h2>
              <select
                value={taxYear}
                onChange={(e) => handleTaxYearChange(e.target.value)}
                className="input w-auto text-sm"
              >
                {TAX_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Upload your PAYE5 certificate. We'll extract the figures — you can
              correct anything before saving.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={clsx(
                'w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors',
                uploading
                  ? 'border-navy/20 bg-navy/3 cursor-wait'
                  : 'border-slate-200 hover:border-navy/30 hover:bg-slate-50 cursor-pointer'
              )}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw size={22} className="text-navy animate-spin" />
                  <span className="text-sm text-slate-500">Extracting data…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={22} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    {hasValues ? 'Re-upload PAYE5' : 'Click to upload PAYE5'}
                  </span>
                  <span className="text-xs text-slate-400">PNG, JPG or PDF</span>
                </div>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Editable values form — shown after OCR or when saved data exists */}
          {(hasValues || hasOcrResult) && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="section-title mb-0 flex items-center gap-2">
                  {hasOcrResult ? (
                    <>
                      <CheckCircle2 size={15} className="text-teal" />
                      Detected values — correct if needed
                    </>
                  ) : (
                    <>
                      <Clock size={15} className="text-slate-400" />
                      Saved PAYE5
                    </>
                  )}
                </h2>
                {!hasOcrResult && saved?.uploadedAt && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(saved.uploadedAt).toLocaleDateString('en-NA')}
                    </span>
                    {saved.hasFile && (
                      <button
                        onClick={handleQuickView}
                        className="btn-ghost py-1 px-2 text-xs flex items-center gap-1 text-navy"
                        title="View original document"
                      >
                        <Eye size={12} /> Quick view
                      </button>
                    )}
                  </div>
                )}
              </div>

              {hasOcrResult && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200
                               rounded-lg px-3 py-2 mb-4">
                  OCR detection can be inaccurate. Check each value against your
                  original PAYE5 before saving.
                </p>
              )}

              <div className="space-y-3 mt-4">
                {([
                  { key: 'grossIncome',          label: 'Gross Income' },
                  { key: 'payeDeducted',          label: 'PAYE Deducted' },
                  { key: 'pensionContributions',  label: 'Pension Contributions' },
                  { key: 'medicalContributions',  label: 'Medical Contributions' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-slate-600 w-48 shrink-0">{label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2
                                       text-slate-400 text-sm font-medium pointer-events-none">
                        N$
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={values[key]}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="input pl-9 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
                {/* Employer TIN — text field, no currency prefix */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 w-48 shrink-0">Employer TIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789"
                    value={values.employerTin}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, employerTin: e.target.value.replace(/\D/g, '') }))
                    }
                    maxLength={11}
                    className="input flex-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-teal flex items-center gap-2 flex-1"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save
                </button>
                <button
                  onClick={handlePrefill}
                  className="btn-outline flex-1"
                >
                  Pre-fill Tax Return
                </button>
              </div>
            </div>
          )}

          {/* No data yet */}
          {!hasValues && !hasOcrResult && !uploading && (
            <p className="text-sm text-slate-400 text-center py-2">
              No PAYE5 saved for {taxYear}. Upload one above.
            </p>
          )}
        </div>

        {/* Right — other documents */}
        <div className="card p-5">
          <h2 className="section-title">Other documents</h2>
          <p className="text-xs text-slate-400 mb-4">Coming soon</p>
          <div className="space-y-3">
            {OTHER_DOCS.map(({ emoji, title, desc }) => (
              <div key={title}
                   className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <span className="text-xl">{emoji}</span>
                <div>
                  <div className="text-sm font-medium text-navy">{title}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
                <span className="ml-auto badge-gray text-xs">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
