import jsPDF from 'jspdf'
import type { Repair } from '../types'
import {
  buildConfermaOrdineHtml,
  buildConfermaOrdineViewModel,
  confermaOrdineFilename,
  formatEuroIt,
  type ConfermaOrdineLineRow,
  type ConfermaOrdinePrintOptions,
  type ConfermaOrdineStudio,
  type ConfermaOrdineViewModel,
} from './confermaOrdineTemplate'

export type RepairReceiptStudio = ConfermaOrdineStudio

export {
  DEFAULT_CONFERMA_ORDINE_DISCLAIMER as DEFAULT_REPAIR_RECEIPT_DISCLAIMER,
  buildConfermaOrdineViewModel,
  buildConfermaOrdineHtml,
  buildClientBody,
  buildDeviceBody,
  buildReceiptLines,
  confermaOrdineFilename,
  formatDateIt,
  formatEuroIt,
  formatStudioAddressLine,
  printConfermaOrdineHtml,
  previewConfermaOrdineHtml,
  resolveAcceptanceDate,
  resolveDisclaimer,
  resolveOrderNumber,
  sumReceiptLines,
} from './confermaOrdineTemplate'

export interface RepairReceiptPdfOptions {
  logoDataUrl?: string
  skipSave?: boolean
  printOptions?: ConfermaOrdinePrintOptions
}

const PAGE_W = 210
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_ZONE_Y = 248

type ColDef = { label: string; x: number; w: number; align: 'left' | 'right' }

const TABLE_COLS: ColDef[] = [
  { label: 'Codice', x: MARGIN, w: 22, align: 'left' },
  { label: 'Descrizione', x: MARGIN + 22, w: 58, align: 'left' },
  { label: 'Quantità', x: MARGIN + 80, w: 16, align: 'right' },
  { label: 'Prezzo ivato', x: MARGIN + 96, w: 26, align: 'right' },
  { label: 'Sconto', x: MARGIN + 122, w: 20, align: 'right' },
  { label: 'Importo', x: MARGIN + 142, w: 26, align: 'right' },
  { label: 'Iva', x: MARGIN + 168, w: 18, align: 'right' },
]

function drawThinRect(pdf: jsPDF, x: number, y: number, w: number, h: number, fill?: boolean) {
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.2)
  if (fill) {
    pdf.setFillColor(240, 240, 240)
    pdf.rect(x, y, w, h, 'FD')
  } else {
    pdf.rect(x, y, w, h)
  }
}

function drawValueBox(pdf: jsPDF, x: number, y: number, w: number, h: number, value: string, fontSize = 9) {
  drawThinRect(pdf, x, y, w, h)
  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'bold')
  pdf.text(value, x + w / 2, y + h - 2.2, { align: 'center', maxWidth: w - 2 })
}

function drawBlockTitle(pdf: jsPDF, x: number, y: number, title: string) {
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, x + 2, y)
}

function drawPreLineBlock(pdf: jsPDF, x: number, y: number, text: string, maxW: number, fontSize = 8): number {
  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'normal')
  const lines = pdf.splitTextToSize(text, maxW - 4)
  pdf.text(lines, x + 2, y)
  return y + lines.length * (fontSize * 0.42) + 1
}

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed <= FOOTER_ZONE_Y) return y
  pdf.addPage()
  return MARGIN
}

function drawTableHeader(pdf: jsPDF, y: number): number {
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  TABLE_COLS.forEach(col => {
    const tx = col.align === 'right' ? col.x + col.w - 1 : col.x + 1
    pdf.text(col.label, tx, y + 4.2, { align: col.align })
  })
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, y + 5.5, MARGIN + CONTENT_W, y + 5.5)
  return y + 7
}

