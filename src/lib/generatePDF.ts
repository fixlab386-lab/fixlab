import jsPDF from 'jspdf'
import type { DocRecord, DocumentRow } from '../types'
import { getDocumentTypePrintOptions, printDocRecordWithTemplate, studioDataToConfermaStudio } from './printTemplates'

const typeLabels: Record<string, string> = {
  preventivo: 'PREVENTIVO', conferma_ordine: "CONFERMA D'ORDINE", ordine_cliente: 'ORDINE CLIENTE',
  rapporto_intervento: "RAPPORTO D'INTERVENTO", ddt: 'DOCUMENTO DI TRASPORTO',
  vendita_banco: 'RICEVUTA', fattura: 'FATTURA',
  preventivo_fornitore: 'PREVENTIVO FORNITORE', ordine_fornitore: 'ORDINE FORNITORE',
  arrivo_merce: 'ARRIVO MERCE'
}

interface StudioInfo extends Record<string, unknown> {
  name: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  email?: string
  disclaimer?: string
}

function studioRecord(studio?: StudioInfo): Record<string, unknown> | undefined {
  return studio
}

function resolveDocumentTitle(doc: DocRecord, studio?: StudioInfo): string {
  const printOpts = getDocumentTypePrintOptions(studioRecord(studio), doc.type)
  if (printOpts.titoloStampa) return printOpts.titoloStampa.toUpperCase()
  return typeLabels[doc.type] || doc.type
}

function resolveDocumentFooter(doc: DocRecord, studio?: StudioInfo): string | undefined {
  const printOpts = getDocumentTypePrintOptions(studioRecord(studio), doc.type)
  return printOpts.noteFine?.trim() || (typeof studio?.disclaimer === 'string' ? studio.disclaimer : undefined)
}

