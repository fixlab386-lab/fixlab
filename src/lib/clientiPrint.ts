import type { Cliente } from '../gestionale/features/clienti/types'
import { COLONNE_DEF } from '../gestionale/features/clienti/constants'
import { getColumnValue } from '../gestionale/features/clienti/utils'
import type { ColonnaId } from '../gestionale/features/clienti/types'
import { escapeHtml, wrapPrintDocument, type PrintDocumentHeader } from './printDocument'

export const CLIENTI_PRINT_CSS = ''

export type ClientiPrintContext = {
  archiveName: string
  studioName?: string
  cliente?: Cliente | null
  clienti: Cliente[]
  visibleCols?: ColonnaId[]
}

function field(label: string, value: string) {
  return `<div class="print-doc__field"><div class="print-doc__field-label">${escapeHtml(label)}</div><div class="print-doc__field-value">${escapeHtml(value || '—')}</div></div>`
}

export function buildSchedaClienteBody(c: Cliente): string {
  const so = c.sedeOperativa
  const rc = c.rapportiCommerciali
  const ct = c.contatti
  return `
    <div class="print-doc__card">
      <div class="print-doc__card-section">
        <div class="print-doc__section-title">Identificazione</div>
        ${field('Codice', c.codice)}
        ${field('Denominazione', so.denominazione)}
        ${field('Cod. fiscale', c.codFiscale)}
        ${field('Partita Iva', c.partitaIva)}
        ${field('Tipologia', c.isCliente && c.isFornitore ? 'Cliente e Fornitore' : c.isFornitore ? 'Fornitore' : 'Cliente')}
      </div>
      <div class="print-doc__card-section">
        <div class="print-doc__section-title">Sede operativa</div>
        ${field('Indirizzo', so.indirizzo)}
        ${field('CAP', so.cap)}
        ${field('Città', so.citta)}
        ${field('Prov.', so.prov)}
        ${field('Nazione', so.nazione)}
      </div>
      <div class="print-doc__card-section">
        <div class="print-doc__section-title">Contatti</div>
        ${field('Telefono', ct.telefono)}
        ${field('Cellulare', ct.cellulare)}
        ${field('E-mail', ct.email)}
        ${field('Fax', ct.fax)}
      </div>
      <div class="print-doc__card-section">
        <div class="print-doc__section-title">Rapporti commerciali</div>
        ${field('Agente', rc.agente)}
        ${field('Listino', rc.listino)}
        ${field('Pagamento', rc.pagamento)}
        ${field('Sconto', rc.sconto)}
        ${field('Banca', rc.bancaCC)}
      </div>
      <div class="print-doc__card-section print-doc__card-section--full">
        <div class="print-doc__section-title">Note</div>
        ${field('Note', c.note)}
      </div>
    </div>
  `
}

export function buildElencoClientiBody(clienti: Cliente[], visibleCols: ColonnaId[]): string {
  const cols = COLONNE_DEF.filter(c => visibleCols.includes(c.id))
  const rows = clienti
    .filter(c => !c.isDraft)
    .map(c => {
      const tds = cols.map(col => `<td>${escapeHtml(getColumnValue(c, col.id) || '—')}</td>`).join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  const ths = cols.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')
  return `
    <table class="print-doc__table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${cols.length}">Nessun cliente</td></tr>`}</tbody>
    </table>
    <p style="margin-top:8px;font-size:10px;color:#666;">Totale voci: ${clienti.filter(c => !c.isDraft).length}</p>
  `
}

export function buildEtichetteBody(clienti: Cliente[], singolo?: Cliente): string {
  const list = singolo ? [singolo] : clienti.filter(c => !c.isDraft)
  const cells = list
    .slice(0, 24)
    .map(c => {
      const so = c.sedeOperativa
      return `
        <div style="border:1px dashed #ccc;padding:8px 10px;min-height:72px;font-size:10px;page-break-inside:avoid;">
          <strong>${escapeHtml(so.denominazione)}</strong><br/>
          ${escapeHtml(so.indirizzo)}<br/>
          ${escapeHtml(so.cap)} ${escapeHtml(so.citta)} ${escapeHtml(so.prov)}
        </div>
      `
    })
    .join('')
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${cells}</div>`
}

export function buildClientiPrintHtml(
  modello: string,
  ctx: ClientiPrintContext,
): { innerHtml: string; title: string; filename: string } {
  const header: PrintDocumentHeader = {
    documentTitle: modello,
    archiveName: ctx.archiveName,
    studioName: ctx.studioName,
  }

  let body = ''
  if (modello === 'Scheda cliente/fornitore' || modello === 'Scheda azienda anagrafica') {
    if (!ctx.cliente) body = '<p>Nessun cliente selezionato.</p>'
    else body = buildSchedaClienteBody(ctx.cliente)
  } else if (modello === 'Elenco' || modello === 'Elenco clienti') {
    body = buildElencoClientiBody(ctx.clienti, ctx.visibleCols || (COLONNE_DEF.map(c => c.id) as ColonnaId[]))
  } else if (modello.includes('Etichette')) {
    body = buildEtichetteBody(ctx.clienti, ctx.cliente || undefined)
  } else {
    body = '<p>Modello non disponibile.</p>'
  }

  const innerHtml = wrapPrintDocument(header, body)
  const safeName = (ctx.cliente?.sedeOperativa.denominazione || modello).slice(0, 30)
  return {
    innerHtml,
    title: modello,
    filename: `clienti_${safeName.replace(/\s+/g, '_')}.pdf`,
  }
}
