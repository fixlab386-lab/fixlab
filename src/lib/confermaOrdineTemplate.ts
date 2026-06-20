import type { Repair, RepairProduct } from '../types'
import { calcLineAmount, normalizeRepairLine } from '../components/repair/repairLineUtils'
import { DEFAULT_VAT_PERCENT } from '../gestionale/lib/constants'
import { escapeHtml, printHtmlInIframe, buildPrintHtmlPage } from './printDocument'

export interface ConfermaOrdineStudio {
  name: string
  subtitle?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  nation?: string
  vatNumber?: string
  phone?: string
  cellPhone?: string
  email?: string
  logoUrl?: string
  disclaimer?: string
}

export interface ConfermaOrdineLineRow {
  code: string
  description: string
  qty: number
  priceIvato: number
  sconto: number
  importo: number
  iva: number
  /** Unità di misura (es. "pz"). Mostrata accanto alla quantità se presente. */
  um?: string
}

export interface ConfermaOrdineTransport {
  causale?: string
  aspetto?: string
  colli?: string
  peso?: string
  porto?: string
  dataInizio?: string
  incaricato?: string
}

export interface ConfermaOrdineViewModel {
  orderNumber: string
  orderDate: string
  studio: ConfermaOrdineStudio
  clientBody: string
  deviceBody: string
  lines: ConfermaOrdineLineRow[]
  deposit: number
  total: number
  disclaimer: string
  /** Es. "Conferma d'ordine nr." o "Preventivo nr." */
  documentTitleLabel?: string
  clientBoxTitle?: string
  rightBoxTitle?: string
  showRightBox?: boolean
  signatureLabel?: string
  totalLabel?: string
  /** Colonna Codice in tabella (default true). */
  showCodeColumn?: boolean
  /** Colonne Prezzo ivato / Sconto / Importo (default true). Falso per DDT. */
  showPriceColumns?: boolean
  /** Colonna Iva (default true). Falso per vendita al banco / DDT. */
  showIvaColumn?: boolean
  /** Piede documento: conferma (firma+acconto+totale), total (solo totale), ddt (campi trasporto). */
  footerMode?: 'conferma' | 'total' | 'ddt'
  /** Dati trasporto per footerMode === 'ddt'. */
  transport?: ConfermaOrdineTransport
}

export type ConfermaOrdinePrintOptions = {
  titoloStampa?: string
  noteFine?: string
  template?: {
    clientBoxTitle?: string
    secondBoxTitle?: string
    showSecondBox?: boolean
    signatureLabel?: string
    totalLabel?: string
  }
}

export const DEFAULT_CONFERMA_ORDINE_DISCLAIMER = `Ai sensi del D.Lgs. 196/2003 Vi informiamo che i Vs. dati saranno utilizzati esclusivamente per i fini connessi ai rapporti commerciali tra di noi in essere. Contributo CONAI assolto ove dovuto - Vi preghiamo di controllare i Vs. dati anagrafici, la P. IVA e il Cod. Fiscale. Non ci riteniamo responsabili di eventuali errori. Nell'eventualità in cui l'apparato, riparato o no, non sia ritirato entro 3 mesi, si autorizza il laboratorio alla demolizione o vendita del suddetto per il recupero delle spese gestionali.`

export const DEFAULT_VENDITA_BANCO_DISCLAIMER = `Contributo CONAI assolto ove dovuto - Vi preghiamo di controllare i Vs. dati anagrafici, la P. IVA e il Cod. Fiscale. Non ci riteniamo responsabili di eventuali errori. Nel rispetto della normativa vigente, ivi incluso DL 196/03 e reg. UE 2016/679, informiamo che i Vs. dati saranno utilizzati ai soli fini connessi ai rapporti commerciali tra di noi in essere.`

