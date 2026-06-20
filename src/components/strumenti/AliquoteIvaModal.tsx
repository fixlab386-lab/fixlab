import { Fragment, useEffect, useMemo, useState } from 'react'
import '../../theme/gestionale-dialog.css'
import '../../theme/strumenti-tabelle.css'
import { newTableId, type AliquotaIva, type NaturaIva } from '../../lib/studioTables'

const NATURE: NaturaIva[] = [
  'Imponibile',
  'Acq. reverse charge',
  'Split payment',
  'Non imponibile',
  'Esente',
  'Escluso',
  'Fuori campo IVA',
]

type Props = {
  aliquote: AliquotaIva[]
  onSave: (next: AliquotaIva[]) => Promise<void> | void
  onClose: () => void
}

export default function AliquoteIvaModal({ aliquote, onSave, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(aliquote[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (aliquote.length > 0 && (!selectedId || !aliquote.some(a => a.id === selectedId))) {
      setSelectedId(aliquote[0].id)
    }
  }, [aliquote, selectedId])

  const selected = useMemo(() => aliquote.find(a => a.id === selectedId) ?? null, [aliquote, selectedId])

  const grouped = useMemo(() => {
    const map = new Map<NaturaIva, AliquotaIva[]>()
    for (const a of aliquote) {
      const list = map.get(a.naturaIva) ?? []
      list.push(a)
      map.set(a.naturaIva, list)
    }
    return [...map.entries()]
  }, [aliquote])

  const commit = async (next: AliquotaIva[]) => {
    setError(null)
    try {
      await onSave(next)
    } catch {
      setError('Salvataggio non riuscito.')
    }
  }

  const patchSelected = (patch: Partial<AliquotaIva>) => {
    if (!selected) return
    void commit(aliquote.map(a => (a.id === selected.id ? { ...a, ...patch } : a)))
  }

  const handleNuovo = () => {
    const id = newTableId()
    const next: AliquotaIva = {
      id,
      codice: '0',
      naturaIva: selected?.naturaIva ?? 'Imponibile',
      aliquota: 0,
      descrizione: 'Nuova aliquota',
    }
    void commit([...aliquote, next])
    setSelectedId(id)
  }

  const handleElimina = () => {
    if (!selected) return
    if (!confirm(`Eliminare l'aliquota «${selected.descrizione}»?`)) return
    const remaining = aliquote.filter(a => a.id !== selected.id)
    void commit(remaining)
    setSelectedId(remaining[0]?.id ?? null)
  }

  const handlePredefinito = (id: string) => {
    void commit(aliquote.map(a => ({ ...a, predefinito: a.id === id })))
  }

  return (
    <div className="gestionale-dialog-overlay strum-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="strum-modal strum-modal--wide" role="dialog" aria-labelledby="strum-iva-title">
        <header className="strum-modal__header">
          <div>
            <h2 id="strum-iva-title" className="strum-modal__title">Aliquote IVA</h2>
            <p className="strum-modal__subtitle">Modifica elenco voci</p>
          </div>
          <div className="strum-modal__emoji" aria-hidden>％</div>
          <button type="button" className="strum-modal__close-x" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>

        <div className="strum-modal__body">
          <div className="strum-modal__master">
            <table className="strum-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Codice Iva</th>
                  <th>Descrizione</th>
                  <th className="strum-table__col-predef">Predef.</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([natura, items]) => (
                  <Fragment key={natura}>
                    <tr className="strum-table__group-row">
                      <td colSpan={3}><span className="strum-table__group-btn">{natura}</span></td>
                    </tr>
                    {items.map(a => (
                      <tr
                        key={a.id}
                        className={`strum-table__row strum-table__row--child${selectedId === a.id ? ' strum-table__row--selected' : ''}`}
                        onClick={() => setSelectedId(a.id)}
                      >
                        <td><span className="strum-badge">{a.codice}</span></td>
                        <td>{a.descrizione}</td>
                        <td className="strum-table__col-predef">
                          <input
                            type="checkbox"
                            checked={!!a.predefinito}
                            onChange={() => handlePredefinito(a.id)}
                            onClick={e => e.stopPropagation()}
                            aria-label={`Predefinita ${a.descrizione}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="strum-modal__detail">
            {selected ? (
              <>
                <div className="strum-row">
                  <label className="strum-field">
                    <span className="strum-field__label">Codice Iva</span>
                    <input
                      className="strum-input"
                      key={`cod-${selected.id}`}
                      defaultValue={selected.codice}
                      onBlur={e => e.target.value.trim() !== selected.codice && patchSelected({ codice: e.target.value.trim() })}
                    />
                  </label>
                  <label className="strum-field">
                    <span className="strum-field__label">Aliquota %</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="strum-input"
                      key={`ali-${selected.id}`}
                      defaultValue={selected.aliquota}
                      onBlur={e => {
                        const v = parseFloat(e.target.value) || 0
                        if (v !== selected.aliquota) patchSelected({ aliquota: v })
                      }}
                    />
                  </label>
                </div>
                <label className="strum-field">
                  <span className="strum-field__label">Natura Iva</span>
                  <select
                    className="strum-select"
                    value={selected.naturaIva}
                    onChange={e => patchSelected({ naturaIva: e.target.value as NaturaIva })}
                  >
                    {NATURE.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="strum-field">
                  <span className="strum-field__label">% Indetraibile</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="strum-input"
                    key={`ind-${selected.id}`}
                    defaultValue={selected.indetraibile ?? ''}
                    placeholder="0"
                    onBlur={e => {
                      const raw = e.target.value.trim()
                      const v = raw === '' ? undefined : (parseFloat(raw) || 0)
                      if (v !== selected.indetraibile) patchSelected({ indetraibile: v })
                    }}
                  />
                </label>
                <label className="strum-field">
                  <span className="strum-field__label">Descrizione</span>
                  <input
                    className="strum-input"
                    key={`desc-${selected.id}`}
                    defaultValue={selected.descrizione}
                    onBlur={e => e.target.value.trim() !== selected.descrizione && patchSelected({ descrizione: e.target.value.trim() })}
                  />
                </label>
                <label className="strum-field">
                  <span className="strum-field__label">Note</span>
                  <textarea
                    className="strum-textarea"
                    rows={3}
                    key={`note-${selected.id}`}
                    defaultValue={selected.note ?? ''}
                    onBlur={e => e.target.value !== (selected.note ?? '') && patchSelected({ note: e.target.value })}
                  />
                </label>
              </>
            ) : (
              <p className="strum-modal__empty">Seleziona un&apos;aliquota dall&apos;elenco.</p>
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
            <span className="strum-modal__count">{aliquote.length} voci</span>
            <button type="button" className="strum-btn strum-btn--primary" onClick={onClose}>✕ Chiudi</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
