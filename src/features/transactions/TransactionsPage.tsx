import { useState, useRef, useEffect } from 'react'
import CsvImportModal from './CsvImportModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Zap, RefreshCw, AlertCircle,
  CheckCircle2, Clock, TrendingUp, TrendingDown, Pencil, X, Check,
  Filter, ChevronDown, ChevronRight, Trash2, Search, SlidersHorizontal,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { api, formatNAD, extractErrorMessage } from '../../api/client'
import type { ApiResponse, Transaction } from '../../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string; hex: string; group: string }> = {
  // ── Income ────────────────────────────────────────────────────────────────
  SALARY:              { label: 'Salary',               color: 'badge-green',  emoji: '💼', hex: '#00C896', group: 'Income' },
  COMMISSION:          { label: 'Commission',           color: 'badge-green',  emoji: '💰', hex: '#00B085', group: 'Income' },
  FREELANCE_INCOME:    { label: 'Freelance',            color: 'badge-green',  emoji: '💻', hex: '#00A87E', group: 'Income' },
  RENTAL_INCOME:       { label: 'Rental Income',        color: 'badge-green',  emoji: '🏠', hex: '#00E0AA', group: 'Income' },
  INTEREST_INCOME:     { label: 'Interest Income',      color: 'badge-green',  emoji: '📈', hex: '#5EDDB8', group: 'Income' },
  BUSINESS_INCOME:     { label: 'Business Income',      color: 'badge-green',  emoji: '🏢', hex: '#3DCCA0', group: 'Income' },
  GRATUITY:            { label: 'Gratuity / Bonus',     color: 'badge-green',  emoji: '🎁', hex: '#70D9B8', group: 'Income' },
  OTHER_INCOME:        { label: 'Other Income',         color: 'badge-green',  emoji: '💵', hex: '#90E0C8', group: 'Income' },

  // ── Allowances (Schedule 3) ───────────────────────────────────────────────
  ENTERTAINMENT_ALLOWANCE: { label: 'Entertainment Allow.', color: 'badge-blue', emoji: '🍽️', hex: '#4D9FD6', group: 'Allowances' },
  VEHICLE_ALLOWANCE:       { label: 'Vehicle Allowance',    color: 'badge-blue', emoji: '🚗', hex: '#5B9FBF', group: 'Allowances' },
  SUBSISTENCE_ALLOWANCE:   { label: 'Subsistence Allow.',   color: 'badge-blue', emoji: '🧳', hex: '#3D8FAF', group: 'Allowances' },
  HOUSING_ALLOWANCE:       { label: 'Housing Allowance',    color: 'badge-blue', emoji: '🏘️', hex: '#6AAED6', group: 'Allowances' },

  // ── Deductible (Schedule 3) ───────────────────────────────────────────────
  PENSION:             { label: 'Pension Fund',          color: 'badge-blue',   emoji: '🛡️', hex: '#1A5C9C', group: 'Deductions' },
  PROVIDENT_FUND:      { label: 'Provident Fund',        color: 'badge-blue',   emoji: '🏛️', hex: '#2A6CA8', group: 'Deductions' },
  RETIREMENT_ANNUITY:  { label: 'Retirement Annuity',    color: 'badge-blue',   emoji: '📊', hex: '#3A7CB8', group: 'Deductions' },
  STUDY_POLICY:        { label: 'Study Policy',          color: 'badge-blue',   emoji: '🎓', hex: '#5090C8', group: 'Deductions' },
  STUDY_LOAN:          { label: 'Study Loan Interest',   color: 'badge-blue',   emoji: '📚', hex: '#60A0D8', group: 'Deductions' },
  MEDICAL:             { label: 'Medical',               color: 'badge-blue',   emoji: '🏥', hex: '#2E75B6', group: 'Deductions' },
  DONATIONS:           { label: 'Donations',             color: 'badge-blue',   emoji: '❤️', hex: '#7BBFE8', group: 'Deductions' },
  HOME_OFFICE:         { label: 'Home Office',           color: 'badge-blue',   emoji: '🏡', hex: '#A8D5F5', group: 'Deductions' },
  PROFESSIONAL_FEES:   { label: 'Professional Fees',     color: 'badge-blue',   emoji: '⚖️', hex: '#6AAED6', group: 'Deductions' },
  VEHICLE_BUSINESS:    { label: 'Vehicle (Business)',    color: 'badge-blue',   emoji: '🚘', hex: '#4A8FC0', group: 'Deductions' },
  TRAVEL_BUSINESS:     { label: 'Travel (Business)',     color: 'badge-blue',   emoji: '✈️', hex: '#3A7FAF', group: 'Deductions' },

  // ── Personal / Non-deductible ─────────────────────────────────────────────
  GROCERIES:           { label: 'Groceries',             color: 'badge-gray',   emoji: '🛒', hex: '#94A3B8', group: 'Personal' },
  FUEL:                { label: 'Fuel',                  color: 'badge-gray',   emoji: '⛽', hex: '#7D8FA3', group: 'Personal' },
  UTILITIES:           { label: 'Utilities',             color: 'badge-gray',   emoji: '💡', hex: '#B0BEC5', group: 'Personal' },
  INSURANCE:           { label: 'Insurance',             color: 'badge-gray',   emoji: '🔒', hex: '#AABCCC', group: 'Personal' },
  CLOTHING:            { label: 'Clothing',              color: 'badge-gray',   emoji: '👕', hex: '#C0CCDA', group: 'Personal' },
  TRANSPORT:           { label: 'Transport',             color: 'badge-gray',   emoji: '🚌', hex: '#B8C8D8', group: 'Personal' },
  ENTERTAINMENT:       { label: 'Entertainment',         color: 'badge-gray',   emoji: '🎬', hex: '#AABBC8', group: 'Personal' },
  BANK_CHARGES:        { label: 'Bank Charges',          color: 'badge-gray',   emoji: '🏦', hex: '#CFD8DC', group: 'Personal' },
  CASH_WITHDRAWAL:     { label: 'Cash Withdrawal',       color: 'badge-gray',   emoji: '💵', hex: '#D0DCE8', group: 'Personal' },
  SAVINGS_TRANSFER:    { label: 'Savings Transfer',      color: 'badge-gray',   emoji: '💾', hex: '#C5D5E5', group: 'Personal' },

  // ── Tax ───────────────────────────────────────────────────────────────────
  TAX_PAYE:            { label: 'PAYE Tax',              color: 'badge-orange', emoji: '🏛️', hex: '#FF8C55', group: 'Tax' },
  TAX_PROVISIONAL:     { label: 'Provisional Tax',       color: 'badge-orange', emoji: '📋', hex: '#FF7A40', group: 'Tax' },
  TAX_VAT:             { label: 'VAT',                   color: 'badge-orange', emoji: '📑', hex: '#FF9966', group: 'Tax' },

  // ── Assets / Loans ───────────────────────────────────────────────────────
  LOAN_ISSUED:             { label: 'Loan Issued',             color: 'badge-gray', emoji: '🤝', hex: '#8896A8', group: 'Assets' },
  LOAN_REPAYMENT_RECEIVED: { label: 'Loan Repayment Received', color: 'badge-gray', emoji: '↩️', hex: '#A0B0C0', group: 'Assets' },

  // ── Fallback ──────────────────────────────────────────────────────────────
  OTHER:               { label: 'Other',                 color: 'badge-orange', emoji: '❓', hex: '#FF6B35', group: 'Other' },
}

