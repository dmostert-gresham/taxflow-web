import { create } from 'zustand'

/** All selectable tax years, newest first. */
export const TAX_YEARS = ['2025/26', '2024/25', '2023/24', '2022/23'] as const

export type TaxYear = (typeof TAX_YEARS)[number]

/**
 * The current Namibian tax year. The year of assessment for individuals runs
 * March–February, so before March we are still in the prior year of assessment.
 */
export function currentTaxYear(): TaxYear {
  const now = new Date()
  const year = now.getFullYear()
  const startYear = now.getMonth() >= 2 ? year - 1 : year - 2
  const label = `${startYear}/${String(startYear + 1).slice(2)}`
  return (TAX_YEARS as readonly string[]).includes(label)
    ? (label as TaxYear)
    : TAX_YEARS[0]
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
