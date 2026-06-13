import type { Client } from '../../types'
import { displayValue } from '../anagrafica/utils'
import {
  escapeHtml,
  type PrintDocumentHeader,
  type PrintModel,
  wrapPrintDocument,
} from '../../lib/printDocument'

export type ClientPrintContext = {
  rows: Client[]
  selected: Client | null
  header: PrintDocumentHeader
}

const PRICE_LIST_LABELS: Record<string, string> = {
  privati: 'Privati',
  aziende: 'Aziende',
  convenzionati: 'Convenzionati',
  vip: 'VIP',
}

function clientTypeLabel(type?: Client['type']): string {
  if (type === 'both') return 'Cliente / Fornitore'
  if (type === 'supplier') return 'Fornitore'
  return 'Cliente'
}

function formatClientAddress(client: Client): string {
  const cityLine = [client.cap, client.city, client.province].filter(Boolean).join(' ')
  const parts = [client.address, cityLine, client.nation && client.nation !== 'Italia' ? client.nation : '']
    .filter(Boolean)
  return parts.join(' — ') || '—'
}

function renderField(label: string, value: string, fullWidth = false): string {
  return `
    <div class="print-doc__field${fullWidth ? ' print-doc__card-section--full' : ''}">
      <div class="print-doc__field-label">${escapeHtml(label)}</div>
      <div class="print-doc__field-value">${escapeHtml(value)}</div>
    </div>
  `
}

