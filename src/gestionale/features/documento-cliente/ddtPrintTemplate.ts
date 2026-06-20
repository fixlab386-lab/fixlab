import { escapeHtml } from '../../../lib/printDocument'
import { formatStudioAddressLine, type ConfermaOrdineStudio } from '../../../lib/confermaOrdineTemplate'

/** Riga della tabella DDT: solo codice / descrizione / quantità (nessun prezzo). */
export interface DdtPrintLine {
  code: string
  description: string
  qty: number
  um?: string
}

/** Dati trasporto stampati nel piede del DDT. */
export interface DdtPrintTransport {
  incaricato?: string
  causale?: string
  porto?: string
  colli?: string
  peso?: string
  aspetto?: string
  dataInizio?: string
}

export interface DdtPrintModel {
  studio: ConfermaOrdineStudio
  /** Titolo documento (es. "Doc. di trasporto"). */
  title: string
  number: string
  date: string
  destinatario: string
  destinazione: string
  lines: DdtPrintLine[]
  transport: DdtPrintTransport
}

/**
 * Foglio di stile DDT — riproduce fedelmente il documento di trasporto Danea Easyfatt:
 * intestazione azienda allineata a destra con logo, titolo a sinistra, riquadri
 * Destinatario/Destinazione, tabella codice/descrizione/quantità e piede trasporto
 * con firme. Usato sia per la stampa che per il PDF.
 */
export const DDT_PRINT_CSS = `
.ddt-doc {
  font-family: Arial, Helvetica, "Segoe UI", sans-serif;
  font-size: 9pt;
  color: #1a1a1a;
  background: #fff;
  max-width: 794px;
  margin: 0 auto;
  padding: 12mm 12mm 10mm;
  box-sizing: border-box;
  --ddt-gray: #7f7f7f;
  --ddt-accent: #8a7144;
  --ddt-blue: #1f3f8f;
  --ddt-line: #b9b9b9;
  --ddt-line-soft: #cfcfcf;
  --ddt-box-bg: #e9e9e9;
}
.ddt-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.ddt-head__company {
  text-align: right;
}
.ddt-head__top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.ddt-head__name {
  font-size: 18pt;
  font-weight: 700;
  color: var(--ddt-gray);
  line-height: 1;
}
.ddt-head__logo {
  height: 30px;
  object-fit: contain;
}
.ddt-head__subtitle {
  font-size: 7.5pt;
  color: var(--ddt-gray);
  margin-top: 1px;
}
.ddt-head__lines {
  font-size: 7pt;
  color: #444;
  line-height: 1.5;
  margin-top: 3px;
}
.ddt-title {
  margin: 2px 0 8px;
}
.ddt-title__main {
  font-size: 15pt;
  color: var(--ddt-gray);
  font-weight: 400;
}
.ddt-title__meta {
  display: block;
  font-size: 8.5pt;
  margin-top: 3px;
  color: #1a1a1a;
}
.ddt-title__meta b {
  font-weight: 700;
}
.ddt-title__meta .ddt-title__del {
  margin-left: 26px;
}
.ddt-boxes {
  display: flex;
  gap: 14px;
  margin-bottom: 10px;
}
.ddt-box {
  flex: 1;
  background: var(--ddt-box-bg);
  padding: 5px 8px 10px;
  min-height: 66px;
  box-sizing: border-box;
}
.ddt-box__title {
  font-size: 7.5pt;
  font-weight: 700;
  color: var(--ddt-accent);
  margin-bottom: 4px;
}
.ddt-box__body {
  font-size: 8.5pt;
  color: var(--ddt-blue);
  line-height: 1.55;
  white-space: pre-line;
}
.ddt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}
.ddt-table thead th {
  font-size: 8pt;
  font-weight: 700;
  color: var(--ddt-accent);
  text-align: left;
  padding: 3px 6px;
  background: #e2e2e2;
  border-top: 1px solid var(--ddt-line);
  border-bottom: 1px solid var(--ddt-line);
}
.ddt-table thead th.ddt-col-desc,
.ddt-table thead th.ddt-col-qty,
.ddt-table tbody td.ddt-col-desc,
.ddt-table tbody td.ddt-col-qty {
  border-left: 1px solid var(--ddt-line-soft);
}
.ddt-table th.ddt-col-qty,
.ddt-table td.ddt-col-qty {
  text-align: right;
  white-space: nowrap;
  width: 70px;
}
.ddt-table th.ddt-col-code,
.ddt-table td.ddt-col-code {
  width: 110px;
}
.ddt-table tbody td {
  padding: 4px 6px;
  vertical-align: top;
  color: #1a1a1a;
}
.ddt-spacer {
  min-height: 470px;
}
.ddt-foot {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--ddt-line);
  font-size: 8pt;
}
.ddt-foot td {
  border: 1px solid var(--ddt-line-soft);
  padding: 3px 5px 4px;
  vertical-align: top;
}
.ddt-foot__lbl {
  display: block;
  font-size: 6.5pt;
  color: var(--ddt-accent);
  margin-bottom: 9px;
}
.ddt-foot__val {
  display: block;
  font-size: 8pt;
  color: #1a1a1a;
  min-height: 10px;
}
.ddt-foot__sign {
  width: 22%;
}
.ddt-pageno {
  text-align: right;
  font-size: 7.5pt;
  color: #555;
  margin-top: 8px;
}
@media print {
  .ddt-doc {
    padding: 0;
    max-width: none;
  }
}
`

