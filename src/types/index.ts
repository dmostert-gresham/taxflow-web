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
export interface AuthResponse {
  token: string
  userId: number
  email: string
  fullName: string
  role: string
  tin: string
  isBeta: boolean
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
  refundOrLiability: number
  status: 'REFUND' | 'LIABILITY' | 'BREAK_EVEN'
  statusLabel: string
  effectiveTaxRate: number
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

// ─── ITAS Pre-fill ────────────────────────────────────────────────────────
export interface ItasPreFillResponse {
  success: boolean
  message: string
  screenshotBase64?: string
  taxYear: number
  warnings?: string
}