// Categories that TaxReturnService actually uses in the calculation
const TAX_RELEVANT_CATEGORIES = new Set([
  'SALARY', 'COMMISSION', 'FREELANCE_INCOME', 'RENTAL_INCOME',
  'INTEREST_INCOME', 'BUSINESS_INCOME', 'GRATUITY',
  'ENTERTAINMENT_ALLOWANCE', 'VEHICLE_ALLOWANCE', 'SUBSISTENCE_ALLOWANCE', 'HOUSING_ALLOWANCE',
  'PENSION', 'PROVIDENT_FUND', 'RETIREMENT_ANNUITY',
  'STUDY_POLICY', 'STUDY_LOAN',
  'MEDICAL', 'DONATIONS',
  'HOME_OFFICE', 'PROFESSIONAL_FEES', 'VEHICLE_BUSINESS', 'TRAVEL_BUSINESS',
])

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG)

// Categories whose amount feeds a deduction on the return, and so support an
// adjustable deductible percentage (e.g. 60% business use of a vehicle).
const DEDUCTIBLE_CATEGORIES = new Set([
  'PENSION', 'PROVIDENT_FUND', 'RETIREMENT_ANNUITY',
  'STUDY_POLICY', 'STUDY_LOAN',
  'MEDICAL', 'DONATIONS',
  'HOME_OFFICE', 'PROFESSIONAL_FEES', 'VEHICLE_BUSINESS', 'TRAVEL_BUSINESS',
])

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span className="badge-gray">Unclassified</span>
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.OTHER
  return <span className={cfg.color}>{cfg.emoji} {cfg.label}</span>
}