function studioHeaderLines(studio: ConfermaOrdineStudio): string[] {
  const telParts = [studio.phone, studio.cellPhone].filter(Boolean)
  return [
    formatStudioAddressLine(studio),
    telParts.length ? `Tel. ${telParts.join(' / ')}` : '',
    studio.email ? `e-mail: ${studio.email}` : '',
    studio.vatNumber ? `P.iva ${studio.vatNumber}` : '',
  ].filter(Boolean)
}

function qtyText(line: DdtPrintLine): string {
  return line.um ? `${line.qty} ${line.um}` : String(line.qty)
}

export function buildDdtPrintHtml(model: DdtPrintModel): string {
  const studio = model.studio
  const headLines = studioHeaderLines(studio)
  const logoBlock = studio.logoUrl
    ? `<img class="ddt-head__logo" src="${escapeHtml(studio.logoUrl)}" alt="" />`
    : ''
  const subtitle = studio.subtitle?.trim()
    ? `<div class="ddt-head__subtitle">${escapeHtml(studio.subtitle.trim())}</div>`
    : ''

  const rowsHtml = model.lines
    .filter(l => l.description.trim())
    .map(
      line =>
        `<tr>
          <td class="ddt-col-code">${escapeHtml(line.code)}</td>
          <td class="ddt-col-desc">${escapeHtml(line.description)}</td>
          <td class="ddt-col-qty">${escapeHtml(qtyText(line))}</td>
        </tr>`,
    )
    .join('')

  const t = model.transport
  const footCell = (label: string, value?: string, colspan?: number): string =>
    `<td${colspan ? ` colspan="${colspan}"` : ''}><span class="ddt-foot__lbl">${escapeHtml(
      label,
    )}</span><span class="ddt-foot__val">${escapeHtml(value ?? '')}</span></td>`

  return `
    <div class="ddt-doc">
      <header class="ddt-head">
        <div class="ddt-head__company">
          <div class="ddt-head__top">
            <span class="ddt-head__name">${escapeHtml(studio.name || 'FIXLab')}</span>
            ${logoBlock}
          </div>
          ${subtitle}
          <div class="ddt-head__lines">${headLines.map(l => escapeHtml(l)).join('<br/>')}</div>
        </div>
      </header>

      <div class="ddt-title">
        <span class="ddt-title__main">${escapeHtml(model.title)}</span>
        <span class="ddt-title__meta">n. <b>${escapeHtml(model.number)}</b><span class="ddt-title__del">del <b>${escapeHtml(
          model.date,
        )}</b></span></span>
      </div>

      <div class="ddt-boxes">
        <div class="ddt-box">
          <div class="ddt-box__title">Destinatario</div>
          <div class="ddt-box__body">${escapeHtml(model.destinatario)}</div>
        </div>
        <div class="ddt-box">
          <div class="ddt-box__title">Destinazione</div>
          <div class="ddt-box__body">${escapeHtml(model.destinazione)}</div>
        </div>
      </div>

      <table class="ddt-table">
        <thead>
          <tr>
            <th class="ddt-col-code">Codice</th>
            <th class="ddt-col-desc">Descrizione</th>
            <th class="ddt-col-qty">Quantità</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="ddt-spacer"></div>

      <table class="ddt-foot">
        <tbody>
          <tr>
            ${footCell('Incaricato del trasporto', t.incaricato, 2)}
            ${footCell('Causale del trasporto', t.causale)}
            ${footCell('Porto', t.porto)}
            <td class="ddt-foot__sign" rowspan="2"><span class="ddt-foot__lbl">Firma incaricato del trasporto</span></td>
            <td class="ddt-foot__sign" rowspan="2"><span class="ddt-foot__lbl">Firma destinatario</span></td>
          </tr>
          <tr>
            ${footCell('Nr. colli', t.colli)}
            ${footCell('Peso', t.peso)}
            ${footCell('Aspetto esteriore dei beni', t.aspetto)}
            ${footCell('Data e ora inizio trasporto', t.dataInizio)}
          </tr>
        </tbody>
      </table>

      <div class="ddt-pageno">Pag. 1</div>
    </div>
  `
}
