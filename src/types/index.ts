// ─── API Response wrapper ─────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errorCode?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string }
export interface RegisterRequest {
  email: string; password: string; fullName: string; role: string; tin: string
}
export type TaxpayerCategory = 'PAYE_ONLY' | 'PAYE_ADDITIONAL' | 'PROVISIONAL'

export interface AuthResponse {
  token: string
  userId: number
  email: string
  fullName: string
  role: string
  tin: string
  country: string
  taxpayerCategory: TaxpayerCategory
}

// ─── Transactions ─────────────────────────────────────────────────────────
export interface Transaction {
  id: number
  userId: number
  taxYear: string
  transactionDate: string
  description: string
  amount: number
  transactionType: 'CREDIT' | 'DEBIT'
  bankReference?: string
  bankSource?: string
  category?: string
  status: 'RAW' | 'CLASSIFIED' | 'REVIEWED'
  deductiblePercentage?: number
  originalTaxYear?: string | null   // date-derived year, set when reassigned to another period
}

// ─── Tax Return ───────────────────────────────────────────────────────────
export interface TaxReturnModel {
  taxYear: string
  // Income breakdown (present when derived from transactions; null for PAYE5 override)
  salary?: number | null
  commission?: number | null
  freelanceIncome?: number | null
  rentalIncome?: number | null
  interestIncome?: number | null
  businessIncome?: number | null
  allowanceIncome?: number | null
  otherIncome?: number | null
  grossIncome: number
  transactionCount: number
  pensionContributions: number
  medicalExpenses: number
  donationsToApprovedBodies: number
  studyLoanInterest: number
  otherDeductions: number
  totalDeductions: number
  taxableIncome: number
  grossTax: number
  rebates: number
  netTax: number
  payeAlreadyPaid: number
  provisionalTaxPaid?: number   // >0 when detected from TAX_PROVISIONAL transactions
  refundOrLiability: number
  status: 'REFUND' | 'LIABILITY' | 'BREAK_EVEN'
  statusLabel: string
  effectiveTaxRate: number
  // Provisional projection (present only for transaction-derived returns)
  projectedAnnualNetTax?: number | null
  monthsOfData?: number | null
}

// ─── Income summary (from classified transactions) ────────────────────────
export interface IncomeSummary {
  category: string
  displayName: string
  totalAmount: number
  transactionCount: number
}

// ─── Deductions ───────────────────────────────────────────────────────────
export interface DeductionSuggestion {
  category: string
  displayName: string
  totalAmount: number
  transactionCount: number
  message: string
  itaReference: string
}

// ─── Subscription ─────────────────────────────────────────────────────────
export interface Subscription {
  id: number
  userId: number
  plan: 'BASIC' | 'PROFESSIONAL' | 'BUSINESS' | 'PRACTITIONER'
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING'
  expiresAt: string
  createdAt: string
}

// ─── PAYE5 OCR ────────────────────────────────────────────────────────────
export interface Paye5Result {
  success: boolean
  found?: boolean
  message: string
  fieldsFound: number
  grossIncome?: number
  payeDeducted?: number
  pensionContributions?: number
  medicalContributions?: number
  employerTin?: string
  taxYear?: string
  uploadedAt?: string
  hasFile?: boolean
}

// ─── Trial Balance ────────────────────────────────────────────────────────
export interface TrialBalanceEntry {
  accountCode: string
  accountName: string
  debit: number
  credit: number
  suggestedTaxLine?: string
  mappedTaxLine?: string
}

export interface TrialBalanceResult {
  accounts: TrialBalanceEntry[]
  taxYear: string
}

export interface CITCalculation {
  taxYear: string
  grossIncome: number
  totalDeductions: number
  taxableProfit: number
  citPayable: number
  effectiveRate: number
  breakdown: { taxLine: string; amount: number; description: string }[]
}

// ─── Chat ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export interface DashboardSummary {
  grossIncome: number
  netTax: number
  refundOrLiability: number
  status: 'REFUND' | 'LIABILITY' | 'BREAK_EVEN'
  effectiveTaxRate: number
  transactionCount: number
  daysUntilDeadline: number
  deadlineDate: string
  taxYear: string
}

// ─── Tax Certificate (Retirement Fund / Study Policy) ─────────────────────
export interface TaxCertItem {
  id: number
  taxYear: string
  amount?: number
  name?: string
  originalFilename?: string
  uploadedAt?: string
  hasFile: boolean
}

export interface TaxCertListResult {
  items: TaxCertItem[]
  totalAmount: number
}

export interface TaxCertUploadResult {
  success: boolean
  id?: number
  taxYear?: string
  amount?: number
  message: string
}

// ─── Practitioner clients ─────────────────────────────────────────────────
export interface ClientSummary {
  id: number
  fullName: string
  email: string
  role: string
  plan: string
  subscriptionStatus: string
  expiresAt: string | null
}

// ─── ITAS Pre-fill ────────────────────────────────────────────────────────
export interface ItasPreFillResponse {
  success: boolean
  message: string
  screenshotBase64?: string
  taxYear: number
  warnings?: string
}