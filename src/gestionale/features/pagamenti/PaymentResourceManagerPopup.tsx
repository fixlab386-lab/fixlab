import { useState, useCallback } from 'react'
import type { Payment, PaymentResource, PaymentResourceType } from '../../../types'
import { RESOURCE_TYPE_LABELS } from '../../lib/paymentResources'
import '../../../theme/gestionale-dialog.css'

type Props = {
  resources: PaymentResource[]
  payments: Payment[]
  onClose: () => void
  onAdd: (data: {
    name: string
    type: PaymentResourceType
    initialBalance?: number
    isDefault?: boolean
  }) => Promise<void>
  onUpdate: (id: string, data: Partial<PaymentResource>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => Promise<void>
}

export default function PaymentResourceManagerPopup({
  resources,
  payments,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onSetDefault,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<PaymentResourceType>('cash')
  const [initialBalance, setInitialBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [draftBalances, setDraftBalances] = useState<Record<string, string>>({})

  const paymentCountByResource = (id: string) => payments.filter(p => p.resourceId === id).length

  const commitName = useCallback(
    async (r: PaymentResource) => {
      const draft = draftNames[r.id]
      if (draft == null) return
      const trimmed = draft.trim()
      setDraftNames(d => {
        const next = { ...d }
        delete next[r.id]
        return next
      })
      if (trimmed && trimmed !== r.name) await onUpdate(r.id, { name: trimmed })
    },
    [draftNames, onUpdate],
  )

  const commitBalance = useCallback(
    async (r: PaymentResource) => {
      const draft = draftBalances[r.id]
      if (draft == null) return
      setDraftBalances(d => {
        const next = { ...d }
        delete next[r.id]
        return next
      })
      const val = parseFloat(draft) || 0
      if (val !== (r.initialBalance ?? 0)) await onUpdate(r.id, { initialBalance: val })
    },
    [draftBalances, onUpdate],
  )

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        name: name.trim(),
        type,
        initialBalance: parseFloat(initialBalance) || 0,
        isDefault: resources.length === 0,
      })
      setName('')
      setInitialBalance('')
      setType('cash')
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const count = paymentCountByResource(id)
    if (count > 0) {
      setError(`Impossibile eliminare: ${count} pagamenti usano questa risorsa.`)
      return
    }
    if (!confirm('Eliminare questa risorsa?')) return
    setError(null)
    try {
      await onDelete(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    }
  }

  return (
    <div className="gestionale-dialog-overlay gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gestionale-dialog-card gestionale-dialog-card--wide" role="dialog">
        <header className="gestionale-dialog-card__header">
          <h2 className="gestionale-dialog-card__title">Ns. banche e risorse</h2>
        </header>
        <div className="gestionale-dialog-card__body">
          <p className="gestionale-dialog-hint" style={{ marginTop: 0 }}>
            Metodi di incasso e pagamento usati in prima nota e in cassa. Nessun collegamento bancario automatico.
          </p>

          <div className="gestionale-payment-resources">
            {resources.map(r => (
              <div key={r.id} className="gestionale-payment-resources__row">
                <button
                  type="button"
                  className={`gestionale-payment-resources__default${r.isDefault ? ' gestionale-payment-resources__default--active' : ''}`}
                  title={r.isDefault ? 'Predefinita' : 'Imposta predefinita'}
                  onClick={() => void onSetDefault(r.id)}
                >
                  {r.isDefault ? '★' : '☆'}
                </button>
                <input
                  className="gestionale-form-field__input gestionale-payment-resources__name"
                  value={draftNames[r.id] ?? r.name}
                  onChange={e => setDraftNames(d => ({ ...d, [r.id]: e.target.value }))}
                  onBlur={() => void commitName(r)}
                />
                <select
                  className="gestionale-form-field__input gestionale-payment-resources__type"
                  value={r.type}
                  onChange={e => void onUpdate(r.id, { type: e.target.value as PaymentResourceType })}
                >
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  className="gestionale-form-field__input gestionale-payment-resources__balance"
                  value={draftBalances[r.id] ?? (r.initialBalance != null ? String(r.initialBalance) : '')}
                  placeholder="Saldo iniz."
                  title="Saldo iniziale"
                  onChange={e => setDraftBalances(d => ({ ...d, [r.id]: e.target.value }))}
                  onBlur={() => void commitBalance(r)}
                />
                <button
                  type="button"
                  className="gestionale-payment-resources__delete"
                  title="Elimina"
                  onClick={() => void handleDelete(r.id)}
                >
                  ×
                </button>
              </div>
            ))}
            {resources.length === 0 ? (
              <p className="gestionale-dialog-hint">Nessuna risorsa — verranno create quelle predefinite al salvataggio.</p>
            ) : null}
          </div>

          {showForm ? (
            <div className="gestionale-payment-resources__form">
              <div className="gestionale-dialog-form-stack">
                <label className="gestionale-form-field" style={{ gridTemplateColumns: '100px 1fr' }}>
                  <span className="gestionale-form-field__label gestionale-form-field__label--required">Nome</span>
                  <input
                    className="gestionale-form-field__input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Es. PayPal, Assegno…"
                    autoFocus
                  />
                </label>
                <label className="gestionale-form-field" style={{ gridTemplateColumns: '100px 1fr' }}>
                  <span className="gestionale-form-field__label">Tipo</span>
                  <select
                    className="gestionale-form-field__input"
                    value={type}
                    onChange={e => setType(e.target.value as PaymentResourceType)}
                  >
                    {Object.entries(RESOURCE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="gestionale-form-field" style={{ gridTemplateColumns: '100px 1fr' }}>
                  <span className="gestionale-form-field__label">Saldo iniziale</span>
                  <input
                    type="number"
                    step="0.01"
                    className="gestionale-form-field__input"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    placeholder="0,00"
                  />
                </label>
              </div>
              <div className="gestionale-catalog-manager__form-actions">
                <button type="button" className="gestionale-dialog-btn" onClick={() => setShowForm(false)}>
                  Annulla
                </button>
                <button
                  type="button"
                  className="gestionale-dialog-btn gestionale-dialog-btn--primary"
                  disabled={!name.trim() || saving}
                  onClick={() => void handleCreate()}
                >
                  {saving ? 'Salvataggio…' : 'Aggiungi'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="gestionale-dialog-btn gestionale-dialog-btn--primary"
              style={{ marginTop: 12 }}
              onClick={() => setShowForm(true)}
            >
              + Nuova risorsa
            </button>
          )}

          {error ? <p className="gestionale-payment-form__error" style={{ marginTop: 10 }}>{error}</p> : null}
        </div>
        <footer className="gestionale-dialog-card__footer">
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Chiudi
          </button>
        </footer>
      </div>
    </div>
  )
}
