import { useState, useEffect } from 'react'
import { X, Upload, RefreshCw, AlertCircle } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse } from '../../types'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnRole = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'reference' | 'skip'

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'date',        label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount',      label: 'Amount' },
  { value: 'debit',       label: 'Debit' },
  { value: 'credit',      label: 'Credit' },
  { value: 'reference',   label: 'Reference' },
  { value: 'skip',        label: 'Skip' },
]

const ROLE_COLORS: Record<ColumnRole, string> = {
  date:        'border-teal     bg-teal/5     text-teal',
  description: 'border-navy     bg-navy/5     text-navy',
  amount:      'border-coral    bg-coral/5    text-coral',
  debit:       'border-red-400  bg-red-50     text-red-600',
  credit:      'border-green-400 bg-green-50  text-green-600',
  reference:   'border-blue-400 bg-blue-50    text-blue-600',
  skip:        'border-slate-200 bg-slate-50  text-slate-400',
}

const CELL_COLORS: Partial<Record<ColumnRole, string>> = {
  date:        'bg-teal/5',
  description: 'bg-navy/5',
  amount:      'bg-coral/5',
  debit:       'bg-red-50',
  credit:      'bg-green-50',
  reference:   'bg-blue-50',
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCsvRows(text: string, maxRows: number): string[][] {
  const result: string[][] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    if (result.length >= maxRows) break
    result.push(parseCsvLine(line))
  }
  return result
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      cols.push(cur.trim()); cur = ''
    } else {
      cur += c
    }
  }
  cols.push(cur.trim())
  return cols
}

// ─── Bank detection & preset mappings ────────────────────────────────────────

function detectBank(filename: string): string {
  const f = filename.toLowerCase()
  if (f.includes('fnb') || /^statement_3/.test(f)) return 'FNB'
  if (f.includes('bankwindhoek') || f.includes('bank_windhoek') || f.startsWith('bw')) return 'BANK_WINDHOEK'
  if (f.includes('standard')) return 'STANDARD_BANK'
  if (f.includes('nedbank'))  return 'NEDBANK'
  return 'UNKNOWN'
}

function buildPreset(bank: string, colCount: number): { roles: ColumnRole[]; headerRows: number } {
  const roles: ColumnRole[] = Array(colCount).fill('skip')
  const set = (i: number, r: ColumnRole) => { if (i < colCount) roles[i] = r }

  if (bank === 'FNB') {
    // Row 0: account meta, Row 1: column headers → skip 2
    // Cols: 0=date, 1=amount, 2=balance(skip), 3=description, 4=reference
    set(0, 'date'); set(1, 'amount'); set(3, 'description'); set(4, 'reference')
    return { roles, headerRows: 2 }
  }

  if (bank === 'BANK_WINDHOEK') {
    // Row 0: Statement Summary → skip 1
    // Data cols: 0=row-type(skip), 1=date, 5=description, 7=amount, 9=reference
    set(1, 'date'); set(5, 'description'); set(7, 'amount'); set(9, 'reference')
    return { roles, headerRows: 1 }
  }

  // Unknown: try to guess from header text (first row)
  return { roles, headerRows: 0 }
}

function guessRolesFromHeaders(
  firstRow: string[],
  currentRoles: ColumnRole[]
): ColumnRole[] {
  const roles = [...currentRoles]
  const already = (r: ColumnRole) => roles.includes(r)
  firstRow.forEach((cell, i) => {
    const v = cell.toLowerCase()
    if (!already('date')        && (v.includes('date') || v === 'dt'))                       roles[i] = 'date'
    else if (!already('description') && (v.includes('desc') || v.includes('narr') || v.includes('detail'))) roles[i] = 'description'
    else if (!already('amount')  && (v.includes('amount') || v === 'amt' || v.includes('value')))            roles[i] = 'amount'
    else if (!already('reference') && (v.includes('ref') || v.includes('id')))               roles[i] = 'reference'
  })
  return roles
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  file:      File
  onClose:   () => void
  onSuccess: (count: number) => void
}

