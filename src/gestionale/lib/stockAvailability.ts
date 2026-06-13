/** Calcolo disponibilità magazzino — logica pura FIXLab. */

export function calcDisponibile(giacenza: number, impegnata: number, ordinata = 0): number {
  return giacenza - impegnata + ordinata
}

export type StockStatus = 'regolare' | 'in_arrivo' | 'da_ordinare' | 'sotto_scorta' | 'esaurito'

export function computeStockStatus(
  disponibile: number,
  scortaMinima: number,
  inArrivo: number,
): StockStatus {
  if (disponibile <= 0) return inArrivo > 0 ? 'in_arrivo' : 'esaurito'
  if (disponibile < scortaMinima) return inArrivo > 0 ? 'in_arrivo' : 'sotto_scorta'
  if (disponibile <= scortaMinima * 1.2) return 'da_ordinare'
  return 'regolare'
}