function drawTableRow(pdf: jsPDF, row: ConfermaOrdineLineRow, y: number): number {
  const descLines = pdf.splitTextToSize(row.description || '—', TABLE_COLS[1].w - 2)
  const rowH = Math.max(6.5, descLines.length * 3.6 + 2.5)

  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'normal')

  pdf.text(row.code, TABLE_COLS[0].x + 1, y + 4)
  pdf.text(descLines, TABLE_COLS[1].x + 1, y + 4)
  pdf.text(String(row.qty), TABLE_COLS[2].x + TABLE_COLS[2].w - 1, y + 4, { align: 'right' })
  pdf.text(formatEuroIt(row.priceIvato), TABLE_COLS[3].x + TABLE_COLS[3].w - 1, y + 4, { align: 'right' })
  pdf.text(row.sconto ? formatEuroIt(row.sconto) : '', TABLE_COLS[4].x + TABLE_COLS[4].w - 1, y + 4, { align: 'right' })
  pdf.text(formatEuroIt(row.importo), TABLE_COLS[5].x + TABLE_COLS[5].w - 1, y + 4, { align: 'right' })
  pdf.text(String(row.iva), TABLE_COLS[6].x + TABLE_COLS[6].w - 1, y + 4, { align: 'right' })

  pdf.setDrawColor(220)
  pdf.setLineWidth(0.15)
  pdf.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH)

  return y + rowH
}

function drawStudioHeader(pdf: jsPDF, model: ConfermaOrdineViewModel, logoDataUrl: string | undefined, startY: number): number {
  let y = startY
  const studio = model.studio
  const logoMax = 26
  const textX = logoDataUrl ? MARGIN + logoMax + 4 : MARGIN

  if (logoDataUrl) {
    try {
      const fmt = logoDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG'
      pdf.addImage(logoDataUrl, fmt, MARGIN, y, logoMax, logoMax, undefined, 'FAST')
    } catch {
      /* logo opzionale */
    }
  }

  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.text(studio.name?.trim() || 'FIXLab', textX, y + 6)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  let hy = y + 11

  const addressLine = [
    studio.address,
    [studio.cap, studio.city, studio.province ? `(${studio.province})` : ''].filter(Boolean).join(' '),
    studio.nation?.trim() || 'Italy',
  ]
    .filter(Boolean)
    .join(' - ')
  if (addressLine) {
    const wrapped = pdf.splitTextToSize(addressLine, CONTENT_W - (textX - MARGIN) - 50)
    pdf.text(wrapped, textX, hy)
    hy += wrapped.length * 3.6 + 1
  }

  const telParts = [studio.phone, studio.cellPhone].filter(Boolean)
  if (telParts.length) {
    pdf.text(`Tel. ${telParts.join(' / ')}`, textX, hy)
    hy += 4
  }
  if (studio.email) {
    pdf.text(`e-mail: ${studio.email}`, textX, hy)
    hy += 4
  }
  if (studio.vatNumber) {
    pdf.text(`P.Iva ${studio.vatNumber}`, textX, hy)
    hy += 4
  }

  const headerBottom = Math.max(y + logoMax, hy, MARGIN + 22) + 4

  const rightEdge = PAGE_W - MARGIN
  const boxNumW = 28
  const boxDateW = 24
  const boxH = 7
  const numRowY = headerBottom - boxH - 2

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')

  const label1 = "Conferma d'ordine nr."
  const label2 = 'del'

  const totalW = pdf.getTextWidth(label1) + 2 + boxNumW + 4 + pdf.getTextWidth(label2) + 2 + boxDateW
  let nx = rightEdge - totalW

  pdf.text(label1, nx, numRowY + 5)
  nx += pdf.getTextWidth(label1) + 2
  drawValueBox(pdf, nx, numRowY, boxNumW, boxH, model.orderNumber)
  nx += boxNumW + 4
  pdf.text(label2, nx, numRowY + 5)
  nx += pdf.getTextWidth(label2) + 2
  drawValueBox(pdf, nx, numRowY, boxDateW, boxH, model.orderDate)

  return headerBottom
}

