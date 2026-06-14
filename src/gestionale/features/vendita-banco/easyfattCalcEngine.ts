/** Motore calcolatrice stile Danea Easyfatt Calc. */

export type CalcOptions = {
  decimals: number
}

const DEFAULT_OPTIONS: CalcOptions = { decimals: 2 }

export function loadCalcOptions(): CalcOptions {
  try {
    const raw = localStorage.getItem('fixlab_prefs_calc_options')
    if (!raw) return DEFAULT_OPTIONS
    const parsed = JSON.parse(raw) as CalcOptions
    return {
      decimals: Number.isFinite(parsed.decimals) ? Math.max(0, Math.min(10, parsed.decimals)) : 2,
    }
  } catch {
    return DEFAULT_OPTIONS
  }
}

export function saveCalcOptions(options: CalcOptions): void {
  localStorage.setItem('fixlab_prefs_calc_options', JSON.stringify(options))
}

export function parseCalcNumber(raw: string): number {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function formatCalcNumber(value: number, decimals = 2): string {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export type CalcEngineState = {
  display: string
  accumulator: number | null
  pendingOp: string | null
  fresh: boolean
}

export function initialCalcState(): CalcEngineState {
  return { display: '0', accumulator: null, pendingOp: null, fresh: true }
}

function compute(a: number, b: number, op: string): number | null {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? null : a / b
    default:
      return b
  }
}

function formatEntry(value: number, decimals: number): string {
  if (Number.isInteger(value) && decimals === 0) return String(value)
  return formatCalcNumber(value, decimals)
}

export function calcReduce(state: CalcEngineState, action: string, payload?: string, decimals = 2): CalcEngineState {
  const current = parseCalcNumber(state.display)

  if (action === 'setValue' && payload != null) {
    const n = parseCalcNumber(payload)
    return { display: formatEntry(n, decimals), accumulator: null, pendingOp: null, fresh: true }
  }

  if (action === 'clear') return initialCalcState()
  if (action === 'clearEntry') return { ...state, display: '0', fresh: true }

  if (action === 'digit' && payload != null) {
    if (state.fresh) {
      return { ...state, display: payload === ',' ? '0,' : payload, fresh: payload === ',' }
    }
    if (payload === ',') {
      if (state.display.includes(',')) return state
      return { ...state, display: `${state.display},` }
    }
    if (state.display === '0') return { ...state, display: payload, fresh: false }
    return { ...state, display: `${state.display}${payload}`, fresh: false }
  }

  if (action === 'sign') {
    if (current === 0) return state
    const signed = current * -1
    return { ...state, display: formatEntry(signed, decimals), fresh: false }
  }

  if (action === 'sqrt') {
    if (current < 0) return state
    const val = Math.sqrt(current)
    return { ...state, display: formatEntry(val, decimals), fresh: true }
  }

  if (action === 'reciprocal') {
    if (current === 0) return state
    const val = 1 / current
    return { ...state, display: formatEntry(val, decimals), fresh: true }
  }

  if (action === 'op' && payload) {
    if (state.pendingOp && !state.fresh) {
      const result = compute(state.accumulator ?? current, current, state.pendingOp)
      if (result === null) return initialCalcState()
      const rounded = Math.round(result * 10 ** decimals) / 10 ** decimals
      return {
        display: formatEntry(rounded, decimals),
        accumulator: rounded,
        pendingOp: payload,
        fresh: true,
      }
    }
    return { ...state, accumulator: current, pendingOp: payload, fresh: true }
  }

  if (action === 'equals') {
    if (!state.pendingOp) return { ...state, display: formatEntry(current, decimals), fresh: true }
    const result = compute(state.accumulator ?? current, current, state.pendingOp)
    if (result === null) return initialCalcState()
    const rounded = Math.round(result * 10 ** decimals) / 10 ** decimals
    return {
      display: formatEntry(rounded, decimals),
      accumulator: null,
      pendingOp: null,
      fresh: true,
    }
  }

  return state
}

export function calcCurrentValue(state: CalcEngineState): number {
  return parseCalcNumber(state.display)
}

export function daysBetweenDates(a: string, b: string): number | null {
  if (!a || !b) return null
  const d1 = new Date(a)
  const d2 = new Date(b)
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null
  const ms = d2.getTime() - d1.getTime()
  return Math.round(ms / 86400000)
}

export function addDaysToDate(isoDate: string, days: number): string | null {
  if (!isoDate) return null
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDateIt(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

export function parseDateIt(value: string): string {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return value
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Interessi legali semplici: capitale × tasso% × giorni / 365. */
export function calcInteressi(capitale: number, tassoPercent: number, giorni: number): number {
  if (capitale <= 0 || giorni <= 0) return 0
  return Math.round(((capitale * tassoPercent) / 100) * (giorni / 365) * 100) / 100
}
