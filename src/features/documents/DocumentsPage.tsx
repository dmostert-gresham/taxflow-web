import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Shield, CheckCircle2, AlertCircle,
  RefreshCw, Clock, Save, Eye, Trash2,
} from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse, Paye5Result, TaxCertListResult, TaxCertItem, TaxCertUploadResult } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TAX_YEARS = ['2025/26', '2024/25', '2023/24', '2022/23']

interface EditableValues {
  grossIncome:          string
  payeDeducted:         string
  pensionContributions: string
  medicalContributions: string
  employerTin:          string
}

interface CertEdit {
  amount: string
  name:   string
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
  const queryClient  = useQueryClient()
  const fileRef      = useRef<HTMLInputElement>(null)

  const [taxYear, setTaxYear]           = useState(TAX_YEARS[0])
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [hasOcrResult, setHasOcrResult] = useState(false)
  const [error, setError]               = useState('')
  const [values, setValues]             = useState<EditableValues>(EMPTY_VALUES)

  // Pending cert edits lifted here so a single Save covers all sections
  const [retirementEdits, setRetirementEdits] = useState<Map<number, CertEdit>>(new Map())
  const [studyEdits, setStudyEdits]           = useState<Map<number, CertEdit>>(new Map())

  const { data: saved } = useQuery({
    queryKey: ['paye5', taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paye5Result & { found: boolean; uploadedAt?: string }>>(
        `/documents/paye5?taxYear=${encodeURIComponent(taxYear)}`
      )
      return res.data.data
    },
  })

  useEffect(() => {
    if (!hasOcrResult && saved?.found) {
      setValues(toEditable(saved))
    }
  }, [saved, hasOcrResult])

