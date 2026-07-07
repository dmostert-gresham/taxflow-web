import { create } from 'zustand'

export type TaxYear = string

/** First tax year the platform supports (and the tax engine's earliest brackets). */
const EARLIEST_TAX_YEAR_START = 2022

/** Formats a fiscal start year as a "YYYY/YY" label, e.g. 2026 → "2026/27". */
function taxYearLabel(startYear: number): string {
  return `${startYear}/${String(startYear + 1).slice(2)}`
}

/**
 * All selectable tax years, newest first. Generated at load time so the list is
 * never stale: the ceiling is always the assessment year starting in the present
 * calendar year (e.g. 2026 → "2026/27", running to the year after the present
 * year), down to {@link EARLIEST_TAX_YEAR_START}.
 */
export const TAX_YEARS: string[] = (() => {
  const newestStart = new Date().getFullYear()
  const years: string[] = []
  for (let s = newestStart; s >= EARLIEST_TAX_YEAR_START; s--) years.push(taxYearLabel(s))
  return years
})()

/**
 * The current Namibian tax year. The year of assessment for individuals runs
 * March–February, so before March we are still in the prior year of assessment.
 * This is the sensible default selection (the most recent fileable year), which
 * is always within {@link TAX_YEARS}.
 */
export function currentTaxYear(): TaxYear {
  const now = new Date()
  const year = now.getFullYear()
  const startYear = now.getMonth() >= 2 ? year - 1 : year - 2
  const label = taxYearLabel(startYear)
  return TAX_YEARS.includes(label) ? label : TAX_YEARS[0]
}

function initialTaxYear(): TaxYear {
  const stored = localStorage.getItem('tax_year')
  return stored && (TAX_YEARS as readonly string[]).includes(stored)
    ? (stored as TaxYear)
    : currentTaxYear()
}

interface TaxYearState {
  taxYear: TaxYear
  setTaxYear: (year: TaxYear) => void
}

/**
 * Single source of truth for the selected tax year, surfaced by the sidebar
 * selector in AppShell and consumed by every year-scoped page. Persisted to
 * localStorage so the choice survives reloads and is shared across the app.
 */
export const useTaxYearStore = create<TaxYearState>((set) => ({
  taxYear: initialTaxYear(),
  setTaxYear: (year) => {
    localStorage.setItem('tax_year', year)
    set({ taxYear: year })
  },
}))
