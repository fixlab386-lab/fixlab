import jsPDF from 'jspdf'
import type { Repair, RepairProduct } from '../types'
import { calcLineAmount, normalizeRepairLine } from '../components/repair/repairLineUtils'
import { DEFAULT_VAT_PERCENT } from '../gestionale/lib/constants'

// ---------------------------------------------------------------------------
// Types & defaults
// ---------------------------------------------------------------------------

export interface RepairReceiptStudio {
  name: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  cellPhone?: string
  email?: string
  logoUrl?: string
  disclaimer?: string
}

export const DEFAULT_REPAIR_RECEIPT_DISCLAIMER = `Ai sensi del D.Lgs. 196/2003 Vi informiamo che i Vs. dati saranno utilizzati esclusivamente per i fini connessi ai rapporti commerciali tra di noi in essere. Contributo CONAI assolto ove dovuto - Vi preghiamo di controllare i Vs. dati anagrafici, la P. IVA e il Cod. Fiscale. Non ci riteniamo responsabili di eventuali errori. Nell'eventualità in cui l'apparato, riparato o no, non sia ritirato entro 3 mesi, si autorizza il laboratorio alla demolizione o vendita del suddetto per il recupero delle spese gestionali.`

export interface RepairReceiptPdfOptions {
  logoDataUrl?: string
  /** Se true, non scarica il file (utile per test / anteprima). */
  skipSave?: boolean
}

// ---------------------------------------------------------------------------
// Formatting helpers (pure, testable)
// ---------------------------------------------------------------------------

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

export function resolveDisclaimer(studio?: RepairReceiptStudio): string {
  const text = studio?.disclaimer?.trim() || DEFAULT_REPAIR_RECEIPT_DISCLAIMER
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

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

const PAGE_W = 210
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_ZONE_Y = 248

type ColDef = { label: string; x: number; w: number; align?: 'left' | 'right' }

const TABLE_COLS: ColDef[] = [
  { label: 'Codice', x: MARGIN, w: 22 },
  { label: 'Descrizione', x: MARGIN + 22, w: 58 },
  { label: 'Quantità', x: MARGIN + 80, w: 16 },
  { label: 'Prezzo ivato', x: MARGIN + 96, w: 26 },
  { label: 'Sconto', x: MARGIN + 122, w: 20 },
  { label: 'Importo', x: MARGIN + 142, w: 26 },
  { label: 'Iva', x: MARGIN + 168, w: 18 },
]

function drawThinRect(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.2)
  pdf.rect(x, y, w, h)
}

function drawValueBox(pdf: jsPDF, x: number, y: number, w: number, h: number, value: string, fontSize = 9) {
  drawThinRect(pdf, x, y, w, h)
  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'bold')
  const pad = 1.5
  pdf.text(value, x + pad, y + h - 2.2, { maxWidth: w - pad * 2 })
}

function drawBlockTitle(pdf: jsPDF, x: number, y: number, title: string) {
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, x + 2, y)
}

function drawBlockLine(pdf: jsPDF, x: number, y: number, text: string, maxW: number, fontSize = 8) {
  if (!text.trim()) return y
  pdf.setFontSize(fontSize)
  pdf.setFont('helvetica', 'normal')
  const lines = pdf.splitTextToSize(text, maxW - 4)
  pdf.text(lines, x + 2, y)
  return y + lines.length * (fontSize * 0.42) + 1.2
}

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed <= FOOTER_ZONE_Y) return y
  pdf.addPage()
  return MARGIN
}

function drawTableHeader(pdf: jsPDF, y: number): number {
  const h = 6
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  TABLE_COLS.forEach(col => {
    pdf.text(col.label, col.x + 1, y + 4.2)
  })
  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, y + h, MARGIN + CONTENT_W, y + h)
  return y + h + 2
}

function drawTableRow(pdf: jsPDF, line: RepairProduct, y: number): number {
  const normalized = normalizeRepairLine(line)
  const amount = normalized.amount ?? calcLineAmount(normalized)
  const code = normalized.code || ''
  const desc = lineDescription(normalized)
  const descLines = pdf.splitTextToSize(desc || '—', TABLE_COLS[1].w - 2)
  const rowH = Math.max(6.5, descLines.length * 3.6 + 2.5)

  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'normal')

  pdf.text(code, TABLE_COLS[0].x + 1, y + 4)
  pdf.text(descLines, TABLE_COLS[1].x + 1, y + 4)
  pdf.text(String(normalized.qty), TABLE_COLS[2].x + 1, y + 4)
  pdf.text(formatEuroIt(normalized.price), TABLE_COLS[3].x + 1, y + 4)
  pdf.text(normalized.discount ? formatEuroIt(normalized.discount) : '', TABLE_COLS[4].x + 1, y + 4)
  pdf.text(formatEuroIt(amount), TABLE_COLS[5].x + 1, y + 4)
  pdf.text(String(normalized.vatPercent ?? DEFAULT_VAT_PERCENT), TABLE_COLS[6].x + 1, y + 4)

  pdf.setDrawColor(210)
  pdf.setLineWidth(0.15)
  pdf.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH)

  return y + rowH
}

