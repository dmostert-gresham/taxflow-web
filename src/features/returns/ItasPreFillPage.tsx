import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { apiLong, extractErrorMessage } from '../../api/client'
import type { ItasPreFillResponse } from '../../types'

type AccommodationType = 'OWN' | 'RENT' | 'EMPLOYER' | ''

export default function ItasPreFillPage() {
  const [searchParams]  = useSearchParams()
  const taxYearInt      = parseInt(searchParams.get('taxYear') ?? '2025')

  const [tin, setTin]         = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState<ItasPreFillResponse | null>(null)

  // Schedule 24 — residential accommodation
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('')
  const [ownerName, setOwnerName]       = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [ownerTin, setOwnerTin]         = useState('')
  const [ownerIdOrRegNo, setOwnerIdOrRegNo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const housing = accommodationType
      ? {
          accommodationType,
          ownerName:    ownerName    || undefined,
          ownerAddress: ownerAddress || undefined,
          ownerTin:     ownerTin     || undefined,
          ownerIdOrRegNo: ownerIdOrRegNo || undefined,
        }
      : undefined

    try {
      const res = await apiLong.post<ItasPreFillResponse>('/itas/prefill', {
        itasTin: tin.trim(),
        itasPassword: password,
        taxYear: taxYearInt,
        housing,
      })
      setResult(res.data)
      setPassword('') // clear immediately
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Pre-fill ITAS Return</h1>
        <p className="page-subtitle">
          Automatically fill your {taxYearInt} ITX return in ITAS and save as draft
        </p>
      </div>

      {!result ? (
        <>
          {/* Security notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Shield size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-blue-700">
                Your credentials are secure
              </div>
              <div className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                TaxFlow uses your ITAS credentials only to fill in the form on your behalf.
                They are never stored, logged, or shared. You review and submit yourself.
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="card p-6">
            <h2 className="section-title">Enter your ITAS credentials</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">ITAS TIN (Tax Identification Number)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 12345678"
                  value={tin}
                  onChange={(e) => setTin(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  pattern="\d{8,11}"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">8–11 digits</p>
              </div>

              <div>
                <label className="label">ITAS Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Your ITAS password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Schedule 24 — residential accommodation */}
              <div>
                <label className="label">Residential Accommodation (Schedule 24)</label>
                <div className="flex gap-4 mt-1">
                  {([
                    { value: 'OWN',      label: 'I own my home' },
                    { value: 'RENT',     label: 'I rent' },
                    { value: 'EMPLOYER', label: 'Employer-provided' },
                  ] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        name="accommodationType"
                        value={value}
                        checked={accommodationType === value}
                        onChange={() => setAccommodationType(value)}
                        className="accent-teal"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Optional — TaxFlow will fill Schedule 24 if provided.
                </p>
              </div>

              {/* Renter / employer-accommodation owner details */}
              {(accommodationType === 'RENT' || accommodationType === 'EMPLOYER') && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-slate-500 font-medium">Owner / Landlord details</p>

                  <div>
                    <label className="label">Owner Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. John Smith or ABC Properties CC"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Owner Address</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 12 Independence Ave, Windhoek"
                      value={ownerAddress}
                      onChange={(e) => setOwnerAddress(e.target.value)}
                    />
                  </div>

                  {accommodationType === 'RENT' && (
                    <>
                      <div>
                        <label className="label">Owner TIN</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Leave blank if unknown — TaxFlow will use 0"
                          value={ownerTin}
                          onChange={(e) => setOwnerTin(e.target.value.replace(/\D/g, ''))}
                          maxLength={11}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Per ITAS: enter 0 if you don't know the owner's TIN.
                        </p>
                      </div>

                      <div>
                        <label className="label">Owner ID / Company Reg Number</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. 85032700123 or CC/2010/1234"
                          value={ownerIdOrRegNo}
                          onChange={(e) => setOwnerIdOrRegNo(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3
                                text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-teal w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Filling in your return… (this may take 1–2 minutes)
                  </>
                ) : (
                  'Pre-fill My ITAS Return'
                )}
              </button>
            </form>
          </div>

          {/* What gets filled */}
          <div className="card p-5">
            <h2 className="section-title">What TaxFlow will fill in</h2>
            <ul className="space-y-2">
              {[
                'Schedule 3 — Revenue code, salary, employer TIN, employment period',
                'Schedule 3 — Pension / provident fund deductions',
                'Schedule 17 — PAYE tax deducted by employer',
                'Schedule 24 — Residential accommodation (if provided above)',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 size={15} className="text-teal shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-3">
              The return is saved as a draft in ITAS. You review and submit yourself.
            </p>
          </div>
        </>
      ) : (
        /* Success state */
        <div className="space-y-5">
          {/* Success banner */}
          <div className="bg-teal/5 border border-teal/30 rounded-xl p-4 flex gap-3">
            <CheckCircle2 size={18} className="text-teal shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-teal-dark">
                Return pre-filled and saved as draft in ITAS
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{result.message}</div>
            </div>
          </div>

          {/* Screenshot */}
          {result.screenshotBase64 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-navy">
                  Preview of your pre-filled return
                </h2>
              </div>
              <div className="p-4">
                <img
                  src={`data:image/png;base64,${result.screenshotBase64}`}
                  alt="Pre-filled ITAS return"
                  className="w-full rounded-lg border border-slate-200"
                />
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="card p-5 bg-amber-50 border-amber-200 border">
            <h2 className="section-title text-amber-800">
              Next steps to submit your return
            </h2>
            <ol className="space-y-2">
              {[
                'Log into ITAS at itas.namra.org.na',
                'Click Return in the top menu',
                'Select Drafts from the submenu',
                'Select Tax Type: Income Tax',
                'Select Return Type: Income Tax Return for Salaried Person/Pensioner/Other Individuals',
                'Your pre-filled return will appear — click it to open',
                'Review all values carefully against your PAYE5 certificate',
                'Make any corrections if needed',
                'Click Submit to file your return',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                  <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center
                                   justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setResult(null); setTin('');
                setAccommodationType(''); setOwnerName(''); setOwnerAddress('');
                setOwnerTin(''); setOwnerIdOrRegNo('');
              }}
              className="btn-outline flex-1"
            >
              Pre-fill Again
            </button>
            <a
              href="https://itas.namra.org.na/e-Portal"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              Open ITAS to Submit
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
