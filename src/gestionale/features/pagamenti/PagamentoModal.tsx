import { useEffect, useState } from 'react'
import type { Payment, PaymentResource, DocRecord } from '../../../types'
import { loadSubjectDocuments, loadRecentClients, loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import { searchClients, searchSuppliers } from '../../../lib/firestorePagination'
import { formatPaymentDate } from './utils'
import '../../../theme/gestionale-dialog.css'
import '../../theme/pagamenti-section.css'

export type PaymentFormState = {
  dueDate: string
  settledDate: string
  resourceId: string
  subjectType?: 'client' | 'supplier'
  subjectId?: string
  subjectName?: string
  description: string
  paymentMethod: string
  amountIn: number
  amountOut: number
  settled: boolean
  linkedDocumentId?: string
  linkedDocumentNumber?: string
  notes?: string
}

export function createEmptyPaymentForm(defaultResourceId = ''): PaymentFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    dueDate: today,
    settledDate: today,
    resourceId: defaultResourceId,
    description: '',
    paymentMethod: '',
    amountIn: 0,
    amountOut: 0,
    settled: true,
    linkedDocumentId: '',
    linkedDocumentNumber: '',
    notes: '',
  }
}

export function paymentToFormState(p: Payment, resources: PaymentResource[]): PaymentFormState {
  const resourceId =
    p.resourceId || resources.find(r => r.name === p.resourceName)?.id || resources[0]?.id || ''
  return {
    dueDate: p.date,
    settledDate: p.settledDate || p.date,
    resourceId,
    subjectType: p.subjectType,
    subjectId: p.subjectId,
    subjectName: p.subjectName,
    description: p.description,
    paymentMethod: p.paymentMethod || '',
    amountIn: p.amountIn || 0,
    amountOut: p.amountOut || 0,
    settled: p.settled,
    linkedDocumentId: p.linkedDocumentId || '',
    linkedDocumentNumber: p.linkedDocumentNumber || '',
    notes: p.notes || '',
  }
}

const PAYMENT_METHODS = ['Contanti', 'Bonifico', 'Ri.Ba.', 'Carta', 'Assegno', 'PayPal', 'Altro'] as const

type Props = {
  open: boolean
  mode: 'new' | 'edit'
  form: PaymentFormState
  resources: PaymentResource[]
  studioId: string
  saving: boolean
  saveError: string | null
  onChange: (form: PaymentFormState) => void
  onSave: () => void
  onClose: () => void
  onManageResources: () => void
}