// ---------------------------------------------------------------------------
// Main PDF builder (pure)
// ---------------------------------------------------------------------------

export function buildRepairReceiptPdfDocument(
  repair: Repair,
  studio?: RepairReceiptStudio,
  options?: RepairReceiptPdfOptions,
): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4')
  let y = MARGIN

  const studioName = studio?.name?.trim() || 'FIXLab'
  const orderNumber = resolveOrderNumber(repair)
  const acceptanceDate = resolveAcceptanceDate(repair)
  const receiptLines = buildReceiptLines(repair)
  const documentTotal = sumReceiptLines(receiptLines)

  // ----- 1. INTESTAZIONE -----
  const logoMax = 26
  const textX = options?.logoDataUrl ? MARGIN + logoMax + 4 : MARGIN

  if (options?.logoDataUrl) {
    try {
      const fmt = options.logoDataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG'
      pdf.addImage(options.logoDataUrl, fmt, MARGIN, y, logoMax, logoMax, undefined, 'FAST')
    } catch {
      /* logo opzionale */
    }
  }

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(studioName, textX, y + 6)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  let hy = y + 11

  const addressParts = [studio?.address, [studio?.cap, studio?.city, studio?.province].filter(Boolean).join(' ')].filter(Boolean)
  if (addressParts.length) {
    pdf.text(addressParts.join(' — '), textX, hy)
    hy += 4
  }

  const telParts = [studio?.phone, studio?.cellPhone].filter(Boolean)
  if (telParts.length) {
    pdf.text(`Tel. ${telParts.join(' / ')}`, textX, hy)
    hy += 4
  }

  if (studio?.email) {
    pdf.text(`e-mail: ${studio.email}`, textX, hy)
    hy += 4
  }

  if (studio?.vatNumber) {
    pdf.text(`P.Iva ${studio.vatNumber}`, textX, hy)
    hy += 4
  }

  y = Math.max(y + logoMax, hy) + 4

  // ----- 2. NUMERAZIONE (destra, box bordati) -----
  const numRowY = MARGIN + 2
  const rightEdge = PAGE_W - MARGIN
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')

  const label1 = "Conferma d'ordine nr."
  const label2 = 'del'
  const boxNumW = 28
  const boxDateW = 24
  const boxH = 7

  const totalW = pdf.getTextWidth(label1) + 2 + boxNumW + 4 + pdf.getTextWidth(label2) + 2 + boxDateW
  let nx = rightEdge - totalW

  pdf.text(label1, nx, numRowY + 5)
  nx += pdf.getTextWidth(label1) + 2
  drawValueBox(pdf, nx, numRowY, boxNumW, boxH, orderNumber)
  nx += boxNumW + 4
  pdf.setFont('helvetica', 'normal')
  pdf.text(label2, nx, numRowY + 5)
  nx += pdf.getTextWidth(label2) + 2
  drawValueBox(pdf, nx, numRowY, boxDateW, boxH, acceptanceDate)

  y = Math.max(y, numRowY + boxH + 6)

  // ----- 3. BLOCCHI CLIENTE / DISPOSITIVO -----
  const gap = 4
  const colW = (CONTENT_W - gap) / 2
  const leftX = MARGIN
  const rightX = MARGIN + colW + gap
  const blockTop = y

  const clientLines: string[] = []
  if (repair.clientName) clientLines.push(repair.clientName)
  if (repair.clientAddress) clientLines.push(repair.clientAddress)
  const capCity = [
    repair.clientCap,
    repair.clientCity,
    repair.clientProvince ? `(${repair.clientProvince})` : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (capCity) clientLines.push(capCity)
  if (repair.clientPhone) clientLines.push(`Cell: ${repair.clientPhone}`)
  if (repair.clientEmail) clientLines.push(`E-mail: ${repair.clientEmail}`)

  const deviceFieldLines: string[] = []
  if (repair.imei?.trim()) deviceFieldLines.push(`IMEI e S/N: ${repair.imei.trim()}`)
  const lockCode = repair.deviceLockCode || repair.devicePin
  if (lockCode?.trim()) deviceFieldLines.push(`Codice Blocco: ${lockCode.trim()}`)
  const accountBits = [repair.deviceAccount, repair.devicePassword].filter(v => v?.trim())
  if (accountBits.length) deviceFieldLines.push(`Account e Password: ${accountBits.join(' ')}`)
  const deviceNotes = repair.deviceCondition?.trim() || repair.notes?.trim()
  if (deviceNotes) deviceFieldLines.push(`Note: ${deviceNotes}`)

  const estimateBlockH = (lines: string[], innerW: number) => {
    let h = 10
    lines.forEach(line => {
      const wrapped = pdf.splitTextToSize(line, innerW - 4)
      h += wrapped.length * 3.6 + 1.2
    })
    return Math.max(32, h + 4)
  }

  const blockH = Math.max(estimateBlockH(clientLines, colW), estimateBlockH(deviceFieldLines, colW))

  drawThinRect(pdf, leftX, blockTop, colW, blockH)
  drawThinRect(pdf, rightX, blockTop, colW, blockH)

  drawBlockTitle(pdf, leftX, blockTop + 5, 'Cliente')
  let cy = blockTop + 10
  clientLines.forEach(line => {
    cy = drawBlockLine(pdf, leftX, cy, line, colW)
  })

  drawBlockTitle(pdf, rightX, blockTop + 5, 'Informazioni dispositivo')
  let dy = blockTop + 10
  deviceFieldLines.forEach(line => {
    dy = drawBlockLine(pdf, rightX, dy, line, colW, 7.5)
  })

  y = blockTop + blockH + 5

  // ----- 4. TABELLA RIGHE -----
  y = drawTableHeader(pdf, y)

  if (receiptLines.length === 0) {
    y = drawTableRow(
      pdf,
      normalizeRepairLine({
        code: '',
        name: repair.problem || 'Riparazione',
        description: repair.problem || 'Riparazione',
        price: repair.totalCost || 0,
        qty: 1,
        discount: 0,
      }),
      y,
    )
  } else {
    for (const line of receiptLines) {
      y = ensureSpace(pdf, y, 8)
      if (y === MARGIN) y = drawTableHeader(pdf, y)
      y = drawTableRow(pdf, line, y)
    }
  }

  // ----- 5. FONDO PAGINA -----
  const footerY = FOOTER_ZONE_Y
  const sigLineW = 78

  pdf.setDrawColor(0)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, footerY, MARGIN + sigLineW, footerY)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Firma per accettazione', MARGIN, footerY + 5)
  pdf.setFont('helvetica', 'normal')
  if (acceptanceDate) pdf.text(acceptanceDate, MARGIN, footerY + 10)

  const totalsX = MARGIN + 95
  const accontoBoxW = 42
  const totaleBoxW = 53
  const totBoxH = 8

  drawThinRect(pdf, totalsX, footerY - 10, accontoBoxW, totBoxH)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Acconto:', totalsX + 2, footerY - 4)
  pdf.setFont('helvetica', 'normal')
  pdf.text(formatEuroIt(repair.deposit || 0), totalsX + accontoBoxW - 2, footerY - 4, { align: 'right' })

  drawThinRect(pdf, totalsX + accontoBoxW + 3, footerY - 10, totaleBoxW, totBoxH)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Tot. documento', totalsX + accontoBoxW + 5, footerY - 4)
  pdf.setFontSize(11)
  pdf.text(formatEuroIt(documentTotal), totalsX + accontoBoxW + totaleBoxW + 1, footerY - 3.5, { align: 'right' })

  // ----- 6. DISCLAIMER -----
  pdf.setFontSize(5.5)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60)
  const disclaimer = resolveDisclaimer(studio)
  const discLines = pdf.splitTextToSize(disclaimer, CONTENT_W)
  pdf.text(discLines, MARGIN, footerY + 16)
  pdf.setTextColor(0)

  return pdf
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function receiptFileName(repair: Repair): string {
  const num = resolveOrderNumber(repair).replace(/\//g, '-')
  const client = (repair.clientName || 'cliente').replace(/\s+/g, '_').replace(/[^\w\-]/g, '')
  return `Conferma_ordine_${num}_${client}.pdf`
}

export function generateRepairReceiptPDF(
  repair: Repair,
  studio?: RepairReceiptStudio,
  options?: RepairReceiptPdfOptions,
): void {
  const pdf = buildRepairReceiptPdfDocument(repair, studio, options)
  if (!options?.skipSave) {
    pdf.save(receiptFileName(repair))
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

/** Genera e scarica la ricevuta; carica il logo dallo studio se presente. */
export async function generateRepairPDF(repair: Repair, studio?: RepairReceiptStudio): Promise<void> {
  const logoDataUrl = studio?.logoUrl ? await loadLogoDataUrl(studio.logoUrl) : undefined
  generateRepairReceiptPDF(repair, studio, { logoDataUrl })
}
