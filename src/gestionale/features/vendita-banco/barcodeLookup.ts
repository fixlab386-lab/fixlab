import type { Product } from '../../../types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function stripLeadingZeros(s: string): string {
  return s.replace(/^0+/, '') || '0'
}

/** Trova prodotto per codice interno o barcode (lettore tastiera / EAN). */
export function findProductByScanCode(products: Product[], raw: string): Product | null {
  const code = raw.trim()
  if (!code) return null

  const candidates = new Set<string>([code, norm(code), stripLeadingZeros(code), stripLeadingZeros(norm(code))])

  for (const p of products) {
    const keys = [p.code, p.barcode].filter(Boolean) as string[]
    for (const k of keys) {
      const variants = new Set([k, norm(k), stripLeadingZeros(k), stripLeadingZeros(norm(k))])
      for (const c of candidates) {
        if (variants.has(c)) return p
      }
    }
  }

  return null
}

export const BARCODE_HELP_TEXT = [
  'Collega il lettore codici a barre via USB: funziona come una tastiera.',
  'Clicca nel campo «Codice a barre», poi inquadra il codice: il lettore digita il valore e invia Invio.',
  'Puoi anche digitare manualmente codice prodotto o barcode e premere Invio.',
  'Se il prodotto non viene trovato, verifica che il barcode sia registrato nella scheda prodotto in Magazzino.',
].join('\n\n')