// ─── Pie chart ────────────────────────────────────────────────────────────────

function CategoryPieChart({ transactions }: { transactions: Transaction[] }) {
  const classified = transactions.filter((t) => t.category)

  if (classified.length === 0) return null

  const grouped = classified.reduce<Record<string, number>>((acc, tx) => {
    const cat = tx.category!
    acc[cat] = (acc[cat] ?? 0) + Math.abs(tx.amount)
    return acc
  }, {})

  const data = Object.entries(grouped)
      .map(([cat, value]) => ({
        name: CATEGORY_CONFIG[cat]?.label ?? cat,
        value,
        category: cat,
        hex: CATEGORY_CONFIG[cat]?.hex ?? '#94A3B8',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-panel text-sm">
          <div className="font-semibold text-navy">{d.name}</div>
          <div className="text-slate-500 text-xs mt-0.5">{formatNAD(d.value)}</div>
        </div>
    )
  }

  const CustomLegend = () => (
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {data.map((d) => (
            <div key={d.category} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.hex }} />
              <span className="truncate">{d.name}</span>
            </div>
        ))}
      </div>
  )

  return (
      <div className="card p-5">
        <h2 className="section-title">Spending breakdown</h2>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-full lg:w-64 h-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                >
                  {data.map((entry) => (
                      <Cell key={entry.category} fill={entry.hex} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full">
            <CustomLegend />
          </div>
        </div>
      </div>
  )
}

// ─── Inline category editor ───────────────────────────────────────────────────

function CategoryCell({
                        transaction,
                        onSave,
                      }: {
  transaction: Transaction
  onSave: (id: number, category: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(transaction.category ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selected || selected === transaction.category) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(transaction.id, selected)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
        <div className="flex items-center gap-1.5">
          <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="input text-xs py-1 flex-1"
              autoFocus
          >
            <option value="">— Select category —</option>
            {Object.entries(
                ALL_CATEGORIES.reduce<Record<string, string[]>>((groups, cat) => {
                  const group = CATEGORY_CONFIG[cat]?.group ?? 'Other'
                  if (!groups[group]) groups[group] = []
                  groups[group].push(cat)
                  return groups
                }, {})
            ).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_CONFIG[cat]?.emoji} {CATEGORY_CONFIG[cat]?.label ?? cat}
                      </option>
                  ))}
                </optgroup>
            ))}
          </select>
          <button
              onClick={handleSave}
              disabled={saving}
              className="w-6 h-6 rounded bg-teal text-white flex items-center
                     justify-center hover:bg-teal-light transition-colors"
          >
            {saving ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
          </button>
          <button
              onClick={() => { setEditing(false); setSelected(transaction.category ?? '') }}
              className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center
                     justify-center hover:bg-slate-200 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
    )
  }

  return (
      <div className="flex items-center gap-1.5 group">
        <CategoryBadge category={transaction.category} />
        <button
            onClick={() => setEditing(true)}
            className="w-5 h-5 rounded text-slate-300 hover:text-slate-500
                   hover:bg-slate-100 flex items-center justify-center
                   opacity-0 group-hover:opacity-100 transition-all"
            title="Change category"
        >
          <Pencil size={10} />
        </button>
      </div>
  )
}

// ─── Deductible percentage cell (inline edit) ────────────────────────────────

