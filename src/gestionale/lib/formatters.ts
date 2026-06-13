/** Formattazione locale it-IT — stile gestionale enterprise. */

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace('.', ',')
}

export function formatDateIt(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function parseEuroInput(raw: string): number {
  const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
