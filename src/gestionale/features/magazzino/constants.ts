import type { StockMovementType } from '../../../types'

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  load: 'Carico',
  unload: 'Scarico',
  adjust: 'Rettifica',
  committed: 'Impegnato',
  incoming: 'In arrivo',
}

export const MOVEMENT_TYPES: StockMovementType[] = [
  'load',
  'unload',
  'adjust',
  'committed',
  'incoming',
]

export const CAUSE_PRESETS = [
  'Carico da fornitore',
  'Rettifica inventario',
  'Scarto',
  'Reso cliente',
  'Inventario fisico',
]

export const CAUSE_PRESETS_LOAD = [
  'Carico da fornitore',
  'Reso da cliente',
  'Inventario fisico',
  'Omaggio',
]

export const CAUSE_PRESETS_UNLOAD = [
  'Vendita',
  'Scarto',
  'Campione',
  'Uso interno',
]

export const CAUSE_PRESETS_ADJUST = ['Rettifica giacenza', 'Inventario fisico', 'Correzione errore']

export type MovementPeriodPreset =
  | 'all'
  | 'current_month'
  | 'last_month'
  | 'current_year'
  | 'last_year'
  | 'today'
  | 'yesterday'
  | 'current_week'
  | 'last_week'
  | 'current_quarter'
  | 'last_quarter'

/** Retro-compatibilità con i vecchi componenti (MovementFilterBar). */
export type MovementPeriodFilter = MovementPeriodPreset

/**
 * Periodo selezionato nei Movimenti magazzino.
 * - `preset`: uno dei periodi predefiniti (Tutti, Mese corrente, Oggi, ...)
 * - `month`: un mese specifico (es. «Agosto 2025»)
 * - `range`: un intervallo personalizzato «Da... a...»
 */
export type MovementPeriod =
  | { kind: 'preset'; preset: MovementPeriodPreset }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'range'; from: string; to: string }

export const DEFAULT_MOVEMENT_PERIOD: MovementPeriod = { kind: 'preset', preset: 'all' }

export const IT_MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

export type MovementStatusFilter = 'all' | 'loads' | 'unloads' | 'committed' | 'incoming'

export const MOVEMENT_STATUS_LABELS: Record<MovementStatusFilter, string> = {
  all: 'Tutti',
  loads: 'Solo carichi',
  unloads: 'Solo scarichi',
  committed: 'Solo impegni',
  incoming: 'Solo in arrivo',
}

export type OperazioneMagazzinoMode = 'load' | 'unload' | 'adjust'

export const OPERAZIONE_MAGAZZINO_TITLES: Record<OperazioneMagazzinoMode, string> = {
  load: 'Carico magazzino',
  unload: 'Scarico magazzino',
  adjust: 'Rettifica giacenza magazzino',
}

export const OPERAZIONE_MAGAZZINO_SUBTITLES: Record<OperazioneMagazzinoMode, string> = {
  load: 'Inserimento movimenti per entrata merce in magazzino',
  unload: 'Inserimento movimenti per uscita merce da magazzino',
  adjust: 'Inserimento movimenti per aggiustamento della quantità in giacenza',
}
