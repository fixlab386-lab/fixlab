import jsPDF from 'jspdf'

/** Intestazione condivisa per anteprima, stampa e PDF. */
export type PrintDocumentHeader = {
  documentTitle: string
  archiveName: string
  studioName?: string
  studioSubtitle?: string
  logoUrl?: string
  generatedAt?: Date
}

export type PrintModel<TContext> = {
  id: string
  label: string
  requiresSelection?: boolean
  isDisabled?: (context: TContext) => boolean
  disabledHint?: string
  renderBody: (context: TContext) => string
}

export function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatPrintDate(date = new Date()): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildPrintFilename(prefix: string, label: string, archiveName: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  const safe = (value: string) =>
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40)
  return `${safe(prefix)}_${safe(label)}_${safe(archiveName)}_${day}.pdf`
}

export const PRINT_DOCUMENT_CSS = `
.print-doc {
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 11px;
  line-height: 1.45;
  color: #1a1a1a;
  background: #fff;
}
.print-doc__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 2px solid #2b7ab5;
}
.print-doc__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.print-doc__logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}
.print-doc__logo-fallback {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  background: #2b7ab5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
}
.print-doc__studio-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a5fb4;
}
.print-doc__studio-sub {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}
.print-doc__meta {
  text-align: right;
  flex-shrink: 0;
}
.print-doc__title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
}
.print-doc__archive,
.print-doc__date {
  font-size: 10px;
  color: #666;
  margin-top: 3px;
}
.print-doc__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.print-doc__table th,
.print-doc__table td {
  border: 1px solid #d5dde6;
  padding: 5px 7px;
  text-align: left;
  vertical-align: top;
}
.print-doc__table th {
  background: #eef4fa;
  font-weight: 700;
  color: #1a5fb4;
}
.print-doc__table tr:nth-child(even) td {
  background: #f8fafc;
}
.print-doc__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.print-doc__list-item {
  padding: 8px 0;
  border-bottom: 1px dashed #d5dde6;
}
.print-doc__list-item:last-child {
  border-bottom: none;
}
.print-doc__list-name {
  font-weight: 700;
  font-size: 12px;
  margin-bottom: 2px;
}
.print-doc__list-line {
  font-size: 10px;
  color: #444;
}
.print-doc__card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 18px;
}
.print-doc__card-section {
  margin-bottom: 12px;
}
.print-doc__card-section--full {
  grid-column: 1 / -1;
}
.print-doc__section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #1a5fb4;
  border-bottom: 1px solid #d5dde6;
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.print-doc__field {
  margin-bottom: 6px;
}
.print-doc__field-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
}
.print-doc__field-value {
  font-size: 11px;
  font-weight: 500;
}
.print-doc__footer {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #e5ebf1;
  font-size: 9px;
  color: #888;
  text-align: center;
}
@media print {
  body { margin: 0; }
  .print-doc { padding: 0; }
}
`

export function renderPrintHeader(header: PrintDocumentHeader): string {
  const date = formatPrintDate(header.generatedAt)
  const studioInitials = (header.studioName || header.archiveName || 'FL')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const logoBlock = header.logoUrl
    ? `<img class="print-doc__logo" src="${escapeHtml(header.logoUrl)}" alt="" />`
    : `<div class="print-doc__logo-fallback">${escapeHtml(studioInitials)}</div>`

  return `
    <header class="print-doc__header">
      <div class="print-doc__brand">
        ${logoBlock}
        <div>
          <div class="print-doc__studio-name">${escapeHtml(header.studioName || header.archiveName)}</div>
          ${header.studioSubtitle ? `<div class="print-doc__studio-sub">${escapeHtml(header.studioSubtitle)}</div>` : ''}
        </div>
      </div>
      <div class="print-doc__meta">
        <div class="print-doc__title">${escapeHtml(header.documentTitle)}</div>
        <div class="print-doc__archive">Archivio: ${escapeHtml(header.archiveName)}</div>
        <div class="print-doc__date">Generato il ${escapeHtml(date)}</div>
      </div>
    </header>
  `
}

export function wrapPrintDocument(header: PrintDocumentHeader, bodyHtml: string, footerNote?: string): string {
  return `
    <div class="print-doc">
      ${renderPrintHeader(header)}
      <main class="print-doc__body">${bodyHtml}</main>
      <footer class="print-doc__footer">${escapeHtml(footerNote || `${header.documentTitle} — ${header.archiveName}`)}</footer>
    </div>
  `
}

export function buildPrintHtmlPage(innerHtml: string, title: string, extraCss = ''): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_DOCUMENT_CSS}${extraCss}</style>
</head>
<body>${innerHtml}</body>
</html>`
}

/** Stampa in iframe nascosto — non richiede popup del browser. */
export function printHtmlInIframe(innerHtml: string, title: string, extraCss = ''): void {
  const fullPage = buildPrintHtmlPage(innerHtml, title, extraCss)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc) {
    document.body.removeChild(iframe)
    alert('Stampa non disponibile.')
    return
  }

  doc.open()
  doc.write(fullPage)
  doc.close()

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe)
  }

  const doPrint = () => {
    try {
      win?.focus()
      win?.print()
    } catch {
      alert('Stampa non riuscita.')
    }
    setTimeout(cleanup, 1200)
  }

  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 300)
  } else {
    iframe.onload = () => setTimeout(doPrint, 300)
  }
}

/** Apre anteprima stampa senza dialogo di stampa automatico. */
export function previewHtmlDocument(innerHtml: string, title: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    alert('Popup bloccato dal browser. Consenti i popup per l\'anteprima.')
    return
  }
  win.document.open()
  win.document.write(buildPrintHtmlPage(innerHtml, title))
  win.document.close()
  win.focus()
}

/** Apre il dialogo di stampa del browser sul contenuto HTML. */
export function printHtmlDocument(innerHtml: string, title: string, extraCss = ''): void {
  printHtmlInIframe(innerHtml, title, extraCss)
}

/** Genera e scarica un PDF dal contenuto HTML (jsPDF, come generateRepairPDF). */
export async function downloadHtmlAsPdf(innerHtml: string, filename: string, extraCss = ''): Promise<void> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.background = '#fff'
  container.innerHTML = `<style>${PRINT_DOCUMENT_CSS}${extraCss}</style>${innerHtml}`
  document.body.appendChild(container)

  try {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    await pdf.html(container, {
      margin: [10, 10, 12, 10],
      autoPaging: 'text',
      width: 190,
      windowWidth: 794,
      html2canvas: { scale: 0.75, useCORS: true },
    })
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
