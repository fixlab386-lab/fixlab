import type { Client, Supplier } from '../../types'
import type { DetailPanelField } from '../ui'
import { displayValue } from './utils'

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

function baseAddressFields(
  entity: Pick<Client | Supplier, 'address' | 'cap' | 'city' | 'province' | 'nation'>,
): DetailPanelField[] {
  return [
    { label: 'Indirizzo', value: displayValue(entity.address), span: 2 },
    {
      label: 'Città',
      value: [entity.cap, entity.city, entity.province].filter(Boolean).join(' ') || '—',
      span: 2,
    },
    { label: 'Nazione', value: displayValue(entity.nation) },
  ]
}

function baseContactFields(
  entity: Pick<Client | Supplier, 'phone' | 'cellPhone' | 'email' | 'pec' | 'contactPerson' | 'fax'>,
): DetailPanelField[] {
  const fields: DetailPanelField[] = [
    { label: 'Telefono', value: displayValue(entity.phone), link: !!entity.phone },
    { label: 'Cellulare', value: displayValue(entity.cellPhone) },
    { label: 'Email', value: displayValue(entity.email) },
    { label: 'PEC', value: displayValue(entity.pec) },
    { label: 'Referente', value: displayValue(entity.contactPerson) },
  ]
  if ('fax' in entity && entity.fax) {
    fields.push({ label: 'Fax', value: displayValue(entity.fax) })
  }
  return fields
}

export function clientDetailFields(
  client: Client,
  tab: 'anagrafica' | 'commerciali' | 'varie',
): DetailPanelField[] {
  if (tab === 'anagrafica') {
    return [
      { label: 'Codice', value: displayValue(client.code) },
      { label: 'Denominazione', value: client.name, span: 2 },
      { label: 'Tipo', value: clientTypeLabel(client.type) },
      { label: 'P. IVA', value: displayValue(client.vatNumber) },
      { label: 'Cod. Fiscale', value: displayValue(client.fiscalCode) },
      ...baseAddressFields(client),
      ...baseContactFields(client),
    ]
  }
  if (tab === 'commerciali') {
    return [
      { label: 'Listino', value: PRICE_LIST_LABELS[client.priceList || 'privati'] || client.priceList },
      { label: 'Pagamento', value: displayValue(client.paymentMethod) },
      { label: 'Riparazioni', value: String(client.repairsCount ?? 0) },
      { label: 'Totale speso', value: `€ ${(client.totalSpent ?? 0).toFixed(2)}` },
    ]
  }
  return [{ label: 'Note', value: displayValue(client.notes), span: 2 }]
}

export function supplierDetailFields(
  supplier: Supplier,
  tab: 'anagrafica' | 'commerciali' | 'varie',
): DetailPanelField[] {
  if (tab === 'anagrafica') {
    return [
      { label: 'Codice', value: displayValue(supplier.code) },
      { label: 'Denominazione', value: supplier.name, span: 2 },
      { label: 'Tipo', value: 'Fornitore' },
      { label: 'P. IVA', value: displayValue(supplier.vatNumber) },
      { label: 'Cod. Fiscale', value: displayValue(supplier.fiscalCode) },
      ...baseAddressFields(supplier),
      ...baseContactFields(supplier),
    ]
  }
  if (tab === 'commerciali') {
    return [
      { label: 'Condizioni pagamento', value: displayValue(supplier.paymentTerms) },
      { label: 'Banca', value: displayValue(supplier.bankName) },
      { label: 'IBAN', value: displayValue(supplier.bankIban), span: 2 },
    ]
  }
  return [{ label: 'Note', value: displayValue(supplier.notes), span: 2 }]
}