function renderFullList(rows: Client[]): string {
  if (rows.length === 0) {
    return '<p>Nessun cliente da stampare.</p>'
  }
  const head = `
    <tr>
      <th>Denominazione</th>
      <th>Codice</th>
      <th>Telefono</th>
      <th>Cell.</th>
      <th>Email</th>
      <th>P.IVA</th>
      <th>CF</th>
      <th>Indirizzo</th>
      <th>CAP</th>
      <th>Città</th>
      <th>Prov.</th>
    </tr>
  `
  const body = rows
    .map(
      c => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(displayValue(c.code))}</td>
        <td>${escapeHtml(displayValue(c.phone))}</td>
        <td>${escapeHtml(displayValue(c.cellPhone))}</td>
        <td>${escapeHtml(displayValue(c.email))}</td>
        <td>${escapeHtml(displayValue(c.vatNumber))}</td>
        <td>${escapeHtml(displayValue(c.fiscalCode))}</td>
        <td>${escapeHtml(displayValue(c.address))}</td>
        <td>${escapeHtml(displayValue(c.cap))}</td>
        <td>${escapeHtml(displayValue(c.city))}</td>
        <td>${escapeHtml(displayValue(c.province))}</td>
      </tr>
    `,
    )
    .join('')
  return `<table class="print-doc__table"><thead>${head}</thead><tbody>${body}</tbody></table>`
}

function renderAddressBook(rows: Client[]): string {
  if (rows.length === 0) return '<p>Nessun cliente da stampare.</p>'
  const items = rows
    .map(
      c => `
      <li class="print-doc__list-item">
        <div class="print-doc__list-name">${escapeHtml(c.name)}</div>
        <div class="print-doc__list-line">${escapeHtml(formatClientAddress(c))}</div>
        ${c.vatNumber ? `<div class="print-doc__list-line">P.IVA ${escapeHtml(c.vatNumber)}</div>` : ''}
      </li>
    `,
    )
    .join('')
  return `<ul class="print-doc__list">${items}</ul>`
}

function renderPhoneBook(rows: Client[]): string {
  if (rows.length === 0) return '<p>Nessun cliente da stampare.</p>'
  const items = rows
    .map(c => {
      const contacts = [
        c.phone ? `Tel. ${c.phone}` : '',
        c.cellPhone ? `Cell. ${c.cellPhone}` : '',
        c.email ? c.email : '',
      ]
        .filter(Boolean)
        .join(' · ')
      return `
        <li class="print-doc__list-item">
          <div class="print-doc__list-name">${escapeHtml(c.name)}</div>
          <div class="print-doc__list-line">${escapeHtml(contacts || '—')}</div>
        </li>
      `
    })
    .join('')
  return `<ul class="print-doc__list">${items}</ul>`
}

function renderSingleCard(client: Client): string {
  return `
    <div class="print-doc__card">
      <div class="print-doc__card-section print-doc__card-section--full">
        <div class="print-doc__section-title">Anagrafica</div>
        <div class="print-doc__card">
          ${renderField('Codice', displayValue(client.code))}
          ${renderField('Denominazione', client.name)}
          ${renderField('Tipo', clientTypeLabel(client.type))}
          ${renderField('P. IVA', displayValue(client.vatNumber))}
          ${renderField('Cod. Fiscale', displayValue(client.fiscalCode))}
          ${renderField('Indirizzo', displayValue(client.address), true)}
          ${renderField('Città', [client.cap, client.city, client.province].filter(Boolean).join(' ') || '—', true)}
          ${renderField('Nazione', displayValue(client.nation))}
        </div>
      </div>
      <div class="print-doc__card-section print-doc__card-section--full">
        <div class="print-doc__section-title">Contatti</div>
        <div class="print-doc__card">
          ${renderField('Telefono', displayValue(client.phone))}
          ${renderField('Cellulare', displayValue(client.cellPhone))}
          ${renderField('Email', displayValue(client.email))}
          ${renderField('PEC', displayValue(client.pec))}
          ${renderField('Referente', displayValue(client.contactPerson))}
          ${renderField('Fax', displayValue(client.fax))}
        </div>
      </div>
      <div class="print-doc__card-section print-doc__card-section--full">
        <div class="print-doc__section-title">Dati commerciali</div>
        <div class="print-doc__card">
          ${renderField('Listino', PRICE_LIST_LABELS[client.priceList || 'privati'] || displayValue(client.priceList))}
          ${renderField('Pagamento', displayValue(client.paymentMethod))}
          ${renderField('Riparazioni', String(client.repairsCount ?? 0))}
          ${renderField('Totale speso', `€ ${(client.totalSpent ?? 0).toFixed(2)}`)}
        </div>
      </div>
      ${
        client.notes
          ? `<div class="print-doc__card-section print-doc__card-section--full">
        <div class="print-doc__section-title">Note</div>
        ${renderField('Note', client.notes, true)}
      </div>`
          : ''
      }
    </div>
  `
}

export const CLIENT_PRINT_MODELS: PrintModel<ClientPrintContext>[] = [
  {
    id: 'full-list',
    label: 'Elenco completo',
    renderBody: ctx => renderFullList(ctx.rows),
  },
  {
    id: 'address-book',
    label: 'Indirizzario',
    renderBody: ctx => renderAddressBook(ctx.rows),
  },
  {
    id: 'phone-book',
    label: 'Rubrica telefonica',
    renderBody: ctx => renderPhoneBook(ctx.rows),
  },
  {
    id: 'single-card',
    label: 'Scheda singola anagrafica',
    requiresSelection: true,
    disabledHint: 'Seleziona un cliente dall’elenco',
    isDisabled: ctx => !ctx.selected,
    renderBody: ctx => (ctx.selected ? renderSingleCard(ctx.selected) : '<p>Seleziona un cliente.</p>'),
  },
]

export function renderClientPrintDocument(modelId: string, context: ClientPrintContext): string {
  const model = CLIENT_PRINT_MODELS.find(m => m.id === modelId) ?? CLIENT_PRINT_MODELS[0]
  const header: PrintDocumentHeader = {
    ...context.header,
    documentTitle:
      model.id === 'single-card' && context.selected
        ? `Scheda cliente — ${context.selected.name}`
        : model.label,
  }
  return wrapPrintDocument(header, model.renderBody(context))
}

export function getClientPrintModel(modelId: string): PrintModel<ClientPrintContext> {
  return CLIENT_PRINT_MODELS.find(m => m.id === modelId) ?? CLIENT_PRINT_MODELS[0]
}