export default function PagamentoModal({
  open,
  mode: _mode,
  form,
  resources,
  studioId,
  saving,
  saveError,
  onChange,
  onSave,
  onClose,
  onManageResources,
}: Props) {
  const [subjectSearch, setSubjectSearch] = useState(form.subjectName || '')
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [subjectDocs, setSubjectDocs] = useState<DocRecord[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<
    { id: string; name: string; type: 'client' | 'supplier'; hint?: string }[]
  >([])

  useEffect(() => {
    if (!open) return
    setSubjectSearch(form.subjectName || '')
  }, [open, form.subjectName])

  useEffect(() => {
    if (!open || !form.subjectId || !studioId) {
      setSubjectDocs([])
      return
    }
    let cancelled = false
    void loadSubjectDocuments(studioId, form.subjectId).then(docs => {
      if (cancelled) return
      setSubjectDocs(
        docs.filter(
          d =>
            d.subjectId === form.subjectId &&
            (!form.subjectType || d.subjectType === form.subjectType),
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [open, form.subjectId, form.subjectType, studioId])

  useEffect(() => {
    if (!open || !studioId) return
    const term = subjectSearch.trim()
    const timer = window.setTimeout(() => {
      if (!term) {
        void Promise.all([loadRecentClients(studioId, 10), loadRecentSuppliers(studioId, 6)]).then(
          ([clients, suppliers]) => {
            const items: { id: string; name: string; type: 'client' | 'supplier'; hint?: string }[] = []
            clients.forEach(c => items.push({ id: c.id, name: c.name, type: 'client', hint: c.phone }))
            suppliers.forEach(s => items.push({ id: s.id, name: s.name, type: 'supplier' }))
            setFilteredSubjects(items)
          },
        )
        return
      }
      void Promise.all([searchClients(studioId, term, 10), searchSuppliers(studioId, term, 8)]).then(
        ([clients, suppliers]) => {
          const items: { id: string; name: string; type: 'client' | 'supplier'; hint?: string }[] = []
          clients.forEach(c => items.push({ id: c.id, name: c.name, type: 'client', hint: c.phone }))
          suppliers.forEach(s => items.push({ id: s.id, name: s.name, type: 'supplier' }))
          setFilteredSubjects(items)
        },
      )
    }, term ? 250 : 0)
    return () => clearTimeout(timer)
  }, [open, studioId, subjectSearch])

  if (!open) return null

  const canSave =
    form.description.trim().length > 0 &&
    form.resourceId &&
    (form.amountIn > 0 || form.amountOut > 0)

  const docRefLabel = (d: DocRecord) => {
    const date = formatPaymentDate(d.date)
    return `${d.fullNumber || d.number} del ${date}`
  }

  return (
    <div
      className="gestionale-dialog-overlay pagamenti-modal-overlay"
      onClick={e => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="pagamenti-modal" role="dialog" aria-labelledby="pagamento-modal-title">
        <header className="pagamenti-modal__header">
          <div className="pagamenti-modal__header-text">
            <h2 id="pagamento-modal-title" className="pagamenti-modal__title">
              Pagamento
            </h2>
            <p className="pagamenti-modal__subtitle">Informazioni relative alla voce corrente</p>
          </div>
          <div className="pagamenti-modal__euro" aria-hidden>
            €
          </div>
          <button
            type="button"
            className="pagamenti-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </header>

        <div className="pagamenti-modal__body">
          <div className="pagamenti-modal__row pagamenti-modal__row--3">
            <label className="pagamenti-modal__field">
              <span className="pagamenti-modal__label">Data scadenza</span>
              <input
                type="date"
                className="pagamenti-modal__input"
                value={form.dueDate}
                onChange={e => onChange({ ...form, dueDate: e.target.value })}
              />
            </label>

            <label className="pagamenti-modal__field">
              <span className="pagamenti-modal__label">Risorsa</span>
              <div className="pagamenti-modal__inline">
                <select
                  className="pagamenti-modal__input pagamenti-modal__input--flex"
                  value={form.resourceId}
                  onChange={e => {
                    const res = resources.find(r => r.id === e.target.value)
                    onChange({
                      ...form,
                      resourceId: e.target.value,
                      paymentMethod: res?.name || form.paymentMethod,
                    })
                  }}
                >
                  <option value="">Seleziona…</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="pagamenti-modal__icon-btn" title="Gestisci risorse" onClick={onManageResources}>
                  📋
                </button>
              </div>
            </label>

            <label className="pagamenti-modal__field pagamenti-modal__field--wide">
              <span className="pagamenti-modal__label">Soggetto</span>
              <div className="pagamenti-modal__inline pagamenti-modal__subject">
                <input
                  className="pagamenti-modal__input pagamenti-modal__input--flex"
                  value={subjectSearch}
                  onChange={e => {
                    setSubjectSearch(e.target.value)
                    onChange({ ...form, subjectName: e.target.value, subjectId: undefined, subjectType: undefined })
                    setShowSubjectPicker(true)
                  }}
                  onFocus={() => setShowSubjectPicker(true)}
                  placeholder="Cliente o fornitore…"
                />
                <button type="button" className="pagamenti-modal__icon-btn pagamenti-modal__icon-btn--green" title="Rubrica">
                  👤
                </button>
                {showSubjectPicker && filteredSubjects.length > 0 ? (
                  <ul className="pagamenti-modal__suggest">
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
                          <span className="pagamenti-modal__suggest-type">
                            {s.type === 'client' ? 'Cliente' : 'Fornitore'}
                          </span>
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </label>
          </div>

          <div className="pagamenti-modal__row pagamenti-modal__row--2">
            <label className="pagamenti-modal__field">
              <span className="pagamenti-modal__label">Data saldo</span>
              <input
                type="date"
                className="pagamenti-modal__input"
                value={form.settledDate}
                disabled={!form.settled}
                onChange={e => onChange({ ...form, settledDate: e.target.value })}
              />
            </label>

            <label className="pagamenti-modal__field pagamenti-modal__field--wide">
              <span className="pagamenti-modal__label">Descrizione</span>
              <div className="pagamenti-modal__inline">
                <input
                  className="pagamenti-modal__input pagamenti-modal__input--flex"
                  value={form.description}
                  onChange={e => onChange({ ...form, description: e.target.value })}
                  placeholder="Descrizione movimento…"
                />
                <button type="button" className="pagamenti-modal__icon-btn" title="Descrizioni predefinite">
                  📄
                </button>
              </div>
            </label>
          </div>

          <div className="pagamenti-modal__row pagamenti-modal__row--ref">
            <label className="pagamenti-modal__field pagamenti-modal__field--wide">
              <span className="pagamenti-modal__label">Rf. pagamento</span>
              <select
                className="pagamenti-modal__input"
                value={form.linkedDocumentId || ''}
                onChange={e => {
                  const doc = subjectDocs.find(d => d.id === e.target.value)
                  onChange({
                    ...form,
                    linkedDocumentId: e.target.value,
                    linkedDocumentNumber: doc ? docRefLabel(doc) : form.linkedDocumentNumber,
                  })
                }}
              >
                <option value="">—</option>
                {subjectDocs.map(d => (
                  <option key={d.id} value={d.id}>
                    {docRefLabel(d)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pagamenti-modal__row pagamenti-modal__row--amounts">
            <label className="pagamenti-modal__field pagamenti-modal__field--amount">
              <span className="pagamenti-modal__label pagamenti-modal__label--bold">Entrata</span>
              <div className="pagamenti-modal__money">
                <span>€</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pagamenti-modal__input pagamenti-modal__input--money"
                  value={form.amountIn || ''}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0
                    onChange({ ...form, amountIn: v, amountOut: v > 0 ? 0 : form.amountOut })
                  }}
                />
              </div>
            </label>

            <label className="pagamenti-modal__field pagamenti-modal__field--amount">
              <span className="pagamenti-modal__label">Uscita</span>
              <div className="pagamenti-modal__money">
                <span>€</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pagamenti-modal__input pagamenti-modal__input--money"
                  value={form.amountOut || ''}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0
                    onChange({ ...form, amountOut: v, amountIn: v > 0 ? 0 : form.amountIn })
                  }}
                />
              </div>
            </label>

            <label className="pagamenti-modal__check">
              <input
                type="checkbox"
                checked={form.settled}
                onChange={e =>
                  onChange({
                    ...form,
                    settled: e.target.checked,
                    settledDate: e.target.checked ? form.settledDate || form.dueDate : form.settledDate,
                  })
                }
              />
              Saldato
            </label>

            <button type="button" className="pagamenti-modal__sollecito" disabled={form.settled}>
              Sollecito »
            </button>
          </div>

          <div className="pagamenti-modal__row">
            <label className="pagamenti-modal__field">
              <span className="pagamenti-modal__label">Modalità pagamento</span>
              <select
                className="pagamenti-modal__input"
                value={form.paymentMethod}
                onChange={e => onChange({ ...form, paymentMethod: e.target.value })}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {saveError ? <p className="pagamenti-modal__error">{saveError}</p> : null}
        </div>

        <footer className="pagamenti-modal__footer">
          <button type="button" className="pagamenti-modal__btn pagamenti-modal__btn--primary" disabled={saving || !canSave} onClick={onSave}>
            {saving ? 'Salvataggio…' : 'OK'}
          </button>
          <button type="button" className="pagamenti-modal__btn" disabled={saving} onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="pagamenti-modal__btn pagamenti-modal__btn--help" title="Aiuto">
            ?
          </button>
        </footer>
      </div>
    </div>
  )
}
