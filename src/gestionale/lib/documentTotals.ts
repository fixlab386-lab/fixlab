/** Calcolo totali documento con prezzi ivati — verificato vs FIXLab (IVA 22%). */

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Importo riga = Q.tà × Prezzo ivato × (1 − sconto%). */
export function calcLineTotalIvato(quantity: number, unitPriceIvato: number, discountPercent = 0): number {
  const factor = 1 - discountPercent / 100
  return roundMoney(quantity * unitPriceIvato * factor)
}

/** Da totale ivato a netto e IVA per aliquota omogenea. */
export function splitIvato(totalIvato: number, vatRatePercent: number): { net: number; vat: number; total: number } {
  const rate = vatRatePercent / 100
  const net = roundMoney(totalIvato / (1 + rate))
  const vat = roundMoney(totalIvato - net)
  return { net, vat, total: roundMoney(totalIvato) }
}

/** Verifica caso FIXLab: 20 + 211 = 231 ivato, IVA 22%. */
export function verifyFIXLabIvatoSample(): boolean {
  const a = splitIvato(20, 22)
  const b = splitIvato(231, 22)
  const combinedNet = roundMoney(a.net + splitIvato(211, 22).net)
  const combinedVat = roundMoney(a.vat + splitIvato(211, 22).vat)
  return (
    a.net === 16.39 &&
    a.vat === 3.61 &&
    a.total === 20 &&
    combinedNet === 189.34 &&
    combinedVat === 41.66 &&
    b.total === 231
  )
}
