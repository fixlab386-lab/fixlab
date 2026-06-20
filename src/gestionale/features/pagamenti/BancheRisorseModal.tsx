import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import type { PaymentResource, PaymentResourceType } from '../../../types'
import '../../../theme/gestionale-dialog.css'
import '../../theme/banche-risorse.css'

const RESOURCE_GROUPS: { type: PaymentResourceType; label: string }[] = [
  { type: 'bank', label: 'Banche' },
  { type: 'card', label: 'Carte di credito' },
  { type: 'cash', label: 'Cassa' },
]

type Props = {
  resources: PaymentResource[]
  paymentCounts: Record<string, number>
  onClose: () => void
  onAdd: (data: {
    name: string
    type: PaymentResourceType
    initialBalance?: number
    isDefault?: boolean
    homeBankingUrl?: string
    notes?: string
  }) => Promise<void>
  onUpdate: (id: string, data: Partial<PaymentResource>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => void
}

export default function BancheRisorseModal({
  resources,
  paymentCounts,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onSetDefault,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(resources[0]?.id ?? null)
  const [expanded, setExpanded] = useState<Record<PaymentResourceType, boolean>>({
    bank: true,
    card: true,
    cash: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(() => resources.find(r => r.id === selectedId) ?? null, [resources, selectedId])

  useEffect(() => {
    if (resources.length > 0 && (!selectedId || !resources.some(r => r.id === selectedId))) {
      setSelectedId(resources[0].id)
    }
  }, [resources, selectedId])

  const paymentCountByResource = (id: string) => paymentCounts[id] ?? 0

  const patchSelected = useCallback(
    async (patch: Partial<PaymentResource>) => {
      if (!selected) return
      setSaving(true)
      setError(null)
      try {
        await onUpdate(selected.id, patch)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      } finally {
        setSaving(false)
      }
    },
    [selected, onUpdate],
  )

  const handleNuovo = async () => {
    const type: PaymentResourceType = selected?.type ?? 'cash'
    const name = window.prompt('Nome nuova risorsa:')
    if (!name?.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        name: name.trim(),
        type,
        initialBalance: 0,
        isDefault: resources.filter(r => r.type === type).length === 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creazione non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplica = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        name: `${selected.name} (copia)`,
        type: selected.type,
        initialBalance: selected.initialBalance ?? 0,
        homeBankingUrl: selected.homeBankingUrl,
        notes: selected.notes,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duplicazione non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleElimina = async () => {
    if (!selected) return
    const count = paymentCountByResource(selected.id)
    if (count > 0) {
      setError(`Impossibile eliminare: ${count} pagamenti usano questa risorsa.`)
      return
    }
    if (!confirm(`Eliminare la risorsa «${selected.name}»?`)) return
    setSaving(true)
    setError(null)
    try {
      await onDelete(selected.id)
      setSelectedId(resources.find(r => r.id !== selected.id)?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eliminazione non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleExcel = () => {
    const rows = [['Risorsa', 'Tipo', 'Saldo iniziale', 'Predefinita', 'Home banking', 'Note']]
    for (const r of resources) {
      rows.push([
        r.name,
        r.type,
        String(r.initialBalance ?? 0),
        r.isDefault ? 'Sì' : 'No',
        r.homeBankingUrl || '',
        r.notes || '',
      ])
    }
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'banche-risorse.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gestionale-dialog-overlay banche-risorse-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="banche-risorse-modal" role="dialog" aria-labelledby="banche-risorse-title">
        <header className="banche-risorse-modal__header">
          <div>
            <h2 id="banche-risorse-title" className="banche-risorse-modal__title">
              Ns. banche e risorse
            </h2>
            <p className="banche-risorse-modal__subtitle">Modifica elenco voci</p>
          </div>
          <div className="banche-risorse-modal__coins" aria-hidden>
            💵🪙
          </div>
          <button type="button" className="banche-risorse-modal__close-x" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </header>

        <div className="banche-risorse-modal__body">
          <div className="banche-risorse-modal__master">
            <table className="banche-risorse-modal__tree">
              <thead>
                <tr>
                  <th>Risorsa</th>
                  <th className="banche-risorse-modal__col-predef">Predef.</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCE_GROUPS.map(group => {
                  const items = resources.filter(r => r.type === group.type)
                  if (items.length === 0) return null
                  const isOpen = expanded[group.type]
                  return (
                    <Fragment key={group.type}>
                      <tr className="banche-risorse-modal__group-row">
                        <td colSpan={2}>
                          <button
                            type="button"
                            className="banche-risorse-modal__group-btn"
                            onClick={() => setExpanded(e => ({ ...e, [group.type]: !e[group.type] }))}
                          >
                            {isOpen ? '▼' : '▶'} {group.label}
                          </button>
                        </td>
                      </tr>
                      {isOpen
                        ? items.map(r => (
                            <tr
                              key={r.id}
                              className={`banche-risorse-modal__item-row${selectedId === r.id ? ' banche-risorse-modal__item-row--selected' : ''}`}
                              onClick={() => setSelectedId(r.id)}
                            >
                              <td>{r.name}</td>
                              <td className="banche-risorse-modal__col-predef">
                                <input
                                  type="checkbox"
                                  checked={!!r.isDefault}
                                  onChange={() => onSetDefault(r.id)}
                                  onClick={e => e.stopPropagation()}
                                  aria-label={`Predefinita ${r.name}`}
                                />
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="banche-risorse-modal__detail">
            {selected ? (
              <>
                <label className="banche-risorse-modal__field">
                  <span className="banche-risorse-modal__label">Nome risorsa</span>
                  <input
                    className="banche-risorse-modal__input"
                    defaultValue={selected.name}
                    key={`name-${selected.id}`}
                    disabled={saving}
                    onBlur={e => {
                      if (e.target.value.trim() && e.target.value !== selected.name) {
                        void patchSelected({ name: e.target.value.trim() })
                      }
                    }}
                  />
                </label>
                <label className="banche-risorse-modal__field">
                  <span className="banche-risorse-modal__label">Saldo iniziale</span>
                  <div className="banche-risorse-modal__money">
                    <span>€</span>
                    <input
                      type="number"
                      step="0.01"
                      className="banche-risorse-modal__input banche-risorse-modal__input--money"
                      defaultValue={selected.initialBalance ?? ''}
                      key={`bal-${selected.id}`}
                      disabled={saving}
                      onBlur={e => {
                        const val = parseFloat(e.target.value) || 0
                        if (val !== (selected.initialBalance ?? 0)) void patchSelected({ initialBalance: val })
                      }}
                    />
                  </div>
                </label>
                <fieldset className="banche-risorse-modal__fieldset">
                  <legend>Home banking</legend>
                  <label className="banche-risorse-modal__field">
                    <span className="banche-risorse-modal__label">Indirizzo Internet</span>
                    <div className="banche-risorse-modal__inline">
                      <input
                        className="banche-risorse-modal__input banche-risorse-modal__input--flex"
                        defaultValue={selected.homeBankingUrl || ''}
                        key={`url-${selected.id}`}
                        placeholder="https://…"
                        disabled={saving}
                        onBlur={e => {
                          if (e.target.value !== (selected.homeBankingUrl || '')) {
                            void patchSelected({ homeBankingUrl: e.target.value })
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="banche-risorse-modal__globe"
                        title="Apri in browser"
                        disabled={!selected.homeBankingUrl}
                        onClick={() => selected.homeBankingUrl && window.open(selected.homeBankingUrl, '_blank', 'noopener')}
                      >
                        🌐
                      </button>
                    </div>
                  </label>
                </fieldset>
                <label className="banche-risorse-modal__field">
                  <span className="banche-risorse-modal__label">Note</span>
                  <textarea
                    className="banche-risorse-modal__textarea"
                    rows={4}
                    defaultValue={selected.notes || ''}
                    key={`notes-${selected.id}`}
                    disabled={saving}
                    onBlur={e => {
                      if (e.target.value !== (selected.notes || '')) void patchSelected({ notes: e.target.value })
                    }}
                  />
                </label>
              </>
            ) : (
              <p className="banche-risorse-modal__empty">Seleziona una risorsa dall&apos;elenco.</p>
            )}
            {error ? <p className="banche-risorse-modal__error">{error}</p> : null}
          </div>
        </div>

        <footer className="banche-risorse-modal__footer">
          <div className="banche-risorse-modal__footer-left">
            <button type="button" className="banche-risorse-modal__btn" onClick={() => void handleNuovo()} disabled={saving}>
              <span className="banche-risorse-modal__btn-icon banche-risorse-modal__btn-icon--new">+</span> Nuovo
            </button>
            <button type="button" className="banche-risorse-modal__btn" disabled={!selected || saving} onClick={() => void handleDuplica()}>
              Duplica
            </button>
            <button type="button" className="banche-risorse-modal__btn" disabled={!selected || saving} onClick={() => void handleElimina()}>
              <span className="banche-risorse-modal__btn-icon banche-risorse-modal__btn-icon--danger">✕</span> Elimina
            </button>
            <button type="button" className="banche-risorse-modal__btn" onClick={handleExcel}>
              Excel
            </button>
          </div>
          <div className="banche-risorse-modal__footer-right">
            <button type="button" className="banche-risorse-modal__btn" title="Aiuto">
              ?
            </button>
            <button type="button" className="banche-risorse-modal__btn banche-risorse-modal__btn--primary" onClick={onClose}>
              ✕ Chiudi
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
