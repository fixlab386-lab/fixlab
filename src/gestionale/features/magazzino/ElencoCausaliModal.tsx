import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import '../../../theme/gestionale-dialog.css'
import '../../theme/movimenti-section.css'

type Props = {
  causali: string[]
  onChange: (causali: string[]) => void
  onClose: () => void
}

export default function ElencoCausaliModal({ causali, onChange, onClose }: Props) {
  const [items, setItems] = useState<string[]>(causali)
  const [selected, setSelected] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const commit = (next: string[]) => {
    setItems(next)
    onChange(next)
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingValue(items[index] ?? '')
    setSelected(index)
  }

  const confirmEdit = () => {
    if (editingIndex === null) return
    const value = editingValue.trim()
    if (!value) {
      // riga vuota: rimuovi
      commit(items.filter((_, i) => i !== editingIndex))
    } else {
      commit(items.map((v, i) => (i === editingIndex ? value : v)))
    }
    setEditingIndex(null)
    setEditingValue('')
  }

  const handleNuovo = () => {
    const next = [...items, 'Nuova causale']
    commit(next)
    startEdit(next.length - 1)
  }

  const handleElimina = () => {
    if (selected === null) return
    commit(items.filter((_, i) => i !== selected))
    setSelected(null)
    setEditingIndex(null)
  }

  return createPortal(
    <div className="gestionale-dialog-overlay magazzino-dialog-overlay magazzino-dialog-overlay--top" onClick={onClose}>
      <div
        className="gestionale-dialog-card elenco-causali"
        role="dialog"
        aria-modal="true"
        aria-label="Elenco causali"
        onClick={e => e.stopPropagation()}
      >
        <div className="opmag2__titlebar">
          <span className="opmag2__titlebar-title">
            <span className="opmag2__titlebar-icon" aria-hidden="true">📝</span>
            FixLab
          </span>
          <button type="button" className="opmag2__titlebar-close" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="opmag2__header">
          <div className="opmag2__header-text">
            <h2>Elenco causali</h2>
            <p>Modifica elenco voci</p>
          </div>
          <span className="opmag2__header-icon" aria-hidden="true">📝</span>
        </div>

        <div className="elenco-causali__body">
          <div className="elenco-causali__list-title">Voci</div>
          <ul className="elenco-causali__list">
            {items.length === 0 ? (
              <li className="elenco-causali__empty">(Nessuna voce)</li>
            ) : (
              items.map((c, i) => (
                <li key={i}>
                  {editingIndex === i ? (
                    <input
                      className="elenco-causali__edit"
                      value={editingValue}
                      autoFocus
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={confirmEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmEdit()
                        if (e.key === 'Escape') {
                          setEditingIndex(null)
                          setEditingValue('')
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`elenco-causali__item${selected === i ? ' elenco-causali__item--selected' : ''}`}
                      onClick={() => setSelected(i)}
                      onDoubleClick={() => startEdit(i)}
                    >
                      {c || '\u00A0'}
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="elenco-causali__footer">
          <button type="button" className="elenco-causali__btn" onClick={handleNuovo}>
            <span className="elenco-causali__btn-icon elenco-causali__btn-icon--new" aria-hidden="true">＋</span>
            Nuovo
          </button>
          <button
            type="button"
            className="elenco-causali__btn"
            onClick={handleElimina}
            disabled={selected === null}
          >
            <span className="elenco-causali__btn-icon elenco-causali__btn-icon--del" aria-hidden="true">✕</span>
            Elimina
          </button>
          <span className="elenco-causali__spacer" />
          <button type="button" className="elenco-causali__btn" onClick={onClose}>
            <span className="elenco-causali__btn-icon" aria-hidden="true">✓</span>
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
