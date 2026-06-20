import type { DocRecord } from '../types'
import type { ClienteDocumento, IndirizzoCompleto, RigaDocumento } from '../gestionale/features/vendita-banco/types'
import { formatDataIt, formatEuro } from '../gestionale/features/vendita-banco/utils'
import { escapeHtml, printHtmlInIframe } from './printDocument'
import {
  DEFAULT_VENDITA_BANCO_DISCLAIMER,
  formatEuroIt,
  formatStudioAddressLine,
  type ConfermaOrdineLineRow,
  type ConfermaOrdineStudio,
  type ConfermaOrdineViewModel,
} from './confermaOrdineTemplate'

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

/**
 * Costruisce il view-model Danea (stile "co-print") per la vendita al banco:
 * intestazione studio, riquadri Destinatario/Destinazione, tabella senza colonna Iva,
 * piede con solo "Tot. documento" e disclaimer.
 */
export function buildVenditaBancoConfermaModel(
  ctx: VenditaBancoFIXLabPrintContext,
  studio: ConfermaOrdineStudio,
  titolo = 'Vendita al banco',
): ConfermaOrdineViewModel {
  const lines: ConfermaOrdineLineRow[] = ctx.righe
    .filter(r => r.descrizione.trim())
    .map(r => ({
      code: r.cod || '',
      description: r.descrizione,
      qty: r.qta,
      um: r.um || 'pz',
      priceIvato: Math.round(r.prezzoIvato * 100) / 100,
      sconto: r.sconto || 0,
      importo: Math.round(r.importoIvato * 100) / 100,
      iva: r.iva,
    }))

  const titleLabel = titolo.toLowerCase().endsWith('nr.') ? titolo : `${titolo} nr.`
  const docNum = ctx.doc.fullNumber || (ctx.doc.number ? String(ctx.doc.number) : '0001')

  return {
    orderNumber: docNum,
    orderDate: formatDataIt(ctx.doc.date),
    studio,
    clientBody: destinatarioText(ctx),
    deviceBody: destinazioneText(ctx),
    lines,
    deposit: 0,
    total: ctx.doc.totalDocument,
    disclaimer: DEFAULT_VENDITA_BANCO_DISCLAIMER,
    documentTitleLabel: titleLabel,
    clientBoxTitle: 'Destinatario',
    rightBoxTitle: 'Destinazione',
    showRightBox: true,
    totalLabel: 'Tot. documento',
    showCodeColumn: true,
    showPriceColumns: true,
    showIvaColumn: false,
    footerMode: 'total',
  }
}

/**
 * CSS del layout "Vendita al banco" in stile Danea/Easyfatt (tema rosso),
 * riproduzione fedele del modulo stampato: intestazione studio con riga rossa,
 * riquadri Destinatario/Destinazione, tabella righe a colonne, riquadro Totali
 * e barra "Tot. documento", disclaimer e numero pagina.
 */