export const CONFERMA_ORDINE_PRINT_CSS = `
.co-print {
  font-family: Arial, Helvetica, "Segoe UI", sans-serif;
  font-size: 10pt;
  line-height: 1.35;
  color: #000;
  background: #fff;
  max-width: 794px;
  margin: 0 auto;
  padding: 10mm 11mm 10mm;
  box-sizing: border-box;
}
.co-print__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 4px;
}
.co-print__brand {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.co-print__logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
  flex-shrink: 0;
}
.co-print__brand-text {
  min-width: 0;
}
.co-print__studio-name {
  font-size: 13pt;
  font-weight: 700;
  margin: 0;
}
.co-print__studio-lines {
  font-size: 8pt;
  line-height: 1.4;
  margin-top: 2px;
}
.co-print__doc-meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8.5pt;
  white-space: nowrap;
  padding-bottom: 2px;
}
.co-print__doc-box {
  display: inline-block;
  border: 1px solid #000;
  padding: 1px 8px;
  font-weight: 700;
  font-size: 9pt;
  min-width: 24px;
  text-align: center;
}
.co-print__boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #000;
  border-bottom: 1px solid #000;
}
.co-print__boxes--single {
  grid-template-columns: 1fr;
}
.co-print__box {
  padding: 4px 6px 8px;
  background: #fff;
  min-height: 74px;
}
.co-print__box + .co-print__box {
  border-left: 1px solid #000;
}
.co-print__box-title {
  font-weight: 700;
  font-size: 8pt;
  margin-bottom: 4px;
}
.co-print__box-body {
  font-size: 8pt;
  line-height: 1.45;
  white-space: pre-line;
}
.co-print__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  margin-top: 6px;
}
.co-print__table thead tr {
  border-bottom: 1px solid #000;
}
.co-print__table th {
  font-weight: 700;
  text-align: left;
  padding: 2px 3px 3px;
  vertical-align: bottom;
}
.co-print__table th.num,
.co-print__table td.num {
  text-align: right;
  white-space: nowrap;
}
.co-print__table td {
  padding: 3px 3px;
  vertical-align: top;
}
.co-print__table tbody tr {
  border-bottom: 1px solid #e0e0e0;
}
.co-print__spacer {
  min-height: 32px;
}
.co-print__acconto {
  font-size: 8pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2px;
}
.co-print__footer {
  border-top: 1px solid #000;
  padding-top: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.co-print__sig {
  font-weight: 700;
  font-size: 8pt;
}
.co-print__total-box {
  border: 1px solid #000;
  padding: 3px 8px 4px;
  min-width: 150px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.co-print__total-label {
  font-weight: 700;
  font-size: 8pt;
}
.co-print__total-value {
  font-weight: 700;
  font-size: 11pt;
}
.co-print__legal {
  margin-top: 10px;
  display: flex;
  gap: 12px;
  line-height: 1.25;
  color: #333;
}
.co-print__legal-date {
  flex-shrink: 0;
  font-size: 7pt;
  color: #000;
}
.co-print__legal-text {
  flex: 1;
  font-size: 5.5pt;
  text-align: justify;
}
.co-print__totals-only {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.co-print__totals-only-box {
  min-width: 200px;
}
.co-print__totals-only-head {
  border: 1px solid #000;
  background: #f0f0f0;
  font-weight: 700;
  font-size: 8pt;
  padding: 2px 6px;
  text-align: center;
}
.co-print__totals-only-row {
  border: 1px solid #000;
  border-top: none;
  display: flex;
  justify-content: space-between;
  padding: 4px 8px 5px;
}
.co-print__totals-only-label {
  font-weight: 700;
  font-size: 8pt;
}
.co-print__totals-only-value {
  font-weight: 700;
  font-size: 11pt;
}
.co-print__ddt {
  margin-top: 28px;
  border: 1px solid #000;
}
.co-print__ddt-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.co-print__ddt-row + .co-print__ddt-row {
  border-top: 1px solid #000;
}
.co-print__ddt-cell {
  padding: 3px 5px 12px;
  min-height: 34px;
}
.co-print__ddt-cell + .co-print__ddt-cell {
  border-left: 1px solid #000;
}
.co-print__ddt-lbl {
  display: block;
  font-size: 7pt;
  color: #333;
  margin-bottom: 2px;
}
.co-print__ddt-val {
  font-size: 8pt;
  white-space: pre-line;
}
.co-print__ddt-row--sign .co-print__ddt-cell {
  grid-column: span 2;
  min-height: 40px;
}
@media print {
  .co-print {
    padding: 0;
    max-width: none;
    display: flex;
    flex-direction: column;
    min-height: 96vh;
  }
  .co-print__spacer {
    flex: 1 1 auto;
  }
}
`

export function formatEuroIt(amount: number): string {
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = amount < 0 ? '-' : ''
  return `${sign}€ ${grouped},${decPart}`
}

