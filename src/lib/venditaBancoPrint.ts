import type { DocRecord } from '../types'
import type { ClienteDocumento, IndirizzoCompleto, RigaDocumento } from '../gestionale/features/vendita-banco/types'
import { formatDataIt, formatEuro } from '../gestionale/features/vendita-banco/utils'
import { escapeHtml, printHtmlInIframe } from './printDocument'

export type VenditaBancoStudioInfo = {
  name?: string
  tagline?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  fax?: string
  email?: string
  website?: string
  logoUrl?: string
}

export type VenditaBancoFIXLabPrintContext = {
  doc: Pick<
    DocRecord,
    'fullNumber' | 'number' | 'date' | 'subjectName' | 'subjectVat' | 'totalDocument' | 'rows' | 'paymentMethod'
  >
  studio?: VenditaBancoStudioInfo
  cliente: ClienteDocumento
  intestatario: IndirizzoCompleto
  destinazione: IndirizzoCompleto
  righe: RigaDocumento[]
}

export const VENDITA_BANCO_PRINT_CSS = `
.vb-gestionale-print {
  font-family: "Segoe UI", Tahoma, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  color: #1a1a1a;
  background: #fff;
  padding: 18px 22px 28px;
  max-width: 794px;
  margin: 0 auto;
}
.vb-gestionale-print__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 14px;
}
.vb-gestionale-print__doc-type {
  font-size: 22px;
  font-weight: 700;
  color: #8a8a8a;
  line-height: 1.1;
}
.vb-gestionale-print__doc-num,
.vb-gestionale-print__doc-date {
  font-size: 12px;
  color: #333;
  margin-top: 4px;
}
.vb-gestionale-print__studio {
  text-align: right;
  max-width: 52%;
}
.vb-gestionale-print__studio-head {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
}
.vb-gestionale-print__logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.vb-gestionale-print__logo-fallback {
  width: 48px;
  height: 48px;
  background: #2b7ab5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  border-radius: 2px;
}
.vb-gestionale-print__studio-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.vb-gestionale-print__studio-tagline {
  font-size: 10px;
  color: #555;
  margin-top: 2px;
}
.vb-gestionale-print__studio-lines {
  margin-top: 6px;
  font-size: 10px;
  color: #333;
  line-height: 1.45;
}
.vb-gestionale-print__boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin: 12px 0 10px;
  border: 1px solid #b8b8b8;
}
.vb-gestionale-print__box {
  min-height: 72px;
  padding: 6px 8px 8px;
  background: #f0f0f0;
  border-right: 1px solid #b8b8b8;
}
.vb-gestionale-print__box:last-child {
  border-right: none;
}
.vb-gestionale-print__box-label {
  font-weight: 700;
  font-size: 10px;
  margin-bottom: 4px;
}
.vb-gestionale-print__box-body {
  font-size: 10px;
  line-height: 1.4;
  white-space: pre-line;
}
.vb-gestionale-print__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.vb-gestionale-print__table th,
.vb-gestionale-print__table td {
  border: 1px solid #b8b8b8;
  padding: 4px 6px;
  vertical-align: top;
}
.vb-gestionale-print__table th {
  background: #e8e8e8;
  font-weight: 700;
  text-align: left;
}
.vb-gestionale-print__table .num {
  text-align: right;
  white-space: nowrap;
}
.vb-gestionale-print__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.vb-gestionale-print__totals {
  min-width: 220px;
  text-align: right;
}
.vb-gestionale-print__totals-block {
  background: #e8e8e8;
  border: 1px solid #b8b8b8;
  min-height: 48px;
  margin-bottom: 6px;
}
.vb-gestionale-print__tot-doc {
  font-size: 12px;
  font-weight: 700;
}
.vb-gestionale-print__page {
  font-size: 10px;
  color: #555;
  text-align: right;
  margin-top: 18px;
}
@media print {
  .vb-gestionale-print { padding: 0; max-width: none; }
}
`

