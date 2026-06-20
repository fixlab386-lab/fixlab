import html2canvas from 'html2canvas'
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

const PDF_PAGE_WIDTH_PX = 794
const PDF_MARGIN_MM = 10

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

/** Pagina HTML per PDF/stampa template gestionale (solo CSS del modello, come in anteprima). */
function buildTemplatePdfHtmlPage(innerHtml: string, templateCss: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>PDF</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      width: ${PDF_PAGE_WIDTH_PX}px;
    }
    ${templateCss}
  </style>
</head>
<body>${innerHtml}</body>
</html>`
}

const PDF_TEMPLATE_ROOT_SELECTORS = ['.co-print', '.vbd', '.ddt-doc', '.print-doc'] as const

const VBD_CSS_VARS: Record<string, string> = {
  '--vbd-red': '#d6334f',
  '--vbd-pink': '#fbe7ec',
  '--vbd-sep': '#f1ccd4',
}

function resolvePdfCaptureTarget(doc: Document): HTMLElement {
  for (const selector of PDF_TEMPLATE_ROOT_SELECTORS) {
    const el = doc.querySelector(selector)
    if (el instanceof HTMLElement) return el
  }
  const first = doc.body.firstElementChild
  if (first instanceof HTMLElement) return first
  return doc.body
}

function prepareClonedTemplateRoot(root: HTMLElement): void {
  if (root.classList.contains('vbd')) {
    for (const [key, value] of Object.entries(VBD_CSS_VARS)) {
      root.style.setProperty(key, value)
    }
  }
  root.style.background = '#ffffff'
  root.style.boxSizing = 'border-box'
}

/** Stampa in iframe nascosto — non richiede popup del browser. */
export function printHtmlInIframe(innerHtml: string, title: string, extraCss = ''): void {
  const fullPage = extraCss.trim()
    ? buildTemplatePdfHtmlPage(innerHtml, extraCss)
    : buildPrintHtmlPage(innerHtml, title, extraCss)
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

async function waitForDocumentReady(doc: Document): Promise<void> {
  if (doc.fonts?.ready) await doc.fonts.ready
  await Promise.all(
    Array.from(doc.images).map(
      img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }),
    ),
  )
  await new Promise(resolve => setTimeout(resolve, 80))
}

function addCanvasPagesToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, marginMm: number): void {
  const pageWidthMm = 210
  const pageHeightMm = 297
  const contentWidthMm = pageWidthMm - marginMm * 2
  const contentHeightMm = pageHeightMm - marginMm * 2
  const pxPerMm = canvas.width / contentWidthMm
  const pageHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm))

  let offsetY = 0
  let pageIndex = 0

  while (offsetY < canvas.height) {
    if (pageIndex > 0) pdf.addPage()

    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight
    const ctx = pageCanvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non disponibile')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

    pdf.addImage(
      pageCanvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      marginMm,
      marginMm,
      contentWidthMm,
      sliceHeight / pxPerMm,
    )

    offsetY += sliceHeight
    pageIndex += 1
  }
}

/** Genera e scarica un PDF dal contenuto HTML (iframe + html2canvas). */
export async function downloadHtmlAsPdf(innerHtml: string, filename: string, extraCss = ''): Promise<void> {
  const usesTemplateCss = extraCss.trim().length > 0
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${PDF_PAGE_WIDTH_PX}px;min-height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1;overflow:hidden;`
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = win?.document
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Generazione PDF non disponibile')
  }

  try {
    doc.open()
    doc.write(
      usesTemplateCss
        ? buildTemplatePdfHtmlPage(innerHtml, extraCss)
        : buildPrintHtmlPage(innerHtml, 'PDF', extraCss),
    )
    doc.close()

    await new Promise<void>(resolve => {
      if (doc.readyState === 'complete') resolve()
      else iframe.onload = () => resolve()
    })
    await waitForDocumentReady(doc)

    const target = resolvePdfCaptureTarget(doc)
    const captureWidth = Math.max(target.scrollWidth, target.offsetWidth, PDF_PAGE_WIDTH_PX)

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: captureWidth,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      onclone: clonedDoc => {
        const clonedTarget = resolvePdfCaptureTarget(clonedDoc)
        prepareClonedTemplateRoot(clonedTarget)
        clonedTarget.style.width = `${captureWidth}px`
      },
    })

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Contenuto PDF vuoto')
    }

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    addCanvasPagesToPdf(pdf, canvas, PDF_MARGIN_MM)
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  } finally {
    if (iframe.parentNode) document.body.removeChild(iframe)
  }
}
