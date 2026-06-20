import type { DocumentTemplateFields } from './applicationOptions'
import type { ConfermaOrdineViewModel, ConfermaOrdineLineRow } from './confermaOrdineTemplate'
import { escapeHtml } from './printDocument'

/** Dimensioni pagina A4 a 96 dpi (794 × 1123 px). */
export const CANVAS_PAGE_WIDTH = 794
export const CANVAS_PAGE_HEIGHT = 1123
export const CANVAS_GRID = 5
export const PX_PER_CM = 37.7952755906

export type TemplateElementKind = 'text' | 'field' | 'image' | 'line' | 'rect' | 'table'

export type TemplateFieldKey =
  | 'studio.logo'
  | 'studio.name'
  | 'studio.info'
  | 'doc.title'
  | 'doc.number'
  | 'doc.date'
  | 'client.title'
  | 'client.body'
  | 'second.title'
  | 'second.body'
  | 'table.lines'
  | 'footer.signature'
  | 'footer.deposit'
  | 'footer.total.label'
  | 'footer.total.value'
  | 'footer.disclaimer'

export type TemplateCanvasElement = {
  id: string
  kind: TemplateElementKind
  x: number
  y: number
  width: number
  height: number
  /** Testo libero o etichetta personalizzata. */
  content?: string
  /** Campo dinamico collegato ai dati documento. */
  fieldKey?: TemplateFieldKey
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline' | 'line-through'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  borderWidth?: number
  borderColor?: string
  borderStyle?: 'solid' | 'dashed' | 'none'
  locked?: boolean
  hidden?: boolean
  zIndex?: number
}

export type TemplateCanvasState = {
  elements: TemplateCanvasElement[]
  version: 1
}

let _idCounter = 0
export function newElementId(): string {
  _idCounter += 1
  return `el_${Date.now()}_${_idCounter}`
}

export function snapToGrid(v: number, grid = CANVAS_GRID): number {
  return Math.round(v / grid) * grid
}

function el(
  partial: Omit<TemplateCanvasElement, 'id'> & { id?: string },
): TemplateCanvasElement {
  return {
    fontSize: 10,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#000000',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#000000',
    borderStyle: 'none',
    zIndex: 1,
    ...partial,
    id: partial.id ?? newElementId(),
  }
}

/** Layout predefinito in stile Danea Easyfatt — Conferma d'ordine / documenti standard. */
export function createDefaultCanvasElements(
  typeId: string,
  fields: DocumentTemplateFields,
): TemplateCanvasElement[] {
  const isRepair = typeId === 'conferma_ordine' || typeId === 'rapporto_intervento'
  const showSecond = fields.showSecondBox ?? isRepair
  const clientW = showSecond ? 355 : 710
  const secondX = 397

  const elements: TemplateCanvasElement[] = [
    el({ kind: 'field', fieldKey: 'studio.logo', x: 42, y: 38, width: 50, height: 50, zIndex: 2 }),
    el({
      kind: 'field',
      fieldKey: 'studio.name',
      x: 100,
      y: 38,
      width: 340,
      height: 22,
      fontSize: 13,
      fontWeight: 'bold',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'studio.info',
      x: 100,
      y: 62,
      width: 340,
      height: 56,
      fontSize: 8,
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'doc.title',
      x: 480,
      y: 42,
      width: 270,
      height: 20,
      fontSize: 9,
      textAlign: 'right',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'doc.number',
      x: 560,
      y: 68,
      width: 70,
      height: 20,
      fontSize: 9,
      fontWeight: 'bold',
      textAlign: 'center',
      borderWidth: 1,
      borderStyle: 'solid',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'doc.date',
      x: 660,
      y: 68,
      width: 90,
      height: 20,
      fontSize: 9,
      fontWeight: 'bold',
      textAlign: 'center',
      borderWidth: 1,
      borderStyle: 'solid',
      zIndex: 2,
    }),
    el({
      kind: 'rect',
      x: 42,
      y: 108,
      width: clientW,
      height: 90,
      borderWidth: 1,
      borderStyle: 'solid',
      backgroundColor: '#ffffff',
      zIndex: 0,
    }),
    el({
      kind: 'field',
      fieldKey: 'client.title',
      content: fields.clientBoxTitle,
      x: 48,
      y: 112,
      width: clientW - 12,
      height: 16,
      fontSize: 8,
      fontWeight: 'bold',
      zIndex: 3,
    }),
    el({
      kind: 'field',
      fieldKey: 'client.body',
      x: 48,
      y: 130,
      width: clientW - 12,
      height: 62,
      fontSize: 8,
      zIndex: 3,
    }),
  ]

  if (showSecond) {
    elements.push(
      el({
        kind: 'rect',
        x: secondX,
        y: 108,
        width: 355,
        height: 90,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: '#ffffff',
        zIndex: 0,
      }),
      el({
        kind: 'field',
        fieldKey: 'second.title',
        content: fields.secondBoxTitle,
        x: secondX + 6,
        y: 112,
        width: 343,
        height: 16,
        fontSize: 8,
        fontWeight: 'bold',
        zIndex: 3,
      }),
      el({
        kind: 'field',
        fieldKey: 'second.body',
        x: secondX + 6,
        y: 130,
        width: 343,
        height: 62,
        fontSize: 8,
        zIndex: 3,
      }),
    )
  }

  elements.push(
    el({
      kind: 'table',
      fieldKey: 'table.lines',
      x: 42,
      y: 210,
      width: 710,
      height: 280,
      fontSize: 8,
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'footer.deposit',
      x: 42,
      y: 880,
      width: 200,
      height: 18,
      fontSize: 8,
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'footer.signature',
      content: fields.signatureLabel,
      x: 42,
      y: 910,
      width: 220,
      height: 50,
      fontSize: 8,
      borderWidth: 1,
      borderStyle: 'solid',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'footer.total.label',
      content: fields.totalLabel,
      x: 580,
      y: 910,
      width: 172,
      height: 18,
      fontSize: 8,
      fontWeight: 'bold',
      textAlign: 'right',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'footer.total.value',
      x: 580,
      y: 930,
      width: 172,
      height: 28,
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'right',
      borderWidth: 1,
      borderStyle: 'solid',
      zIndex: 2,
    }),
    el({
      kind: 'field',
      fieldKey: 'footer.disclaimer',
      x: 42,
      y: 980,
      width: 710,
      height: 100,
      fontSize: 7,
      zIndex: 2,
    }),
  )

  return elements
}