function formatIndirizzoBlock(addr: IndirizzoCompleto): string {
  const line1 = addr.indirizzo?.trim()
  const line2 = [addr.cap, addr.citta, addr.prov].filter(Boolean).join(' ').trim()
  const line3 = addr.nazione && addr.nazione !== 'Italia' ? addr.nazione.trim() : ''
  return [line1, line2, line3].filter(Boolean).join('\n')
}

function destinatarioText(ctx: VenditaBancoFIXLabPrintContext): string {
  const lines = [ctx.cliente.nome?.trim()]
  const addr = formatIndirizzoBlock(ctx.intestatario)
  if (addr) lines.push(addr)
  const cf = ctx.cliente.codFiscale?.trim()
  const piva = ctx.cliente.partitaIva?.trim()
  if (cf) lines.push(`C.F. ${cf}`)
  if (piva) lines.push(`P.IVA ${piva}`)
  return lines.filter(Boolean).join('\n')
}

function destinazioneText(ctx: VenditaBancoFIXLabPrintContext): string {
  const dest = formatIndirizzoBlock(ctx.destinazione)
  if (dest) return dest
  return formatIndirizzoBlock(ctx.intestatario)
}

function grossUnitPrice(riga: RigaDocumento): number {
  return Math.round(riga.prezzoIvato * 100) / 100
}

function formatSconto(sconto: number): string {
  if (!sconto) return ''
  return `${sconto.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`
}

export function buildVenditaBancoFIXLabPrintBody(ctx: VenditaBancoFIXLabPrintContext): string {
  const studio = ctx.studio || {}
  const studioInitials = (studio.name || 'FL')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const logoBlock = studio.logoUrl
    ? `<img class="vb-gestionale-print__logo" src="${escapeHtml(studio.logoUrl)}" alt="" />`
    : `<div class="vb-gestionale-print__logo-fallback">${escapeHtml(studioInitials)}</div>`

  const studioLines = [
    studio.address
      ? `${escapeHtml(studio.address)}${studio.cap || studio.city ? ` - ${escapeHtml([studio.cap, studio.city, studio.province ? `(${studio.province})` : ''].filter(Boolean).join(' '))}` : ''}${studio.city ? ' - Italy' : ''}`
      : '',
    studio.phone ? `Tel. ${escapeHtml(studio.phone)}` : '',
    studio.fax ? `Fax ${escapeHtml(studio.fax)}` : '',
    studio.email ? `e-mail: ${escapeHtml(studio.email)}` : '',
    studio.website ? `Internet: ${escapeHtml(studio.website)}` : '',
    studio.vatNumber ? `C.F./P.Iva ${escapeHtml(studio.vatNumber)}` : '',
  ].filter(Boolean)

  const rowHtml = ctx.righe
    .filter(r => r.descrizione.trim())
    .map(r => {
      const importo = Math.round(r.importoIvato * 100) / 100
      const prezzo = grossUnitPrice(r)
      return `<tr>
        <td>${escapeHtml(r.cod)}</td>
        <td>${escapeHtml(r.descrizione)}</td>
        <td class="num">${escapeHtml(r.qta)} ${escapeHtml(r.um || 'pz')}</td>
        <td class="num">${escapeHtml(formatEuro(prezzo))}</td>
        <td class="num">${escapeHtml(formatSconto(r.sconto))}</td>
        <td class="num">${escapeHtml(formatEuro(importo))}</td>
      </tr>`
    })
    .join('')

  const docDate = formatDataIt(ctx.doc.date)
  const docNum = ctx.doc.number ? String(ctx.doc.number) : ctx.doc.fullNumber

  return `
    <div class="vb-gestionale-print">
      <div class="vb-gestionale-print__top">
        <div>
          <div class="vb-gestionale-print__doc-type">Vendita al banco</div>
          <div class="vb-gestionale-print__doc-num">n. ${escapeHtml(docNum)}</div>
          <div class="vb-gestionale-print__doc-date">del ${escapeHtml(docDate)}</div>
        </div>
        <div class="vb-gestionale-print__studio">
          <div class="vb-gestionale-print__studio-head">
            ${logoBlock}
            <div>
              <div class="vb-gestionale-print__studio-name">${escapeHtml(studio.name || 'FIXLab')}</div>
              ${studio.tagline ? `<div class="vb-gestionale-print__studio-tagline">${escapeHtml(studio.tagline)}</div>` : ''}
            </div>
          </div>
          ${studioLines.length ? `<div class="vb-gestionale-print__studio-lines">${studioLines.join('<br/>')}</div>` : ''}
        </div>
      </div>

      <div class="vb-gestionale-print__boxes">
        <div class="vb-gestionale-print__box">
          <div class="vb-gestionale-print__box-label">Destinatario</div>
          <div class="vb-gestionale-print__box-body">${escapeHtml(destinatarioText(ctx))}</div>
        </div>
        <div class="vb-gestionale-print__box">
          <div class="vb-gestionale-print__box-label">Destinazione</div>
          <div class="vb-gestionale-print__box-body">${escapeHtml(destinazioneText(ctx))}</div>
        </div>
      </div>

      <table class="vb-gestionale-print__table">
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
            <th>Quantità</th>
            <th>Prezzo ivato</th>
            <th>Sconto</th>
            <th>Importo</th>
          </tr>
        </thead>
        <tbody>${rowHtml || '<tr><td colspan="6">Nessuna riga</td></tr>'}</tbody>
      </table>

      <div class="vb-gestionale-print__footer">
        <div class="vb-gestionale-print__totals">
          <div class="vb-gestionale-print__totals-block"></div>
          <div class="vb-gestionale-print__tot-doc">Tot. documento ${escapeHtml(formatEuro(ctx.doc.totalDocument))}</div>
        </div>
      </div>
      <div class="vb-gestionale-print__page">Pag. 1</div>
    </div>
  `
}