export function formatDateIt(input?: string | Date | null): string {
  if (!input) return ''
  let d: Date
  if (input instanceof Date) {
    d = input
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    d = new Date(`${input}T12:00:00`)
  } else {
    d = new Date(input)
  }
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function repairCreatedAt(repair: Repair): Date {
  const ca = repair.createdAt as unknown
  if (ca instanceof Date) return ca
  if (ca && typeof ca === 'object' && 'toDate' in ca && typeof (ca as { toDate: () => Date }).toDate === 'function') {
    return (ca as { toDate: () => Date }).toDate()
  }
  if (ca && typeof ca === 'object' && 'seconds' in ca) {
    return new Date((ca as { seconds: number }).seconds * 1000)
  }
  return new Date()
}

export function resolveOrderNumber(repair: Repair): string {
  if (repair.repairSequence != null && repair.repairYear) {
    return `${repair.repairSequence}/${repair.repairYear}`
  }
  if (repair.ticketNumber) return repair.ticketNumber
  if (repair.id) return `FIX-${repair.id.slice(-6).toUpperCase()}`
  return '—'
}

export function resolveAcceptanceDate(repair: Repair): string {
  return formatDateIt(repair.acceptanceDate) || formatDateIt(repairCreatedAt(repair))
}

export function resolveDisclaimer(studio?: ConfermaOrdineStudio): string {
  const text = studio?.disclaimer?.trim() || DEFAULT_CONFERMA_ORDINE_DISCLAIMER
  const name = studio?.name?.trim() || 'il laboratorio'
  return text.replace(/il laboratorio/gi, name)
}

function lineDescription(line: RepairProduct): string {
  return (line.description || line.name || '').trim()
}

export function buildReceiptLines(repair: Repair): RepairProduct[] {
  const rows = (repair.products || []).map(normalizeRepairLine)
  if ((repair.laborCost || 0) > 0) {
    rows.push(
      normalizeRepairLine({
        code: 'MAN',
        name: 'Manodopera',
        description: 'Manodopera',
        price: repair.laborCost,
        qty: 1,
        discount: 0,
      }),
    )
  }
  return rows
}

export function sumReceiptLines(lines: RepairProduct[]): number {
  return lines.reduce((sum, line) => sum + calcLineAmount(line), 0)
}

export function formatStudioAddressLine(studio: ConfermaOrdineStudio): string {
  const cityPart = [studio.cap, studio.city, studio.province ? `(${studio.province})` : ''].filter(Boolean).join(' ')
  const nation = studio.nation?.trim() || 'Italy'
  if (studio.address) {
    return cityPart ? `${studio.address} - ${cityPart} - ${nation}` : `${studio.address} - ${nation}`
  }
  return cityPart ? `${cityPart} - ${nation}` : nation
}

export function buildClientBody(repair: Repair): string {
  const lines: string[] = []
  if (repair.clientName?.trim()) lines.push(repair.clientName.trim())
  if (repair.clientAddress?.trim()) lines.push(repair.clientAddress.trim())
  const capCity = [repair.clientCap, repair.clientCity, repair.clientProvince ? `(${repair.clientProvince})` : '']
    .filter(Boolean)
    .join(' ')
  if (capCity) lines.push(capCity)
  lines.push('')
  lines.push(`Cell: ${repair.clientPhone?.trim() || ''}`)
  lines.push(`E-mail: ${repair.clientEmail?.trim() || ''}`)
  return lines.join('\n')
}

export function buildDeviceBody(repair: Repair): string {
  const imei = repair.imei?.trim() || ''
  const lockCode = (repair.deviceLockCode || repair.devicePin || '').trim()
  const account = [repair.deviceAccount, repair.devicePassword].filter(v => v?.trim()).join(' ').trim()
  const notes = repair.deviceCondition?.trim() || repair.notes?.trim() || ''
  return [
    `IMEI e S/N: ${imei}`,
    `Codice Blocco: ${lockCode}`,
    `Account e Password: ${account}`,
    '',
    `Note: ${notes}`,
  ].join('\n')
}

function toLineRow(line: RepairProduct): ConfermaOrdineLineRow {
  const normalized = normalizeRepairLine(line)
  const amount = normalized.amount ?? calcLineAmount(normalized)
  return {
    code: normalized.code || '',
    description: lineDescription(normalized) || '—',
    qty: normalized.qty,
    priceIvato: normalized.price,
    sconto: normalized.discount || 0,
    importo: amount,
    iva: normalized.vatPercent ?? DEFAULT_VAT_PERCENT,
  }
}

export function buildConfermaOrdineViewModel(
  repair: Repair,
  studio?: ConfermaOrdineStudio,
  printOptions?: ConfermaOrdinePrintOptions,
): ConfermaOrdineViewModel {
  const receiptLines = buildReceiptLines(repair)
  let lines = receiptLines.map(toLineRow)
  if (lines.length === 0) {
    lines = [
      toLineRow(
        normalizeRepairLine({
          code: '',
          name: repair.problem || 'Riparazione',
          description: repair.problem || 'Riparazione',
          price: repair.totalCost || 0,
          qty: 1,
          discount: 0,
        }),
      ),
    ]
  }

  const titleBase = printOptions?.titoloStampa?.trim() || "Conferma d'ordine"
  const titleLabel = titleBase.toLowerCase().endsWith('nr.') ? titleBase : `${titleBase} nr.`
  const disclaimerText = printOptions?.noteFine?.trim() || resolveDisclaimer(studio)
  const tpl = printOptions?.template

  return {
    orderNumber: resolveOrderNumber(repair),
    orderDate: resolveAcceptanceDate(repair),
    studio: studio || { name: 'FIXLab' },
    clientBody: buildClientBody(repair),
    deviceBody: buildDeviceBody(repair),
    lines,
    deposit: repair.deposit || 0,
    total: sumReceiptLines(receiptLines) || repair.totalCost || 0,
    disclaimer: disclaimerText,
    documentTitleLabel: titleLabel,
    clientBoxTitle: tpl?.clientBoxTitle ?? 'Cliente',
    rightBoxTitle: tpl?.secondBoxTitle ?? 'Informazioni dispositivo',
    showRightBox: tpl?.showSecondBox ?? true,
    signatureLabel: tpl?.signatureLabel ?? 'Firma per accettazione',
    totalLabel: tpl?.totalLabel ?? 'Tot. documento',
  }
}

export function buildConfermaOrdineHtml(model: ConfermaOrdineViewModel): string {
  const studio = model.studio
  const telParts = [studio.phone, studio.cellPhone].filter(Boolean)
  const studioLines = [
    formatStudioAddressLine(studio),
    telParts.length ? `Tel. ${telParts.join(' / ')}` : '',
    studio.email ? `e-mail: ${studio.email}` : '',
    studio.vatNumber ? `P.Iva ${studio.vatNumber}` : '',
  ].filter(Boolean)

  const logoBlock = studio.logoUrl
    ? `<img class="co-print__logo" src="${escapeHtml(studio.logoUrl)}" alt="" />`
    : ''

  const showCode = model.showCodeColumn !== false
  const showPrices = model.showPriceColumns !== false
  const showIva = showPrices && model.showIvaColumn !== false
  const footerMode = model.footerMode ?? 'conferma'

  const qtyText = (row: ConfermaOrdineLineRow): string =>
    row.um ? `${row.qty} ${row.um}` : String(row.qty)

  const headHtml = [
    showCode ? '<th>Codice</th>' : '',
    '<th>Descrizione</th>',
    '<th class="num">Quantità</th>',
    showPrices ? '<th class="num">Prezzo ivato</th><th class="num">Sconto</th><th class="num">Importo</th>' : '',
    showIva ? '<th class="num">Iva</th>' : '',
  ].join('')

  const rowsHtml = model.lines
    .map(row =>
      [
        '<tr>',
        showCode ? `<td>${escapeHtml(row.code)}</td>` : '',
        `<td>${escapeHtml(row.description)}</td>`,
        `<td class="num">${escapeHtml(qtyText(row))}</td>`,
        showPrices
          ? `<td class="num">${escapeHtml(formatEuroIt(row.priceIvato))}</td><td class="num">${
              row.sconto ? escapeHtml(formatEuroIt(row.sconto)) : ''
            }</td><td class="num">${escapeHtml(formatEuroIt(row.importo))}</td>`
          : '',
        showIva ? `<td class="num">${escapeHtml(String(row.iva))}</td>` : '',
        '</tr>',
      ].join(''),
    )
    .join('')

  const depositText = model.deposit ? formatEuroIt(model.deposit) : ''
  const docTitle = model.documentTitleLabel ?? "Conferma d'ordine nr."
  const clientTitle = model.clientBoxTitle ?? 'Cliente'
  const rightTitle = model.rightBoxTitle ?? 'Informazioni dispositivo'
  const signatureLabel = model.signatureLabel ?? 'Firma per accettazione'
  const totalLabel = model.totalLabel ?? 'Tot. documento'
  const showRight = model.showRightBox === true

  const boxesClass = showRight ? 'co-print__boxes' : 'co-print__boxes co-print__boxes--single'
  const rightBoxHtml = showRight
    ? `<div class="co-print__box">
          <div class="co-print__box-title">${escapeHtml(rightTitle)}</div>
          <div class="co-print__box-body">${escapeHtml(model.deviceBody)}</div>
        </div>`
    : ''

  const t = model.transport ?? {}
  const ddtCell = (label: string, value?: string): string =>
    `<div class="co-print__ddt-cell"><span class="co-print__ddt-lbl">${escapeHtml(label)}</span><span class="co-print__ddt-val">${escapeHtml(value ?? '')}</span></div>`

  let footerHtml = ''
  if (footerMode === 'ddt') {
    footerHtml = `
      <div class="co-print__ddt">
        <div class="co-print__ddt-row">
          ${ddtCell('Causale del trasporto', t.causale)}
          ${ddtCell('Aspetto esteriore dei beni', t.aspetto)}
          ${ddtCell('Nr. colli', t.colli)}
          ${ddtCell('Peso', t.peso)}
        </div>
        <div class="co-print__ddt-row">
          ${ddtCell('Porto', t.porto)}
          ${ddtCell('Data e ora inizio trasporto', t.dataInizio)}
          ${ddtCell('Incaricato del trasporto', t.incaricato)}
          ${ddtCell('', '')}
        </div>
        <div class="co-print__ddt-row co-print__ddt-row--sign">
          ${ddtCell('Firma incaricato del trasporto', '')}
          ${ddtCell('Firma destinatario', '')}
        </div>
      </div>`
  } else if (footerMode === 'total') {
    footerHtml = `
      <div class="co-print__totals-only">
        <div class="co-print__totals-only-box">
          <div class="co-print__totals-only-head">Totali</div>
          <div class="co-print__totals-only-row">
            <span class="co-print__totals-only-label">${escapeHtml(totalLabel)}</span>
            <span class="co-print__totals-only-value">${escapeHtml(formatEuroIt(model.total))}</span>
          </div>
        </div>
      </div>`
  } else {
    footerHtml = `
      <div class="co-print__acconto">Acconto: ${escapeHtml(depositText)}</div>
      <footer class="co-print__footer">
        <div class="co-print__sig">${escapeHtml(signatureLabel)}</div>
        <div class="co-print__total-box">
          <span class="co-print__total-label">${escapeHtml(totalLabel)}</span>
          <span class="co-print__total-value">${escapeHtml(formatEuroIt(model.total))}</span>
        </div>
      </footer>`
  }

  const legalHtml = model.disclaimer
    ? footerMode === 'conferma'
      ? `<div class="co-print__legal"><span class="co-print__legal-date">${escapeHtml(model.orderDate)}</span><span class="co-print__legal-text">${escapeHtml(model.disclaimer)}</span></div>`
      : `<div class="co-print__legal"><span class="co-print__legal-text">${escapeHtml(model.disclaimer)}</span></div>`
    : ''

  return `
    <div class="co-print">
      <header class="co-print__header">
        <div class="co-print__brand">
          ${logoBlock}
          <div class="co-print__brand-text">
            <div class="co-print__studio-name">${escapeHtml(studio.name || 'FIXLab')}</div>
            <div class="co-print__studio-lines">${studioLines.map(l => escapeHtml(l)).join('<br/>')}</div>
          </div>
        </div>
        <div class="co-print__doc-meta">
          <span>${escapeHtml(docTitle)}</span>
          <span class="co-print__doc-box">${escapeHtml(model.orderNumber)}</span>
          <span>del</span>
          <span class="co-print__doc-box">${escapeHtml(model.orderDate)}</span>
        </div>
      </header>

      <div class="${boxesClass}">
        <div class="co-print__box">
          <div class="co-print__box-title">${escapeHtml(clientTitle)}</div>
          <div class="co-print__box-body">${escapeHtml(model.clientBody)}</div>
        </div>
        ${rightBoxHtml}
      </div>

      <table class="co-print__table">
        <thead>
          <tr>${headHtml}</tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="co-print__spacer"></div>

      ${footerHtml}

      ${legalHtml}
    </div>
  `
}

export function confermaOrdineFilename(repair: Repair): string {
  const num = resolveOrderNumber(repair).replace(/\//g, '-')
  const client = (repair.clientName || 'cliente').replace(/\s+/g, '_').replace(/[^\w-]/g, '')
  return `Conferma_ordine_${num}_${client}.pdf`
}

export function printConfermaOrdineHtml(model: ConfermaOrdineViewModel): void {
  printHtmlInIframe(buildConfermaOrdineHtml(model), `Conferma d'ordine ${model.orderNumber}`, CONFERMA_ORDINE_PRINT_CSS)
}

export function previewConfermaOrdineHtml(model: ConfermaOrdineViewModel): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    alert('Popup bloccato dal browser. Consenti i popup per l\'anteprima.')
    return
  }
  win.document.open()
  win.document.write(buildPrintHtmlPage(buildConfermaOrdineHtml(model), `Conferma d'ordine ${model.orderNumber}`, CONFERMA_ORDINE_PRINT_CSS))
  win.document.close()
  win.focus()
}