export function resolveCanvasElements(
  typeId: string,
  fields: DocumentTemplateFields,
): TemplateCanvasElement[] {
  if (fields.canvasElements?.length) return fields.canvasElements.map(e => ({ ...e }))
  return createDefaultCanvasElements(typeId, fields)
}

export function canvasElementsToTemplateFields(elements: TemplateCanvasElement[]): Partial<DocumentTemplateFields> {
  const find = (key: TemplateFieldKey) => elements.find(e => e.fieldKey === key)
  return {
    clientBoxTitle: find('client.title')?.content ?? 'Cliente',
    secondBoxTitle: find('second.title')?.content ?? 'Note',
    showSecondBox: elements.some(e => e.fieldKey === 'second.body' && !e.hidden),
    signatureLabel: find('footer.signature')?.content ?? 'Firma per accettazione',
    totalLabel: find('footer.total.label')?.content ?? 'Tot. documento',
    canvasElements: elements,
  }
}

function formatEuroIt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function studioInfoLines(model: ConfermaOrdineViewModel): string {
  const s = model.studio
  const tel = [s.phone, s.cellPhone].filter(Boolean)
  return [
    [s.address, s.cap, s.city, s.province ? `(${s.province})` : ''].filter(Boolean).join(' '),
    tel.length ? `Tel. ${tel.join(' / ')}` : '',
    s.email ? `e-mail: ${s.email}` : '',
    s.vatNumber ? `P.Iva ${s.vatNumber}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildTableHtml(lines: ConfermaOrdineLineRow[], fontSize: number): string {
  const head = `<tr>
    <th>Codice</th><th>Descrizione</th>
    <th class="num">Quantità</th><th class="num">Prezzo ivato</th>
    <th class="num">Sconto</th><th class="num">Importo</th><th class="num">Iva</th>
  </tr>`
  const rows = lines
    .map(
      l => `<tr>
      <td>${escapeHtml(l.code)}</td>
      <td>${escapeHtml(l.description)}</td>
      <td class="num">${escapeHtml(String(l.qty))}</td>
      <td class="num">${escapeHtml(formatEuroIt(l.priceIvato))}</td>
      <td class="num">${l.sconto ? escapeHtml(formatEuroIt(l.sconto)) : ''}</td>
      <td class="num">${escapeHtml(formatEuroIt(l.importo))}</td>
      <td class="num">${escapeHtml(String(l.iva))}</td>
    </tr>`,
    )
    .join('')
  return `<table class="tc-table" style="font-size:${fontSize}pt"><thead>${head}</thead><tbody>${rows}</tbody></table>`
}

export function resolveFieldContent(
  el: TemplateCanvasElement,
  model: ConfermaOrdineViewModel,
): string {
  const key = el.fieldKey
  if (!key) return el.content ?? ''
  switch (key) {
    case 'studio.logo':
      return model.studio.logoUrl ?? ''
    case 'studio.name':
      return model.studio.name || 'FIXLab'
    case 'studio.info':
      return studioInfoLines(model)
    case 'doc.title':
      return model.documentTitleLabel ?? "Conferma d'ordine nr."
    case 'doc.number':
      return model.orderNumber
    case 'doc.date':
      return model.orderDate
    case 'client.title':
      return el.content ?? model.clientBoxTitle ?? 'Cliente'
    case 'client.body':
      return model.clientBody
    case 'second.title':
      return el.content ?? model.rightBoxTitle ?? 'Note'
    case 'second.body':
      return model.deviceBody
    case 'footer.signature':
      return el.content ?? model.signatureLabel ?? 'Firma per accettazione'
    case 'footer.deposit':
      return model.deposit ? `Acconto: ${formatEuroIt(model.deposit)}` : 'Acconto:'
    case 'footer.total.label':
      return el.content ?? model.totalLabel ?? 'Tot. documento'
    case 'footer.total.value':
      return formatEuroIt(model.total)
    case 'footer.disclaimer':
      return model.disclaimer
    default:
      return el.content ?? ''
  }
}

export function elementStyleCss(el: TemplateCanvasElement): string {
  const parts = [
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `font-size:${el.fontSize ?? 10}pt`,
    `font-family:${el.fontFamily ?? 'Arial, Helvetica, sans-serif'}`,
    `font-weight:${el.fontWeight ?? 'normal'}`,
    `font-style:${el.fontStyle ?? 'normal'}`,
    `text-decoration:${el.textDecoration ?? 'none'}`,
    `text-align:${el.textAlign ?? 'left'}`,
    `color:${el.color ?? '#000'}`,
    `z-index:${el.zIndex ?? 1}`,
  ]
  if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    parts.push(`background:${el.backgroundColor}`)
  }
  if (el.borderWidth && el.borderStyle !== 'none') {
    parts.push(`border:${el.borderWidth}px ${el.borderStyle ?? 'solid'} ${el.borderColor ?? '#000'}`)
  }
  return parts.join(';')
}

export function buildCanvasPrintHtml(
  elements: TemplateCanvasElement[],
  model: ConfermaOrdineViewModel,
): string {
  const sorted = [...elements].filter(e => !e.hidden).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  const parts = sorted.map(el => {
    if (el.kind === 'line') {
      return `<div class="tc-el tc-line" style="${elementStyleCss(el)};border-top:${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#000'}"></div>`
    }
    if (el.kind === 'rect') {
      return `<div class="tc-el tc-rect" style="${elementStyleCss(el)}"></div>`
    }
    if (el.kind === 'table') {
      return `<div class="tc-el tc-table-wrap" style="${elementStyleCss(el)}">${buildTableHtml(model.lines, el.fontSize ?? 8)}</div>`
    }
    if (el.kind === 'field' && el.fieldKey === 'studio.logo') {
      const url = resolveFieldContent(el, model)
      if (!url) return ''
      return `<div class="tc-el tc-image" style="${elementStyleCss(el)}"><img src="${escapeHtml(url)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain" /></div>`
    }
    const text = resolveFieldContent(el, model)
    const whiteSpace = el.fieldKey?.includes('.body') || el.fieldKey === 'studio.info' || el.fieldKey === 'footer.disclaimer'
      ? 'white-space:pre-line'
      : ''
    return `<div class="tc-el tc-text" style="${elementStyleCss(el)};${whiteSpace}">${escapeHtml(text)}</div>`
  })
  return `<div class="tc-page">${parts.join('')}</div>`
}

export const TEMPLATE_CANVAS_PRINT_CSS = `
.tc-page {
  position: relative;
  width: ${CANVAS_PAGE_WIDTH}px;
  min-height: ${CANVAS_PAGE_HEIGHT}px;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  box-sizing: border-box;
}
.tc-el {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  line-height: 1.35;
}
.tc-table {
  width: 100%;
  border-collapse: collapse;
}
.tc-table th, .tc-table td {
  padding: 2px 3px;
  text-align: left;
  vertical-align: top;
}
.tc-table th.num, .tc-table td.num { text-align: right; }
.tc-table thead tr { border-bottom: 1px solid #000; }
.tc-line { height: 0 !important; }
`

export const FIELD_LABELS: Record<TemplateFieldKey, string> = {
  'studio.logo': 'Logo azienda',
  'studio.name': 'Az Nome',
  'studio.info': 'Az Informazioni',
  'doc.title': 'Titolo Doc',
  'doc.number': 'Nr. documento',
  'doc.date': 'Data',
  'client.title': 'Titolo cliente',
  'client.body': 'Destinatario',
  'second.title': 'Titolo 2° riquadro',
  'second.body': 'Destinazione / Note',
  'table.lines': 'Tabella righe',
  'footer.signature': 'Firma',
  'footer.deposit': 'Acconto',
  'footer.total.label': 'Etichetta totale',
  'footer.total.value': 'Importo totale',
  'footer.disclaimer': 'Note legali',
}
