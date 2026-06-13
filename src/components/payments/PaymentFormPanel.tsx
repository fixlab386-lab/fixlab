import { useMemo, useState } from 'react'
import type { Client, PaymentResource, Supplier } from '../../types'
import { RESOURCE_TYPE_LABELS } from '../../lib/paymentResources'
import { FormField, ToolButton } from '../ui'

export type PaymentFormState = {
  date: string
  flowType: 'in' | 'out'
  description: string
  subjectType?: 'client' | 'supplier'
  subjectId?: string
  subjectName?: string
  resourceId: string
  amount: number
  settled: boolean
  notes?: string
  linkedDocumentId?: string
  linkedDocumentNumber?: string
}

export function createEmptyPaymentForm(defaultResourceId = ''): PaymentFormState {
  return {
    date: new Date().toISOString().split('T')[0],
    flowType: 'in',
    description: '',
    resourceId: defaultResourceId,
    amount: 0,
    settled: true,
    notes: '',
    linkedDocumentId: '',
    linkedDocumentNumber: '',
  }
}

type Props = {
  resources: PaymentResource[]
  clients: Client[]
  suppliers: Supplier[]
  form: PaymentFormState
  onChange: (form: PaymentFormState) => void
  saving: boolean
  saveError: string | null
  onSave: () => void
  onCancel: () => void
  onManageResources: () => void
}

