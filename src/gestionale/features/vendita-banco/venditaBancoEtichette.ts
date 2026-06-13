import type { RigaDocumento } from './types'
import type { DocumentRow } from '../../../types'
import { escapeHtml, printHtmlDocument } from '../../../lib/printDocument'
import { formatEuro } from './utils'

export function printVenditaBancoEtichette(righe: RigaDocumento[], clienteNome: string): void {
  const lines = righe.filter(r => r.descrizione.trim() && r.cod.trim())
  if (lines.length === 0) {
    alert('Nessuna riga con codice prodotto per stampare etichette.')
    return
  }

  const labels = lines
    .map(
      r => `
    <div class="lbl">
      <div class="lbl__code">${escapeHtml(r.cod)}</div>
      <div class="lbl__name">${escapeHtml(r.descrizione)}</div>
      <div class="lbl__meta">${escapeHtml(clienteNome)} · ${escapeHtml(String(r.qta))} ${escapeHtml(r.um)} · ${escapeHtml(formatEuro(r.importoIvato))}</div>
    </div>`,
    )
    .join('')

  const html = `
    <style>
      body { font-family: "Segoe UI", sans-serif; margin: 12px; }
      .lbl { display: inline-block; width: 48mm; min-height: 28mm; border: 1px dashed #999; padding: 6px; margin: 4px; font-size: 10px; vertical-align: top; }
      .lbl__code { font-weight: 700; font-size: 12px; }
      .lbl__name { margin: 4px 0; }
      .lbl__meta { color: #555; font-size: 9px; }
    </style>
    ${labels}
  `
  printHtmlDocument(html, 'Etichette vendita al banco')
}

export function printDocumentRowEtichette(rows: DocumentRow[], clienteNome: string): void {
  const mapped: RigaDocumento[] = rows
    .filter(r => r.description.trim() && (r.productCode || '').trim())
    .map(r => ({
      id: r.id,
      productId: r.productId,
      cod: r.productCode || '',
      descrizione: r.description,
      tagliaColore: r.tagliaColore || '',
      qta: r.quantity,
      um: r.unitOfMeasure,
      prezzoIvato: r.unitPrice,
      sconto: r.discount || 0,
      iva: r.vatRate,
      scaricaMagazzino: false,
      importoIvato: r.total,
      tipoRiga: 'normale' as const,
    }))
  printVenditaBancoEtichette(mapped, clienteNome)
}