export const VENDITA_BANCO_DANEA_CSS = `
.vbd {
  --vbd-red: #d6334f;
  --vbd-pink: #fbe7ec;
  --vbd-sep: #f1ccd4;
  font-family: Arial, Helvetica, "Segoe UI", sans-serif;
  font-size: 9pt;
  line-height: 1.35;
  color: #1a1a1a;
  background: #fff;
  box-sizing: border-box;
  width: 100%;
  max-width: 794px;
  margin: 0 auto;
  padding: 10px 16px 8px;
  display: flex;
  flex-direction: column;
  min-height: 1040px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.vbd * {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.vbd__name {
  font-size: 17pt;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.05;
}
.vbd__rule {
  height: 2px;
  background: var(--vbd-red);
  margin: 3px 0 6px;
}
.vbd__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}
.vbd__brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}
.vbd__logo {
  max-height: 38px;
  max-width: 180px;
  object-fit: contain;
}
.vbd__addr {
  text-align: right;
  font-size: 7.5pt;
  line-height: 1.5;
  color: #222;
  flex-shrink: 0;
}
.vbd__docmeta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin: 10px 0 8px;
  font-size: 8.5pt;
}
.vbd__doc-label {
  color: var(--vbd-red);
  font-weight: 700;
}
.vbd__doc-sep {
  color: #333;
}
.vbd__doc-box {
  border: 1px solid #b9b9b9;
  padding: 1px 10px;
  font-weight: 700;
  background: #fff;
  min-width: 30px;
  text-align: center;
}
.vbd__boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 8px;
}
.vbd__box {
  border: 1px solid var(--vbd-red);
}
.vbd__box-head {
  background: var(--vbd-red);
  color: #fff;
  font-weight: 700;
  font-size: 8pt;
  padding: 2px 7px;
}
.vbd__box-body {
  background: var(--vbd-pink);
  min-height: 72px;
  padding: 5px 8px;
  font-size: 8pt;
  line-height: 1.4;
  white-space: pre-line;
}
.vbd__items {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vbd-red);
  min-height: 360px;
}
.vbd__items-head,
.vbd__row {
  display: grid;
  grid-template-columns: 14% 1fr 11% 13% 9% 13%;
}
.vbd__items-head {
  background: var(--vbd-red);
  color: #fff;
  font-weight: 700;
  font-size: 8pt;
}
.vbd__items-head > div {
  padding: 3px 7px;
  border-right: 1px solid rgba(255, 255, 255, 0.45);
}
.vbd__items-head > div:last-child {
  border-right: none;
}
.vbd__items-body {
  position: relative;
  flex: 1 1 auto;
}
.vbd__cols {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 14% 1fr 11% 13% 9% 13%;
}
.vbd__cols > span {
  border-right: 1px solid var(--vbd-sep);
}
.vbd__cols > span:last-child {
  border-right: none;
}
.vbd__rows {
  position: relative;
}
.vbd__row > div {
  padding: 3px 7px;
  font-size: 8pt;
}
.vbd__num {
  text-align: right;
  white-space: nowrap;
}
.vbd__totali-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.vbd__totali {
  width: 46%;
  border: 1px solid var(--vbd-red);
}
.vbd__totali-head {
  background: var(--vbd-red);
  color: #fff;
  font-weight: 700;
  font-size: 8pt;
  padding: 2px 7px;
}
.vbd__totali-body {
  background: var(--vbd-pink);
  min-height: 56px;
}
.vbd__totdoc {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 40px;
  background: #ececec;
  padding: 6px 12px;
  margin-top: 8px;
}
.vbd__totdoc-label {
  font-weight: 700;
  font-size: 9.5pt;
}
.vbd__totdoc-value {
  font-weight: 700;
  font-size: 12pt;
}
.vbd__footer {
  margin-top: 8px;
}
.vbd__legal {
  font-size: 5.5pt;
  line-height: 1.3;
  color: #333;
  text-align: center;
}
.vbd__page {
  font-size: 7pt;
  color: #444;
  margin-top: 4px;
}
@media print {
  .vbd {
    padding: 0;
    max-width: none;
    min-height: auto;
  }
}
`

/**
 * Costruisce l'HTML del layout "Vendita al banco" stile Danea (tema rosso),
 * partendo dal view-model condiviso con la conferma d'ordine.
 */