export default function CsvImportModal({ file, onClose, onSuccess }: Props) {
  const [rows,        setRows]        = useState<string[][]>([])
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([])
  const [headerRows,  setHeaderRows]  = useState(0)
  const [detectedBank, setDetectedBank] = useState('UNKNOWN')
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsvRows(text, 10)
      setRows(parsed)

      const bank = detectBank(file.name)
      setDetectedBank(bank)

      const colCount = parsed.reduce((m, r) => Math.max(m, r.length), 0)
      let { roles, headerRows: hr } = buildPreset(bank, colCount)

      if (bank === 'UNKNOWN' && parsed.length > 0) {
        roles = guessRolesFromHeaders(parsed[0], roles)
        if (roles.some(r => r !== 'skip')) hr = 1
      }

      setColumnRoles(roles)
      setHeaderRows(hr)
    }
    reader.readAsText(file)
  }, [file])

  const setRole = (colIndex: number, role: ColumnRole) => {
    setColumnRoles(prev => {
      const next = [...prev]
      if (role !== 'skip') {
        for (let i = 0; i < next.length; i++) if (next[i] === role) next[i] = 'skip'
      }
      // amount and debit/credit are mutually exclusive modes
      if (role === 'amount') {
        for (let i = 0; i < next.length; i++)
          if (next[i] === 'debit' || next[i] === 'credit') next[i] = 'skip'
      } else if (role === 'debit' || role === 'credit') {
        for (let i = 0; i < next.length; i++)
          if (next[i] === 'amount') next[i] = 'skip'
      }
      next[colIndex] = role
      return next
    })
  }

  const dateCol   = columnRoles.indexOf('date')
  const descCol   = columnRoles.indexOf('description')
  const amtCol    = columnRoles.indexOf('amount')
  const debitCol  = columnRoles.indexOf('debit')
  const creditCol = columnRoles.indexOf('credit')
  const refCol    = columnRoles.indexOf('reference')
  const isValid = dateCol >= 0 && descCol >= 0 && (amtCol >= 0 || (debitCol >= 0 && creditCol >= 0))

  const handleImport = async () => {
    if (!isValid) return
    setIsImporting(true)
    try {
      const mapping = {
        dateColumn:        dateCol,
        descriptionColumn: descCol,
        amountColumn:      amtCol  >= 0 ? amtCol    : null,
        debitColumn:       debitCol  >= 0 ? debitCol  : null,
        creditColumn:      creditCol >= 0 ? creditCol : null,
        referenceColumn:   refCol >= 0 ? refCol : null,
        headerRows,
      }
      const formData = new FormData()
      formData.append('file',          file)
      formData.append('columnMapping', JSON.stringify(mapping))
      const res = await api.post<ApiResponse<{ count: number }>>(
        '/statements/upload', formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      onSuccess(res.data.data.count)
    } catch (err) {
      toast.error(extractErrorMessage(err))
      setIsImporting(false)
    }
  }

  const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-display font-bold text-navy text-lg">Map CSV Columns</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-md">{file.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 shrink-0"><X size={18} /></button>
        </div>

        {/* Controls bar */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-5 flex-wrap">
          {detectedBank !== 'UNKNOWN' && (
            <span className="badge-blue text-xs shrink-0">
              Auto-detected: {detectedBank.replace('_', ' ')}
            </span>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
            Header rows to skip:
            <select
              value={headerRows}
              onChange={(e) => setHeaderRows(Number(e.target.value))}
              className="input py-1 w-16 text-sm"
            >
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>

          {!isValid && rows.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle size={13} />
              Assign Date, Description and Amount (or Debit + Credit) to enable import
            </span>
          )}
        </div>

        {/* Preview table */}
        <div className="flex-1 overflow-auto p-6">
          {rows.length === 0 ? (
            <p className="text-slate-400 text-sm">Reading file…</p>
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0 min-w-max">
              <thead>
                {/* Role selector dropdowns */}
                <tr>
                  {Array.from({ length: colCount }).map((_, ci) => (
                    <th key={ci} className="pb-1.5 pr-2 align-top min-w-[110px]">
                      <select
                        value={columnRoles[ci] ?? 'skip'}
                        onChange={(e) => setRole(ci, e.target.value as ColumnRole)}
                        className={`w-full rounded-lg border px-2 py-1 font-semibold cursor-pointer
                          focus:outline-none focus:ring-1 focus:ring-navy/20
                          ${ROLE_COLORS[columnRoles[ci] ?? 'skip']}`}
                      >
                        {ROLE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
                {/* Column index row */}
                <tr>
                  {Array.from({ length: colCount }).map((_, ci) => (
                    <th key={ci} className="text-slate-400 font-normal pb-2 pr-2 text-left">
                      Col {ci}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, ri) => {
                  const isHeaderRow = ri < headerRows
                  return (
                    <tr key={ri} className={isHeaderRow ? 'opacity-35' : ''}>
                      {Array.from({ length: colCount }).map((_, ci) => (
                        <td
                          key={ci}
                          title={row[ci] ?? ''}
                          className={`pr-2 py-1.5 border-b border-slate-50 max-w-[160px] truncate
                            ${CELL_COLORS[columnRoles[ci] ?? 'skip'] ?? ''}`}
                        >
                          {row[ci] !== undefined && row[ci] !== ''
                            ? row[ci]
                            : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Greyed-out rows are treated as headers and will be skipped.
            Positive amounts = credits; negative = debits.
          </p>
          <div className="flex gap-3 shrink-0">
            <button onClick={onClose} className="btn-outline" disabled={isImporting}>
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!isValid || isImporting}
              className="btn-primary flex items-center gap-2"
            >
              {isImporting
                ? <><RefreshCw size={14} className="animate-spin" /> Importing…</>
                : <><Upload size={14} /> Import</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