  const handleTaxYearChange = (year: string) => {
    setTaxYear(year)
    setHasOcrResult(false)
    setValues(EMPTY_VALUES)
    setRetirementEdits(new Map())
    setStudyEdits(new Map())
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
      const hasPaye5 = Object.values(values).some(v => v !== '')
      if (hasPaye5 || hasOcrResult) {
        await api.put('/documents/paye5', {
          taxYear,
          grossIncome:          parseDecimal(values.grossIncome),
          payeDeducted:         parseDecimal(values.payeDeducted),
          pensionContributions: parseDecimal(values.pensionContributions),
          medicalContributions: parseDecimal(values.medicalContributions),
          employerTin:          values.employerTin.trim() || undefined,
        })
        queryClient.invalidateQueries({ queryKey: ['paye5', taxYear] })
        setHasOcrResult(false)
      }

      for (const [id, edit] of retirementEdits) {
        await api.put(`/documents/retirement-fund/${id}`, {
          amount: parseDecimal(edit.amount),
          name:   edit.name.trim() || undefined,
        })
      }
      if (retirementEdits.size > 0) {
        queryClient.invalidateQueries({ queryKey: ['cert-retirement-fund', taxYear] })
        setRetirementEdits(new Map())
      }

      for (const [id, edit] of studyEdits) {
        await api.put(`/documents/study-policy/${id}`, {
          amount: parseDecimal(edit.amount),
          name:   edit.name.trim() || undefined,
        })
      }
      if (studyEdits.size > 0) {
        queryClient.invalidateQueries({ queryKey: ['cert-study-policy', taxYear] })
        setStudyEdits(new Map())
      }

      toast.success('Documents saved')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleQuickView = async () => {
    try {
      const res = await api.get<Blob>(
        `/documents/paye5/file?taxYear=${encodeURIComponent(taxYear)}`,
        { responseType: 'blob' }
      )
      window.open(URL.createObjectURL(res.data), '_blank', 'noopener')
    } catch {
      toast.error('Could not load document')
    }
  }

  const setCertEdit = (
    setter: React.Dispatch<React.SetStateAction<Map<number, CertEdit>>>
  ) => (id: number, field: 'amount' | 'name', value: string) => {
    setter(prev => {
      const next    = new Map(prev)
      const current = next.get(id) ?? { amount: '', name: '' }
      next.set(id, { ...current, [field]: value })
      return next
    })
  }

  const removeCertEdit = (
    setter: React.Dispatch<React.SetStateAction<Map<number, CertEdit>>>
  ) => (id: number) => {
    setter(prev => { const next = new Map(prev); next.delete(id); return next })
  }

  const hasValues = Object.values(values).some(v => v !== '')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Upload your tax certificates — TaxFuse extracts the figures via OCR</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={taxYear}
            onChange={(e) => handleTaxYearChange(e.target.value)}
            className="input w-auto text-sm"
          >
            {TAX_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-teal flex items-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 flex gap-3">
        <Shield size={16} className="text-teal shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600 leading-relaxed">
          Documents are processed offline on our secure server. Your files are
          never sent to external AI services.
        </p>
      </div>

      <div className="space-y-5">
        {/* PAYE5 — upload + values in one card */}
        <div className="card p-5">
          <h2 className="section-title mb-1">PAYE5 Certificate</h2>
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
              'w-full border-2 border-dashed rounded-xl p-4 text-center transition-colors',
              uploading
                ? 'border-navy/20 bg-navy/3 cursor-wait'
                : 'border-slate-200 hover:border-navy/30 hover:bg-slate-50 cursor-pointer'
            )}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="text-navy animate-spin" />
                <span className="text-sm text-slate-500">Extracting data…</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Upload size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {hasValues ? 'Re-upload PAYE5' : 'Upload PAYE5 certificate'}
                </span>
                <span className="text-xs text-slate-400">PNG, JPG or PDF</span>
              </div>
            )}
          </button>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {(hasValues || hasOcrResult) && (
            <div className="border-t border-slate-100 mt-4 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  {hasOcrResult ? (
                    <>
                      <CheckCircle2 size={14} className="text-teal" />
                      Detected values — correct if needed
                    </>
                  ) : (
                    <>
                      <Clock size={14} className="text-slate-400" />
                      Saved values
                    </>
                  )}
                </span>
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

              <div className="space-y-3">
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
            </div>
          )}

          {!hasValues && !hasOcrResult && !uploading && (
            <p className="text-sm text-slate-400 text-center py-2 mt-3">
              No PAYE5 saved for {taxYear}.
            </p>
          )}
        </div>

        <SimpleCertCard
          title="Certificate i.r.o Retirement Fund"
          apiPath="retirement-fund"
          queryKey="cert-retirement-fund"
          taxYear={taxYear}
          edits={retirementEdits}
          onEditChange={setCertEdit(setRetirementEdits)}
          onDeleted={removeCertEdit(setRetirementEdits)}
        />
        <SimpleCertCard
          title="Certificate i.r.o Study Policy"
          apiPath="study-policy"
          queryKey="cert-study-policy"
          taxYear={taxYear}
          edits={studyEdits}
          onEditChange={setCertEdit(setStudyEdits)}
          onDeleted={removeCertEdit(setStudyEdits)}
        />
      </div>
    </div>
  )
}

// ── SimpleCertCard ────────────────────────────────────────────────────────

interface SimpleCertCardProps {
  title:        string
  apiPath:      string
  queryKey:     string
  taxYear:      string
  edits:        Map<number, CertEdit>
  onEditChange: (id: number, field: 'amount' | 'name', value: string) => void
  onDeleted:    (id: number) => void
}