function DeductibleCell({
  transaction,
  onSave,
}: {
  transaction: Transaction
  onSave: (id: number, pct: number) => Promise<void>
}) {
  const current = transaction.deductiblePercentage ?? 100
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(String(current))
  const [saving, setSaving]   = useState(false)

  // Only deductible-category transactions feed a deduction on the return.
  if (!transaction.category || !DEDUCTIBLE_CATEGORIES.has(transaction.category)) {
    return <span className="text-slate-300 text-xs">—</span>
  }

  const handleSave = async () => {
    const pct = Number(value)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setValue(String(current))
      setEditing(false)
      return
    }
    if (pct === current) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(transaction.id, pct)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          className="input text-xs py-1 w-16 text-right"
          autoFocus
        />
        <span className="text-slate-400 text-xs">%</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-6 h-6 rounded bg-teal text-white flex items-center
                     justify-center hover:bg-teal-light transition-colors"
        >
          {saving ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button
          onClick={() => { setEditing(false); setValue(String(current)) }}
          className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center
                     justify-center hover:bg-slate-200 transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <span className={clsx(
        'font-mono text-sm tabular-nums',
        current < 100 ? 'text-coral font-medium' : 'text-slate-600',
      )}>
        {current}%
      </span>
      <button
        onClick={() => setEditing(true)}
        className="w-5 h-5 rounded text-slate-300 hover:text-slate-500
                   hover:bg-slate-100 flex items-center justify-center
                   opacity-0 group-hover:opacity-100 transition-all"
        title="Set deductible percentage"
      >
        <Pencil size={10} />
      </button>
    </div>
  )
}

// ─── Transaction row with inline delete confirm ───────────────────────────────