export function buildVenditaBancoDaneaHtml(model: ConfermaOrdineViewModel): string {
  const s = model.studio
  const telParts = [s.phone, s.cellPhone].filter(Boolean)
  const addrLines = [
    formatStudioAddressLine(s),
    telParts.length ? `Tel. ${telParts.join(' / ')}` : '',
    s.email ? `e-mail: ${s.email}` : '',
    s.vatNumber ? `P.iva ${s.vatNumber}` : '',
  ].filter(Boolean)

  const logoBlock = s.logoUrl ? `<img class="vbd__logo" src="${escapeHtml(s.logoUrl)}" alt="" />` : ''

  const docLabel = model.documentTitleLabel ?? 'Vendita al banco nr.'
  const totalLabel = model.totalLabel ?? 'Tot. documento'

  const formatSc = (sconto: number): string =>
    sconto ? `${sconto.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%` : ''

  const rowsHtml = model.lines
    .map(
      r => `
          <div class="vbd__row">
            <div>${escapeHtml(r.code)}</div>
            <div>${escapeHtml(r.description)}</div>
            <div class="vbd__num">${escapeHtml(r.qty)}${r.um ? ` ${escapeHtml(r.um)}` : ''}</div>
            <div class="vbd__num">${escapeHtml(formatEuroIt(r.priceIvato))}</div>
            <div class="vbd__num">${escapeHtml(formatSc(r.sconto))}</div>
            <div class="vbd__num">${escapeHtml(formatEuroIt(r.importo))}</div>
          </div>`,
    )
    .join('')

  return `
    <div class="vbd">
      <div class="vbd__name">${escapeHtml(s.name || 'FIXLab')}</div>
      <div class="vbd__rule"></div>
      <div class="vbd__head">
        <div class="vbd__brand">${logoBlock}</div>
        <div class="vbd__addr">${addrLines.map(l => escapeHtml(l)).join('<br/>')}</div>
      </div>

      <div class="vbd__docmeta">
        <span class="vbd__doc-label">${escapeHtml(docLabel)}</span>
        <span class="vbd__doc-box">${escapeHtml(model.orderNumber)}</span>
        <span class="vbd__doc-sep">del</span>
        <span class="vbd__doc-box">${escapeHtml(model.orderDate)}</span>
      </div>

      <div class="vbd__boxes">
        <div class="vbd__box">
          <div class="vbd__box-head">${escapeHtml(model.clientBoxTitle ?? 'Destinatario')}</div>
          <div class="vbd__box-body">${escapeHtml(model.clientBody)}</div>
        </div>
        <div class="vbd__box">
          <div class="vbd__box-head">${escapeHtml(model.rightBoxTitle ?? 'Destinazione')}</div>
          <div class="vbd__box-body">${escapeHtml(model.deviceBody)}</div>
        </div>
      </div>

      <div class="vbd__items">
        <div class="vbd__items-head">
          <div>Codice</div>
          <div>Descrizione</div>
          <div class="vbd__num">Quantità</div>
          <div class="vbd__num">Prezzo ivato</div>
          <div class="vbd__num">Sconto</div>
          <div class="vbd__num">Importo</div>
        </div>
        <div class="vbd__items-body">
          <div class="vbd__cols">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="vbd__rows">${rowsHtml}</div>
        </div>
      </div>

      <div class="vbd__totali-wrap">
        <div class="vbd__totali">
          <div class="vbd__totali-head">Totali</div>
          <div class="vbd__totali-body"></div>
        </div>
      </div>
      <div class="vbd__totdoc">
        <span class="vbd__totdoc-label">${escapeHtml(totalLabel)}</span>
        <span class="vbd__totdoc-value">${escapeHtml(formatEuroIt(model.total))}</span>
      </div>

      <div class="vbd__footer">
        <div class="vbd__legal">${escapeHtml(model.disclaimer)}</div>
        <div class="vbd__page">Pag. 1</div>
      </div>
    </div>
  `
}

function venditaBancoStudioToConferma(studio?: VenditaBancoStudioInfo): ConfermaOrdineStudio {
  return {
    name: studio?.name || 'FIXLab',
    subtitle: studio?.tagline,
    address: studio?.address,
    city: studio?.city,
    province: studio?.province,
    cap: studio?.cap,
    nation: 'Italia',
    vatNumber: studio?.vatNumber,
    phone: studio?.phone,
    cellPhone: studio?.fax,
    email: studio?.email,
    logoUrl: studio?.logoUrl,
  }
}

/** Stampa vendita al banco (layout Danea rosso, identico ad anteprima/PDF). */
export function printVenditaBancoDocument(doc: DocRecord, studio?: VenditaBancoStudioInfo): void {
  const ctx: VenditaBancoFIXLabPrintContext = {
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
  }
  const model = buildVenditaBancoConfermaModel(ctx, venditaBancoStudioToConferma(studio))
  printHtmlInIframe(buildVenditaBancoDaneaHtml(model), `Vendita al banco ${doc.fullNumber}`, VENDITA_BANCO_DANEA_CSS)
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