function SimpleCertCard({
  title, apiPath, queryKey, taxYear, edits, onEditChange, onDeleted,
}: SimpleCertCardProps) {
  const queryClient = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  const { data } = useQuery({
    queryKey: [queryKey, taxYear],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TaxCertListResult>>(
        `/documents/${apiPath}?taxYear=${encodeURIComponent(taxYear)}`
      )
      return res.data.data
    },
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taxYear', taxYear)
    try {
      const res = await api.post<ApiResponse<TaxCertUploadResult>>(
        `/documents/${apiPath}`, formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      const result = res.data.data
      if (result.success) {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: [queryKey, taxYear] })
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const items = data?.items ?? []

  // Live total reflects any pending edits
  const liveTotal = items.reduce((sum, item) => {
    const edit = edits.get(item.id)
    const raw  = edit?.amount ?? (item.amount != null ? String(item.amount) : '0')
    return sum + (parseFloat(raw.replace(/,/g, '')) || 0)
  }, 0)

  return (
    <div className="card p-5 space-y-4">
      <h2 className="section-title mb-0 text-sm leading-snug">{title}</h2>

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
          'w-full border-2 border-dashed rounded-xl p-3 text-center transition-colors',
          uploading
            ? 'border-navy/20 bg-navy/3 cursor-wait'
            : 'border-slate-200 hover:border-navy/30 hover:bg-slate-50 cursor-pointer'
        )}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw size={14} className="text-navy animate-spin" />
            <span className="text-xs text-slate-500">Processing…</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Upload certificate</span>
            <span className="text-[11px] text-slate-400">PNG, JPG, PDF</span>
          </div>
        )}
      </button>

      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const edit   = edits.get(item.id)
            const amount = edit?.amount ?? (item.amount != null ? String(item.amount) : '')
            const name   = edit?.name   ?? (item.name ?? '')
            return (
              <CertRow
                key={item.id}
                item={item}
                apiPath={apiPath}
                queryKey={queryKey}
                taxYear={taxYear}
                amount={amount}
                name={name}
                onAmountChange={(val) => onEditChange(item.id, 'amount', val)}
                onNameChange={(val)   => onEditChange(item.id, 'name',   val)}
                onDeleted={() => onDeleted(item.id)}
              />
            )
          })}

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Total</span>
            <span className="text-sm font-semibold text-navy font-mono">
              N$ {liveTotal.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {items.length === 0 && !uploading && (
        <p className="text-xs text-slate-400 text-center py-1">
          No certificates saved for {taxYear}.
        </p>
      )}
    </div>
  )
}

// ── CertRow ───────────────────────────────────────────────────────────────

interface CertRowProps {
  item:           TaxCertItem
  apiPath:        string
  queryKey:       string
  taxYear:        string
  amount:         string
  name:           string
  onAmountChange: (value: string) => void
  onNameChange:   (value: string) => void
  onDeleted:      () => void
}

function CertRow({
  item, apiPath, queryKey, taxYear,
  amount, name, onAmountChange, onNameChange, onDeleted,
}: CertRowProps) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/documents/${apiPath}/${item.id}`)
      toast.success('Deleted')
      onDeleted()
      queryClient.invalidateQueries({ queryKey: [queryKey, taxYear] })
    } catch (err) {
      toast.error(extractErrorMessage(err))
      setDeleting(false)
    }
  }

  const handleView = async () => {
    try {
      const res = await api.get<Blob>(
        `/documents/${apiPath}/${item.id}/file`,
        { responseType: 'blob' }
      )
      window.open(URL.createObjectURL(res.data), '_blank', 'noopener')
    } catch {
      toast.error('Could not load document')
    }
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Policy label (optional)"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="input text-xs py-1.5 flex-1 min-w-0"
        />
        {item.hasFile && (
          <button
            onClick={handleView}
            className="btn-ghost p-1.5 text-navy shrink-0"
            title="View document"
          >
            <Eye size={12} />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 shrink-0"
          title="Delete"
        >
          {deleting
            ? <RefreshCw size={12} className="animate-spin" />
            : <Trash2 size={12} />}
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
          N$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="input pl-8 font-mono text-xs w-full py-1.5"
        />
      </div>

      {item.uploadedAt && (
        <p className="text-[11px] text-slate-400">
          Saved {new Date(item.uploadedAt).toLocaleDateString('en-NA')}
        </p>
      )}
    </div>
  )
}
