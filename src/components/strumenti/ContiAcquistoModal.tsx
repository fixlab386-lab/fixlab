import { useEffect, useMemo, useState } from 'react'
import '../../theme/gestionale-dialog.css'
import '../../theme/strumenti-tabelle.css'
import { newTableId, type ContoAcquisto } from '../../lib/studioTables'

const PREDEFINITO_PER = [
  'Acquisti / Prestaz. servizi',
  'Cespiti / Attrezzature',
  'Spese generali',
  'Carburanti',
  'Utenze',
]

type Props = {
  conti: ContoAcquisto[]
  onSave: (next: ContoAcquisto[]) => Promise<void> | void
  onClose: () => void
}

export default function ContiAcquistoModal({ conti, onSave, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(conti[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (conti.length > 0 && (!selectedId || !conti.some(c => c.id === selectedId))) {
      setSelectedId(conti[0].id)
    }
  }, [conti, selectedId])

  const selected = useMemo(() => conti.find(c => c.id === selectedId) ?? null, [conti, selectedId])

  const commit = async (next: ContoAcquisto[]) => {
    setError(null)
    try {
      await onSave(next)
    } catch {
      setError('Salvataggio non riuscito.')
    }
  }

  const patchSelected = (patch: Partial<ContoAcquisto>) => {
    if (!selected) return
    void commit(conti.map(c => (c.id === selected.id ? { ...c, ...patch } : c)))
  }

  const handleNuovo = () => {
    const id = newTableId()
    void commit([...conti, { id, nome: 'Nuovo conto' }])
    setSelectedId(id)
  }

  const handleElimina = () => {
    if (!selected) return
    if (!confirm(`Eliminare il conto «${selected.nome}»?`)) return
    const remaining = conti.filter(c => c.id !== selected.id)
    void commit(remaining)
    setSelectedId(remaining[0]?.id ?? null)
  }

  // "Predefinito per" è univoco: assegnandolo a un conto lo si rimuove dagli altri.
  const setPredefinitoPer = (value: string) => {
    if (!selected) return
    const val = value || undefined
    void commit(
      conti.map(c => {
        if (c.id === selected.id) return { ...c, predefinitoPer: val }
        if (val && c.predefinitoPer === val) return { ...c, predefinitoPer: undefined }
        return c
      }),
    )
  }

  return (
    <div className="gestionale-dialog-overlay strum-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="strum-modal" role="dialog" aria-labelledby="strum-conti-title">
        <header className="strum-modal__header">
          <div>
            <h2 id="strum-conti-title" className="strum-modal__title">Conti d&apos;acquisto</h2>
            <p className="strum-modal__subtitle">Modifica elenco voci</p>
          </div>
          <div className="strum-modal__emoji" aria-hidden>🧾</div>
          <button type="button" className="strum-modal__close-x" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>

        <div className="strum-modal__body">
          <div className="strum-modal__master">
            <table className="strum-table">
              <thead>
                <tr>
                  <th>Conto</th>
                  <th style={{ width: 180 }}>Predefinito per</th>
                </tr>
              </thead>
              <tbody>
                {conti.map(c => (
                  <tr
                    key={c.id}
                    className={`strum-table__row${selectedId === c.id ? ' strum-table__row--selected' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td>{c.nome}</td>
                    <td>{c.predefinitoPer ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="strum-modal__detail">
            {selected ? (
              <>
                <label className="strum-field">
                  <span className="strum-field__label">Nome conto</span>
                  <input
                    className="strum-input"
                    key={`nome-${selected.id}`}
                    defaultValue={selected.nome}
                    onBlur={e => e.target.value.trim() && e.target.value.trim() !== selected.nome && patchSelected({ nome: e.target.value.trim() })}
                  />
                </label>
                <label className="strum-field">
                  <span className="strum-field__label">Predefinito per</span>
                  <select
                    className="strum-select"
                    value={selected.predefinitoPer ?? ''}
                    onChange={e => setPredefinitoPer(e.target.value)}
                  >
                    <option value="">—</option>
                    {PREDEFINITO_PER.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <p className="strum-modal__empty">Seleziona un conto dall&apos;elenco.</p>
            )}
            {error ? <p className="strum-modal__error">{error}</p> : null}
          </div>
        </div>

        <footer className="strum-modal__footer">
          <div className="strum-modal__footer-left">
            <button type="button" className="strum-btn" onClick={handleNuovo}>
              <span className="strum-btn__icon--new">+</span> Nuovo
            </button>
            <button type="button" className="strum-btn" disabled={!selected} onClick={handleElimina}>
              <span className="strum-btn__icon--danger">✕</span> Elimina
            </button>
          </div>
          <div className="strum-modal__footer-right">
            <span className="strum-modal__count">{conti.length} voci</span>
            <button type="button" className="strum-btn strum-btn--primary" onClick={onClose}>✕ Chiudi</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