export function generateDocumentPDF(doc: DocRecord, studio?: StudioInfo) {
  const studioRecordData = studioRecord(studio)
  const printOpts = getDocumentTypePrintOptions(studioRecordData, doc.type)
  if (printOpts.layoutTemplate === 'layout_conferma_ordine') {
    printDocRecordWithTemplate(doc, studioDataToConfermaStudio(studioRecordData), studioRecordData)
    return
  }

  const pdf = new jsPDF('p', 'mm', 'a4')
  const w = 210
  const margin = 15
  const contentW = w - margin * 2
  let y = margin

  // ===== HEADER =====
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  pdf.text(studio?.name || 'FIXLab', margin, y + 6)
  y += 10

  if (studio) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    const parts = [studio.address, [studio.cap, studio.city, studio.province].filter(Boolean).join(' ')].filter(Boolean)
    if (parts.length) { pdf.text(parts.join(' — '), margin, y); y += 4 }
    const contacts = [studio.vatNumber ? `P.IVA ${studio.vatNumber}` : '', studio.phone ? `Tel. ${studio.phone}` : '', studio.email || ''].filter(Boolean)
    if (contacts.length) { pdf.text(contacts.join(' — '), margin, y); y += 4 }
  }

  // Separator
  y += 4
  pdf.setDrawColor(0, 229, 160)
  pdf.setLineWidth(0.8)
  pdf.line(margin, y, w - margin, y)
  y += 8

  // ===== DOCUMENT TYPE + NUMBER =====
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`${resolveDocumentTitle(doc, studio)}  N. ${doc.fullNumber}`, margin, y)
  y += 8

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Data: ${new Date(doc.date).toLocaleDateString('it-IT')}`, margin, y)
  y += 6

  // ===== SUBJECT =====
  pdf.setFillColor(245, 245, 245)
  pdf.roundedRect(margin, y, contentW, 22, 2, 2, 'F')
  y += 5
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(100)
  pdf.text(doc.subjectType === 'supplier' ? 'FORNITORE' : 'CLIENTE', margin + 4, y)
  pdf.setTextColor(0)
  y += 5
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text(doc.subjectName, margin + 4, y)
  y += 5
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  const subjectInfo = [doc.subjectVat ? `P.IVA ${doc.subjectVat}` : '', doc.subjectAddress || ''].filter(Boolean).join(' — ')
  if (subjectInfo) pdf.text(subjectInfo, margin + 4, y)
  y += 10

  // ===== TABLE HEADER =====
  const cols = [
    { label: 'Cod.', x: margin, w: 18 },
    { label: 'Descrizione', x: margin + 18, w: 62 },
    { label: 'Q.tà', x: margin + 80, w: 15 },
    { label: 'U.m.', x: margin + 95, w: 14 },
    { label: 'Prezzo', x: margin + 109, w: 22 },
    { label: 'Sc.%', x: margin + 131, w: 14 },
    { label: 'IVA%', x: margin + 145, w: 14 },
    { label: 'Importo', x: margin + 159, w: 21 }
  ]

  pdf.setFillColor(30, 30, 30)
  pdf.rect(margin, y, contentW, 7, 'F')
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255)
  cols.forEach(c => pdf.text(c.label, c.x + 1, y + 5))
  pdf.setTextColor(0)
  y += 8

  // ===== TABLE ROWS =====
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')

  doc.rows.forEach((row: DocumentRow, i: number) => {
    if (y > 260) { pdf.addPage(); y = margin }
    if (i % 2 === 0) {
      pdf.setFillColor(250, 250, 250)
      pdf.rect(margin, y - 1, contentW, 7, 'F')
    }
    pdf.text(row.productCode || '', cols[0].x + 1, y + 4)
    pdf.text((row.description || '').substring(0, 40), cols[1].x + 1, y + 4)
    pdf.text(String(row.quantity), cols[2].x + 1, y + 4)
    pdf.text(row.unitOfMeasure || 'pz', cols[3].x + 1, y + 4)
    pdf.text(`€ ${row.unitPrice.toFixed(2)}`, cols[4].x + 1, y + 4)
    pdf.text(row.discount ? `${row.discount}%` : '', cols[5].x + 1, y + 4)
    pdf.text(`${row.vatRate}%`, cols[6].x + 1, y + 4)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`€ ${row.total.toFixed(2)}`, cols[7].x + 1, y + 4)
    pdf.setFont('helvetica', 'normal')
    y += 7
  })

  // ===== SEPARATOR =====
  y += 2
  pdf.setDrawColor(200)
  pdf.setLineWidth(0.3)
  pdf.line(margin, y, w - margin, y)
  y += 4

  // ===== SHIPPING =====
  if (doc.shippingCost && doc.shippingCost > 0) {
    pdf.setFontSize(8)
    pdf.text(`${doc.shippingDescription || 'Spese'} (IVA ${doc.shippingVatRate || 22}%)`, margin + 110, y + 4)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`€ ${doc.shippingCost.toFixed(2)}`, margin + 160, y + 4)
    pdf.setFont('helvetica', 'normal')
    y += 7
  }

  // ===== TOTALS BOX =====
  const totalsX = margin + 110
  const totalsW = contentW - 110

  pdf.setFillColor(245, 245, 245)
  pdf.roundedRect(totalsX, y, totalsW, 28, 2, 2, 'F')
  y += 6

  pdf.setFontSize(9)
  pdf.text('Tot. netto', totalsX + 4, y)
  pdf.text(`€ ${doc.totalNet.toFixed(2)}`, totalsX + totalsW - 4, y, { align: 'right' })
  y += 6
  pdf.text('IVA', totalsX + 4, y)
  pdf.text(`€ ${doc.totalVat.toFixed(2)}`, totalsX + totalsW - 4, y, { align: 'right' })
  y += 2
  pdf.setDrawColor(0, 229, 160)
  pdf.setLineWidth(0.5)
  pdf.line(totalsX + 4, y, totalsX + totalsW - 4, y)
  y += 6
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('TOTALE', totalsX + 4, y)
  pdf.text(`€ ${doc.totalDocument.toFixed(2)}`, totalsX + totalsW - 4, y, { align: 'right' })
  y += 10

  // ===== NOTES =====
  if (doc.internalNotes) {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100)
    pdf.text(`Note: ${doc.internalNotes}`, margin, y)
    pdf.setTextColor(0)
    y += 6
  }

  // ===== PAYMENT =====
  if (doc.paymentMethod) {
    pdf.setFontSize(8)
    pdf.text(`Pagamento: ${doc.paymentMethod}`, margin, y)
    y += 5
  }

  if (doc.type === 'preventivo' && doc.validityDays) {
    pdf.setFontSize(8)
    pdf.text(`Validità preventivo: ${doc.validityDays} giorni`, margin, y)
  }

  // ===== FOOTER =====
  const footerText = resolveDocumentFooter(doc, studio)
  if (footerText) {
    y += 4
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60)
    const footerLines = pdf.splitTextToSize(footerText, contentW)
    pdf.text(footerLines, margin, y)
    y += footerLines.length * 3.5
    pdf.setTextColor(0)
  }

  pdf.setFontSize(7)
  pdf.setTextColor(150)
  pdf.text('Documento generato da FIXLab', margin, 290)
  pdf.text(`Pagina 1`, w - margin, 290, { align: 'right' })

  const titleSlug = resolveDocumentTitle(doc, studio).replace(/\s+/g, '_')
  const fileName = `${titleSlug}_${doc.fullNumber}_${doc.subjectName.replace(/\s+/g, '_')}.pdf`
  pdf.save(fileName)
}

interface ProductForPDF {
  code?: string
  name: string
  description?: string
  brand: string
  model: string
  categoryName: string
  price: number
  prices?: { privati: number; aziende?: number; convenzionati?: number; vip?: number }
  stock: number
  unitOfMeasure?: string
  color?: string
  barcode?: string
  purchasePrice?: number
  notes?: string
  variants?: string
}

export function generateProductSheetPDF(product: ProductForPDF, studio?: StudioInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const margin = 15
  const w = 210
  const contentW = w - margin * 2
  let y = margin

  // Header
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text(studio?.name || 'FIXLab', margin, y + 6)
  y += 10

  pdf.setDrawColor(0, 229, 160)
  pdf.setLineWidth(0.8)
  pdf.line(margin, y, w - margin, y)
  y += 10

  // Title
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SCHEDA PRODOTTO', margin, y)
  y += 10

  // Product info
  const field = (label: string, value: string) => {
    if (y > 270) { pdf.addPage(); y = margin }
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100)
    pdf.text(label, margin, y)
    pdf.setTextColor(0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, margin + 50, y)
    pdf.setFont('helvetica', 'normal')
    y += 7
  }

  field('Codice', product.code || '—')
  field('Nome', product.name)
  if (product.description) field('Descrizione', product.description)
  field('Categoria', product.categoryName)
  field('Marca', product.brand)
  field('Modello', product.model)
  if (product.color) field('Colore', product.color)
  if (product.unitOfMeasure) field('U.m.', product.unitOfMeasure)
  if (product.barcode) field('Barcode', product.barcode)

  y += 4
  pdf.setDrawColor(220)
  pdf.line(margin, y, w - margin, y)
  y += 6

  // Prices
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PREZZI', margin, y)
  y += 7

  field('Privati', `€ ${product.price.toFixed(2)}`)
  if (product.prices?.aziende) field('Aziende', `€ ${product.prices.aziende.toFixed(2)}`)
  if (product.prices?.convenzionati) field('Convenzionati', `€ ${product.prices.convenzionati.toFixed(2)}`)
  if (product.prices?.vip) field('VIP', `€ ${product.prices.vip.toFixed(2)}`)
  if (product.purchasePrice) field('Acquisto', `€ ${product.purchasePrice.toFixed(2)}`)

  y += 4
  pdf.setDrawColor(220)
  pdf.line(margin, y, w - margin, y)
  y += 6

  // Stock
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('MAGAZZINO', margin, y)
  y += 7

  field('Giacenza', `${product.stock} ${product.unitOfMeasure || 'pz'}`)
  field('Valore', `€ ${(product.stock * product.price).toFixed(2)}`)

  if (product.variants) { y += 3; field('Varianti', product.variants) }
  if (product.notes) { y += 3; field('Note', product.notes) }

  // Footer
  pdf.setFontSize(7)
  pdf.setTextColor(150)
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')} — FIXLab`, margin, 290)

  pdf.save(`Scheda_${product.code || 'prodotto'}_${product.name.replace(/\s+/g, '_')}.pdf`)
}

export { generateRepairPDF, buildRepairConfermaOrdineHtml } from './generateRepairPDF'