export default function PaymentFormPanel({
  resources,
  clients,
  suppliers,
  form,
  onChange,
  saving,
  saveError,
  onSave,
  onCancel,
  onManageResources,
}: Props) {
  const [subjectSearch, setSubjectSearch] = useState(form.subjectName || '')
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)

  const searchLower = subjectSearch.trim().toLowerCase()
  const filteredSubjects = useMemo(() => {
    const items: { id: string; name: string; type: 'client' | 'supplier'; hint?: string }[] = []
    if (!searchLower) {
      clients.slice(0, 8).forEach(c => items.push({ id: c.id, name: c.name, type: 'client', hint: c.phone }))
      suppliers.slice(0, 4).forEach(s => items.push({ id: s.id, name: s.name, type: 'supplier' }))
      return items
    }
    clients
      .filter(c => `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(searchLower))
      .slice(0, 8)
      .forEach(c => items.push({ id: c.id, name: c.name, type: 'client', hint: c.phone }))
    suppliers
      .filter(s => `${s.name} ${s.phone || ''} ${s.email || ''}`.toLowerCase().includes(searchLower))
      .slice(0, 6)
      .forEach(s => items.push({ id: s.id, name: s.name, type: 'supplier' }))
    return items
  }, [clients, suppliers, searchLower])

  return (
    <div className="gestionale-payment-form">
      <h3 className="gestionale-payment-form__title">
        {form.flowType === 'in' ? 'Nuova entrata' : 'Nuova uscita'}
      </h3>

      <div className="gestionale-payment-form__grid">
        <FormField label="Data" htmlFor="pay-form-date" labelWidth={100}>
          <input
            id="pay-form-date"
            type="date"
            className="gestionale-form-field__input"
            value={form.date}
            onChange={e => onChange({ ...form, date: e.target.value })}
          />
        </FormField>

        <FormField label="Tipo" htmlFor="pay-form-flow" labelWidth={100}>
          <select
            id="pay-form-flow"
            className="gestionale-form-field__input"
            value={form.flowType}
            onChange={e => onChange({ ...form, flowType: e.target.value as 'in' | 'out' })}
          >
            <option value="in">Entrata</option>
            <option value="out">Uscita</option>
          </select>
        </FormField>
      </div>

      <FormField label="Descrizione" htmlFor="pay-form-desc" labelWidth={100} required>
        <input
          id="pay-form-desc"
          className="gestionale-form-field__input"
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          placeholder="Es. Incasso riparazione, Pagamento fornitore…"
        />
      </FormField>

      <FormField label="Cliente/Fornitore" htmlFor="pay-form-subject" labelWidth={100}>
        <div className="gestionale-payment-form__subject-picker">
          <input
            id="pay-form-subject"
            className="gestionale-form-field__input"
            value={subjectSearch}
            onChange={e => {
              setSubjectSearch(e.target.value)
              onChange({ ...form, subjectName: e.target.value, subjectId: undefined, subjectType: undefined })
              setShowSubjectPicker(true)
            }}
            onFocus={() => setShowSubjectPicker(true)}
            placeholder="Cerca o digita (opzionale)…"
          />
          {showSubjectPicker && filteredSubjects.length > 0 ? (
            <ul className="gestionale-doc-client-dropdown">
              {filteredSubjects.map(s => (
                <li key={`${s.type}-${s.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectSearch(s.name)
                      onChange({
                        ...form,
                        subjectId: s.id,
                        subjectName: s.name,
                        subjectType: s.type,
                      })
                      setShowSubjectPicker(false)
                    }}
                  >
                    <span style={{ color: 'var(--gestionale-text-muted)', marginRight: 6 }}>
                      {s.type === 'client' ? 'Cliente' : 'Fornitore'}
                    </span>
                    {s.name}
                    {s.hint ? <span style={{ color: 'var(--gestionale-text-muted)', marginLeft: 6 }}>{s.hint}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </FormField>

      <div className="gestionale-payment-form__grid">
        <FormField label="Risorsa" htmlFor="pay-form-resource" labelWidth={100}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              id="pay-form-resource"
              className="gestionale-form-field__input"
              style={{ flex: 1 }}
              value={form.resourceId}
              onChange={e => onChange({ ...form, resourceId: e.target.value })}
            >
              <option value="">Seleziona…</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button type="button" className="gestionale-tool-btn" onClick={onManageResources}>
              ⚙
            </button>
          </div>
        </FormField>

        <FormField label="Importo €" htmlFor="pay-form-amount" labelWidth={100}>
          <input
            id="pay-form-amount"
            type="number"
            step="0.01"
            min={0}
            className="gestionale-form-field__input"
            value={form.amount || ''}
            onChange={e => onChange({ ...form, amount: parseFloat(e.target.value) || 0 })}
          />
        </FormField>
      </div>

      <FormField label="Stato" htmlFor="pay-form-settled" labelWidth={100}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            id="pay-form-settled"
            type="checkbox"
            checked={form.settled}
            onChange={e => onChange({ ...form, settled: e.target.checked })}
          />
          Saldato
        </label>
      </FormField>

      <div className="gestionale-payment-form__grid">
        <FormField label="Doc. collegato" htmlFor="pay-form-doc-num" labelWidth={100}>
          <input
            id="pay-form-doc-num"
            className="gestionale-form-field__input"
            value={form.linkedDocumentNumber || ''}
            onChange={e => onChange({ ...form, linkedDocumentNumber: e.target.value })}
            placeholder="Es. Ricevuta 12/2026"
          />
        </FormField>
        <FormField label="ID documento" htmlFor="pay-form-doc-id" labelWidth={100}>
          <input
            id="pay-form-doc-id"
            className="gestionale-form-field__input"
            value={form.linkedDocumentId || ''}
            onChange={e => onChange({ ...form, linkedDocumentId: e.target.value })}
            placeholder="Opzionale"
          />
        </FormField>
      </div>

      <FormField label="Note" htmlFor="pay-form-notes" labelWidth={100}>
        <textarea
          id="pay-form-notes"
          className="gestionale-form-field__input"
          rows={2}
          value={form.notes || ''}
          onChange={e => onChange({ ...form, notes: e.target.value })}
        />
      </FormField>

      {resources.length > 0 ? (
        <p className="gestionale-payment-form__hint">
          Risorse configurate:{' '}
          {resources.map(r => `${r.name} (${RESOURCE_TYPE_LABELS[r.type]})`).join(' · ')}
        </p>
      ) : null}

      {saveError ? <p className="gestionale-payment-form__error">{saveError}</p> : null}

      <div className="gestionale-payment-form__actions">
        <ToolButton
          label={saving ? 'Salvataggio…' : 'Salva'}
          onClick={onSave}
          disabled={saving || !form.description.trim() || !form.resourceId}
        />
        <ToolButton label="Annulla" onClick={onCancel} disabled={saving} />
      </div>
    </div>
  )
}