function TransactionRow({
  tx,
  selected,
  onToggle,
  onSave,
  onSavePercentage,
  onDelete,
}: {
  tx: Transaction
  selected: boolean
  onToggle: (id: number) => void
  onSave: (id: number, category: string) => Promise<void>
  onSavePercentage: (id: number, pct: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(tx.id)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <tr className={clsx('transition-colors group', selected ? 'bg-teal/5' : 'hover:bg-slate-50')}>
      <td className="table-cell w-px" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(tx.id)}
          className="w-3.5 h-3.5 accent-teal cursor-pointer"
        />
      </td>
      <td className="table-cell text-slate-500 text-xs whitespace-nowrap">
        {new Date(tx.transactionDate).toLocaleDateString('en-NA', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </td>
      <td className="table-cell max-w-xs">
        <span className="truncate block text-navy">{tx.description}</span>
      </td>
      <td className="table-cell">
        <CategoryCell transaction={tx} onSave={onSave} />
      </td>
      <td className="table-cell">
        <DeductibleCell transaction={tx} onSave={onSavePercentage} />
      </td>
      <td className="table-cell text-right whitespace-nowrap">
        <span className={clsx(
          'font-mono text-sm font-medium',
          tx.transactionType === 'CREDIT' ? 'text-teal-dark' : 'text-slate-700'
        )}>
          {tx.transactionType === 'CREDIT' ? '+' : '-'}
          {formatNAD(Math.abs(tx.amount))}
        </span>
      </td>
      <td className="table-cell">
        {tx.transactionType === 'CREDIT' ? (
          <span className="flex items-center gap-1 text-teal-dark text-xs">
            <TrendingUp size={12} /> Credit
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <TrendingDown size={12} /> Debit
          </span>
        )}
      </td>
      <td className="table-cell w-px">
        {confirming ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 whitespace-nowrap">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-6 h-6 rounded bg-coral text-white flex items-center
                         justify-center hover:bg-red-600 transition-colors"
            >
              {deleting
                ? <RefreshCw size={10} className="animate-spin" />
                : <Check size={10} />}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center
                         justify-center hover:bg-slate-200 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-6 h-6 rounded text-slate-300 hover:text-coral hover:bg-red-50
                       flex items-center justify-center opacity-0 group-hover:opacity-100
                       transition-all"
            title="Remove transaction"
          >
            <Trash2 size={12} />
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Year group section ───────────────────────────────────────────────────────

function YearSection({
  taxYear,
  transactions,
  selectedIds,
  onToggle,
  onToggleYear,
  onSave,
  onSavePercentage,
  onDelete,
}: {
  taxYear: string
  transactions: Transaction[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  onToggleYear: (ids: number[], checked: boolean) => void
  onSave: (id: number, category: string) => Promise<void>
  onSavePercentage: (id: number, pct: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const yearIds       = transactions.map((t) => t.id)
  const selectedCount = yearIds.filter((id) => selectedIds.has(id)).length
  const allSelected   = selectedCount === yearIds.length && yearIds.length > 0
  const someSelected  = selectedCount > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-slate-50 border-b border-slate-100 hover:bg-slate-100
                   transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight size={15} className="text-slate-400" />
            : <ChevronDown  size={15} className="text-slate-400" />}
          <span className="font-semibold text-navy text-sm">{taxYear}</span>
          <span className="text-slate-400 text-xs">{transactions.length} transactions</span>
          {selectedCount > 0 && (
            <span className="text-xs bg-teal/10 text-teal px-1.5 py-0.5 rounded-full font-medium">
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="text-teal-dark font-medium">
            +{formatNAD(transactions
                .filter((t) => t.transactionType === 'CREDIT')
                .reduce((s, t) => s + Math.abs(t.amount), 0))}
          </span>
          <span className="text-slate-400">
            -{formatNAD(transactions
                .filter((t) => t.transactionType === 'DEBIT')
                .reduce((s, t) => s + Math.abs(t.amount), 0))}
          </span>
        </div>
      </button>

      {!collapsed && (
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="table-header w-px" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={(e) => onToggleYear(yearIds, e.target.checked)}
                  className="w-3.5 h-3.5 accent-teal cursor-pointer"
                />
              </th>
              <th className="table-header text-left">Date</th>
              <th className="table-header text-left">Description</th>
              <th className="table-header text-left">
                Category
                <span className="text-slate-300 font-normal ml-1.5 text-xs">hover to edit</span>
              </th>
              <th className="table-header text-left whitespace-nowrap">Deductible %</th>
              <th className="table-header text-right">Amount</th>
              <th className="table-header text-left">Type</th>
              <th className="table-header" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                selected={selectedIds.has(tx.id)}
                onToggle={onToggle}
                onSave={onSave}
                onSavePercentage={onSavePercentage}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [importFile,    setImportFile]    = useState<File | null>(null)
  const [taxOnly,       setTaxOnly]       = useState(false)
  const [selectedIds,   setSelectedIds]   = useState<Set<number>>(() => new Set())
  const [bulkCategory,  setBulkCategory]  = useState('')
  const [bulkPercentage, setBulkPercentage] = useState('')
  const [showFilters,   setShowFilters]   = useState(false)
  const [filterText,    setFilterText]    = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType,    setFilterType]    = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,  setFilterDateTo]  = useState('')
  const [filterAmtMin,  setFilterAmtMin]  = useState('')
  const [filterAmtMax,  setFilterAmtMax]  = useState('')

  const clearFilters = () => {
    setFilterText(''); setFilterCategory(''); setFilterType('ALL')
    setFilterDateFrom(''); setFilterDateTo('')
    setFilterAmtMin(''); setFilterAmtMax('')
  }
  const activeFilterCount = [
    filterText, filterCategory,
    filterType !== 'ALL',
    filterDateFrom, filterDateTo,
    filterAmtMin, filterAmtMax,
  ].filter(Boolean).length

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Transaction[]>>('/statements')
      return res.data.data
    },
  })

  const [classifyTotal, setClassifyTotal] = useState(0)

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ classified: number }>>(
          '/statements/classify', null
      )
      return res.data.data
    },
    onMutate: () => setClassifyTotal(rawCount),
    onSuccess: (data) => {
      toast.success(`${data.classified} transactions classified`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const { data: pendingCount } = useQuery({
    queryKey: ['classify-pending'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ pending: number }>>('/statements/classify/pending')
      return res.data.data.pending
    },
    refetchInterval: classifyMutation.isPending ? 2000 : false,
    enabled: classifyMutation.isPending,
  })

  const classifyDone     = classifyTotal > 0 ? classifyTotal - (pendingCount ?? classifyTotal) : 0
  const classifyProgress = classifyTotal > 0 ? Math.round((classifyDone / classifyTotal) * 100) : 0

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileRef.current) fileRef.current.value = ''
    setImportFile(file)
  }

  const handleImportSuccess = (count: number) => {
    toast.success(`${count} transactions imported`)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    classifyMutation.mutate()
    setImportFile(null)
  }

  const handleManualClassify = async (id: number, category: string) => {
    await api.patch(`/statements/${id}/category`, { category })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    toast.success('Category updated')
  }

  const handleSavePercentage = async (id: number, pct: number) => {
    await api.patch(`/statements/${id}/deductible-percentage`, { deductiblePercentage: pct })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    toast.success(`Deductible set to ${pct}%`)
  }

  const handleDelete = async (id: number) => {
    await api.delete(`/statements/${id}`)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    toast.success('Transaction removed')
  }

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleYear = (ids: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) ids.forEach((id) => next.add(id))
      else ids.forEach((id) => next.delete(id))
      return next
    })
  }

  const bulkMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/statements/category', {
        ids: [...selectedIds],
        category: bulkCategory,
      })
    },
    onSuccess: () => {
      toast.success(`${selectedIds.size} transactions updated`)
      setSelectedIds(new Set())
      setBulkCategory('')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const bulkPercentageMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/statements/deductible-percentage', {
        ids: [...selectedIds],
        deductiblePercentage: Number(bulkPercentage),
      })
    },
    onSuccess: () => {
      toast.success(`Deductible set to ${bulkPercentage}% on ${selectedIds.size} transactions`)
      setSelectedIds(new Set())
      setBulkPercentage('')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

  const rawCount        = transactions.filter((t) => t.status === 'RAW').length
  const classifiedCount = transactions.filter((t) => t.status === 'CLASSIFIED').length

  const displayed = transactions
    .filter((t) => !taxOnly || (t.category && TAX_RELEVANT_CATEGORIES.has(t.category)))
    .filter((t) => !filterText    || t.description.toLowerCase().includes(filterText.toLowerCase()))
    .filter((t) => !filterCategory || t.category === filterCategory)
    .filter((t) => filterType === 'ALL' || t.transactionType === filterType)
    .filter((t) => !filterDateFrom || t.transactionDate >= filterDateFrom)
    .filter((t) => !filterDateTo   || t.transactionDate <= filterDateTo)
    .filter((t) => !filterAmtMin   || Math.abs(t.amount) >= parseFloat(filterAmtMin))
    .filter((t) => !filterAmtMax   || Math.abs(t.amount) <= parseFloat(filterAmtMax))

  // Group by tax year, most recent first
  const byYear = displayed.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const yr = tx.taxYear ?? 'Unknown'
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(tx)
    return acc
  }, {})
  const years = Object.keys(byYear).sort().reverse()

  return (
      <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Import and classify your bank transactions</p>
        </div>

        {/* Pie chart */}
        {displayed.length > 0 && (
            <CategoryPieChart transactions={displayed} />
        )}

        {/* Action bar */}
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          <button
              onClick={() => fileRef.current?.click()}
              className="btn-primary flex items-center gap-2 text-sm"
          >
            <Upload size={15} />
            Import Statement
          </button>

          <button
              onClick={() => classifyMutation.mutate()}
              disabled={classifyMutation.isPending || rawCount === 0}
              className="btn-outline flex items-center gap-2 text-sm"
          >
            {classifyMutation.isPending
                ? <RefreshCw size={15} className="animate-spin" />
                : <Zap size={15} />}
            {classifyMutation.isPending ? 'Classifying…' : 'Classify with AI'}
          </button>

          <button
              onClick={() => setTaxOnly((v) => !v)}
              className={clsx(
                'btn-outline flex items-center gap-2 text-sm transition-colors',
                taxOnly && 'bg-navy/5 text-navy border-navy/30'
              )}
          >
            <Filter size={15} />
            {taxOnly ? 'Tax-relevant only' : 'All transactions'}
          </button>

          <button
              onClick={() => setShowFilters((v) => !v)}
              className={clsx(
                'btn-outline flex items-center gap-2 text-sm transition-colors relative',
                showFilters && 'bg-navy/5 text-navy border-navy/30'
              )}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-teal text-white
                               text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-4 ml-auto text-sm text-slate-500">
            {rawCount > 0 && (
                <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
                  {rawCount} unclassified
            </span>
            )}
            {classifiedCount > 0 && (
                <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-teal" />
                  {classifiedCount} classified
            </span>
            )}
            <span>
              {displayed.length}
              {(taxOnly || activeFilterCount > 0) ? ` of ${transactions.length}` : ''}
              {' '}total
            </span>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search descriptions…"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="input pl-8 text-sm w-full"
                  />
                </div>
              </div>

              <div className="min-w-[180px]">
                <p className="text-xs font-medium text-slate-500 mb-1">Category</p>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input text-sm w-full"
                >
                  <option value="">All categories</option>
                  {Object.entries(
                    ALL_CATEGORIES.reduce<Record<string, string[]>>((groups, cat) => {
                      const group = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.group ?? 'Other'
                      if (!groups[group]) groups[group] = []
                      groups[group].push(cat)
                      return groups
                    }, {})
                  ).map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label ?? cat}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Type</p>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                  {(['ALL', 'CREDIT', 'DEBIT'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={clsx(
                        'px-3 py-2 transition-colors',
                        filterType === t ? 'bg-navy text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      {t === 'ALL' ? 'All' : t === 'CREDIT' ? 'Credit' : 'Debit'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">From date</p>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">To date</p>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Min amount (N$)</p>
                <input
                  type="number"
                  placeholder="0"
                  value={filterAmtMin}
                  onChange={(e) => setFilterAmtMin(e.target.value)}
                  className="input text-sm w-28"
                  min="0"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Max amount (N$)</p>
                <input
                  type="number"
                  placeholder="∞"
                  value={filterAmtMax}
                  onChange={(e) => setFilterAmtMax(e.target.value)}
                  className="input text-sm w-28"
                  min="0"
                />
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy transition-colors pb-0.5"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Classification progress */}
        {classifyMutation.isPending && classifyTotal > 0 && (
          <div className="px-1 py-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin text-teal" />
                AI classifying transactions…
              </span>
              <span>{classifyDone} / {classifyTotal}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-500"
                style={{ width: `${classifyProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Transaction groups */}
        {isLoading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="card p-12 text-center">
            <AlertCircle size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No transactions yet</p>
            <p className="text-slate-400 text-xs mt-1">
              Import a CSV from FNB or Bank Windhoek to get started
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="card p-12 text-center">
            <SlidersHorizontal size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No matching transactions</p>
            <p className="text-slate-400 text-xs mt-1">
              {activeFilterCount > 0 || taxOnly
                ? 'Try adjusting or clearing your filters'
                : 'No transactions to display'}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-xs text-teal hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {years.map((yr) => (
              <YearSection
                key={yr}
                taxYear={yr}
                transactions={byYear[yr]}
                selectedIds={selectedIds}
                onToggle={toggleSelected}
                onToggleYear={toggleYear}
                onSave={handleManualClassify}
                onSavePercentage={handleSavePercentage}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {importFile && (
        <CsvImportModal
          file={importFile}
          onClose={() => setImportFile(null)}
          onSuccess={handleImportSuccess}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                        bg-navy text-white rounded-xl shadow-2xl px-4 py-3 border border-white/10">
          <span className="text-sm font-medium whitespace-nowrap">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-white/20" />
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="text-sm bg-white/10 text-white rounded-md px-2 py-1.5 border border-white/20
                       focus:outline-none focus:ring-1 focus:ring-white/40 min-w-[180px]"
          >
            <option value="">— Pick category —</option>
            {Object.entries(
              ALL_CATEGORIES.reduce<Record<string, string[]>>((groups, cat) => {
                const group = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.group ?? 'Other'
                if (!groups[group]) groups[group] = []
                groups[group].push(cat)
                return groups
              }, {})
            ).map(([group, cats]) => (
              <optgroup key={group} label={group}>
                {cats.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.emoji}{' '}
                    {CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label ?? cat}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={() => bulkMutation.mutate()}
            disabled={!bulkCategory || bulkMutation.isPending}
            className="bg-teal hover:bg-teal-dark disabled:opacity-40 text-white text-sm font-medium
                       px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:cursor-not-allowed"
          >
            {bulkMutation.isPending ? 'Applying…' : `Apply to ${selectedIds.size}`}
          </button>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={bulkPercentage}
              onChange={(e) => setBulkPercentage(e.target.value)}
              placeholder="Deduct."
              className="text-sm bg-white/10 text-white rounded-md px-2 py-1.5 border border-white/20
                         focus:outline-none focus:ring-1 focus:ring-white/40 w-20 placeholder:text-white/40"
            />
            <span className="text-sm text-white/50">%</span>
          </div>
          <button
            onClick={() => bulkPercentageMutation.mutate()}
            disabled={
              bulkPercentage === '' ||
              Number(bulkPercentage) < 0 ||
              Number(bulkPercentage) > 100 ||
              bulkPercentageMutation.isPending
            }
            className="bg-teal hover:bg-teal-dark disabled:opacity-40 text-white text-sm font-medium
                       px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:cursor-not-allowed"
          >
            {bulkPercentageMutation.isPending ? 'Applying…' : 'Set deductible %'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center
                       justify-center transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
      </>
  )
}
