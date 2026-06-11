import { useState, useRef } from 'react'
import CsvImportModal from './CsvImportModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Zap, RefreshCw, AlertCircle,
  CheckCircle2, Clock, TrendingUp, TrendingDown, Pencil, X, Check,
  Filter, ChevronDown, ChevronRight, Trash2,
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

// ─── Transaction row with inline delete confirm ───────────────────────────────

function TransactionRow({
  tx,
  onSave,
  onDelete,
}: {
  tx: Transaction
  onSave: (id: number, category: string) => Promise<void>
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
    <tr className="hover:bg-slate-50 transition-colors group">
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
  onSave,
  onDelete,
}: {
  taxYear: string
  transactions: Transaction[]
  onSave: (id: number, category: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(false)

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
              <th className="table-header text-left">Date</th>
              <th className="table-header text-left">Description</th>
              <th className="table-header text-left">
                Category
                <span className="text-slate-300 font-normal ml-1.5 text-xs">hover to edit</span>
              </th>
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
                onSave={onSave}
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

  const [importFile, setImportFile] = useState<File | null>(null)
  const [taxOnly,    setTaxOnly]    = useState(false)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Transaction[]>>('/statements')
      return res.data.data
    },
  })

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ classified: number }>>(
          '/statements/classify', null
      )
      return res.data.data
    },
    onSuccess: (data) => {
      toast.success(`${data.classified} transactions classified`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  })

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

  const handleDelete = async (id: number) => {
    await api.delete(`/statements/${id}`)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    toast.success('Transaction removed')
  }

  const rawCount        = transactions.filter((t) => t.status === 'RAW').length
  const classifiedCount = transactions.filter((t) => t.status === 'CLASSIFIED').length

  const displayed = taxOnly
    ? transactions.filter((t) => t.category && TAX_RELEVANT_CATEGORIES.has(t.category))
    : transactions

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
            <span>{displayed.length}{taxOnly ? ` of ${transactions.length}` : ''} total</span>
          </div>
        </div>

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
            <Filter size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No tax-relevant transactions</p>
            <p className="text-slate-400 text-xs mt-1">
              Classify transactions as income or deductions to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {years.map((yr) => (
              <YearSection
                key={yr}
                taxYear={yr}
                transactions={byYear[yr]}
                onSave={handleManualClassify}
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
      </>
  )
}