/** Stampa vendita al banco (compatibilità legacy). */
export function printVenditaBancoDocument(doc: DocRecord, studio?: VenditaBancoStudioInfo): void {
  const innerHtml = buildVenditaBancoFIXLabPrintBody({
    doc,
    studio,
    cliente: { id: '', nome: doc.subjectName, codFiscale: doc.subjectVat || '', partitaIva: '' },
    intestatario: { indirizzo: doc.subjectAddress || '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    destinazione: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    righe: doc.rows.map((row, i) => ({
      id: row.id || String(i),
      cod: row.productCode || '',
      descrizione: row.description,
      tagliaColore: row.tagliaColore || '',
      qta: row.quantity,
      um: row.unitOfMeasure || 'pz',
      prezzoIvato: Math.round(row.unitPrice * (1 + row.vatRate / 100) * 100) / 100,
      sconto: row.discount || 0,
      iva: row.vatRate,
      scaricaMagazzino: true,
      importoIvato: row.total,
    })),
  })
  printHtmlInIframe(innerHtml, `Vendita al banco ${doc.fullNumber}`, VENDITA_BANCO_PRINT_CSS)
}

/** @deprecated Usa buildVenditaBancoFIXLabPrintBody */
export function buildVenditaBancoPrintBody(doc: DocRecord): string {
  return buildVenditaBancoFIXLabPrintBody({
    doc,
    studio: { name: 'FIXLab' },
    cliente: { id: '', nome: doc.subjectName, codFiscale: doc.subjectVat || '', partitaIva: '' },
    intestatario: { indirizzo: doc.subjectAddress || '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    destinazione: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    righe: doc.rows.map((row, i) => ({
      id: row.id || String(i),
      cod: row.productCode || '',
      descrizione: row.description,
      tagliaColore: row.tagliaColore || '',
      qta: row.quantity,
      um: row.unitOfMeasure || 'pz',
      prezzoIvato: Math.round(row.unitPrice * (1 + row.vatRate / 100) * 100) / 100,
      sconto: row.discount || 0,
      iva: row.vatRate,
      scaricaMagazzino: true,
      importoIvato: row.total,
    })),
  })
}