function drawClientDeviceBlocks(pdf: jsPDF, model: ConfermaOrdineViewModel, y: number): number {
  const gap = 0
  const colW = CONTENT_W / 2
  const leftX = MARGIN
  const rightX = MARGIN + colW
  const blockTop = y

  const estimateH = (text: string, innerW: number) => {
    const lines = pdf.splitTextToSize(text, innerW - 4)
    return Math.max(32, 10 + lines.length * 3.4 + 4)
  }

  const blockH = Math.max(estimateH(model.clientBody, colW), estimateH(model.deviceBody, colW))

  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, blockTop, MARGIN + CONTENT_W, blockTop)
  pdf.line(MARGIN, blockTop + blockH, MARGIN + CONTENT_W, blockTop + blockH)
  pdf.setLineWidth(0.2)
  pdf.line(rightX, blockTop, rightX, blockTop + blockH)

  drawBlockTitle(pdf, leftX, blockTop + 5, 'Cliente')
  drawPreLineBlock(pdf, leftX, blockTop + 10, model.clientBody, colW)

  drawBlockTitle(pdf, rightX, blockTop + 5, 'Informazioni dispositivo')
  drawPreLineBlock(pdf, rightX, blockTop + 10, model.deviceBody, colW, 7.5)

  return blockTop + blockH + 6
}

function drawFooter(pdf: jsPDF, model: ConfermaOrdineViewModel) {
  const lineY = 264

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  const accontoText = model.deposit ? `Acconto:  ${formatEuroIt(model.deposit)}` : 'Acconto:'
  pdf.text(accontoText, PAGE_W / 2, lineY - 2.5, { align: 'center' })

  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, lineY, PAGE_W - MARGIN, lineY)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Firma per accettazione', MARGIN, lineY + 5)

  const totBoxW = 56
  const totBoxH = 8
  const totaleX = PAGE_W - MARGIN - totBoxW
  const totaleY = lineY + 1
  drawThinRect(pdf, totaleX, totaleY, totBoxW, totBoxH)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Tot. documento', totaleX + 2, totaleY + totBoxH - 2.5)
  pdf.setFontSize(11)
  pdf.text(formatEuroIt(model.total), totaleX + totBoxW - 2, totaleY + totBoxH - 2, { align: 'right' })

  const bottomY = 282
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(0)
  if (model.orderDate) pdf.text(model.orderDate, MARGIN, bottomY)

  pdf.setFontSize(5.5)
  pdf.setTextColor(60)
  const discX = MARGIN + 18
  const discLines = pdf.splitTextToSize(model.disclaimer, CONTENT_W - 18)
  pdf.text(discLines, discX, bottomY - 1)
  pdf.setTextColor(0)
}

export function buildRepairReceiptPdfDocument(
  repair: Repair,
  studio?: RepairReceiptStudio,
  options?: RepairReceiptPdfOptions,
): jsPDF {
  const model = buildConfermaOrdineViewModel(repair, studio, options?.printOptions)
  const pdf = new jsPDF('p', 'mm', 'a4')

  let y = drawStudioHeader(pdf, model, options?.logoDataUrl, MARGIN)
  y = drawClientDeviceBlocks(pdf, model, y)
  y = drawTableHeader(pdf, y)

  for (const line of model.lines) {
    y = ensureSpace(pdf, y, 8)
    if (y === MARGIN) y = drawTableHeader(pdf, y)
    y = drawTableRow(pdf, line, y)
  }

  drawFooter(pdf, model)
  return pdf
}

export function generateRepairReceiptPDF(
  repair: Repair,
  studio?: RepairReceiptStudio,
  options?: RepairReceiptPdfOptions,
): void {
  const pdf = buildRepairReceiptPdfDocument(repair, studio, options)
  if (!options?.skipSave) {
    pdf.save(confermaOrdineFilename(repair))
  }
}

async function loadLogoDataUrl(url: string): Promise<string | undefined> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('logo load failed'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return undefined
  }
}

export async function generateRepairPDF(
  repair: Repair,
  studio?: RepairReceiptStudio,
  printOptions?: ConfermaOrdinePrintOptions,
): Promise<void> {
  const logoDataUrl = studio?.logoUrl ? await loadLogoDataUrl(studio.logoUrl) : undefined
  generateRepairReceiptPDF(repair, studio, { logoDataUrl, printOptions })
}

export function buildRepairConfermaOrdineHtml(
  repair: Repair,
  studio?: RepairReceiptStudio,
  printOptions?: ConfermaOrdinePrintOptions,
): string {
  return buildConfermaOrdineHtml(buildConfermaOrdineViewModel(repair, studio, printOptions))
}
