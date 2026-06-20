import { useEffect, useMemo, useState } from 'react'
import '../../theme/gestionale-dialog.css'
import '../../theme/strumenti-tabelle.css'
import { newTableId, type ScadenzaPagamento, type TipoPagamentoVoce } from '../../lib/studioTables'

const MODALITA = [
  'Contanti',
  'Bancomat',
  'Carta di credito',
  'Assegno',
  'Assegno circolare',
  'Bonifico',
  'RIBA',
  'SDD',
  'PayPal',
  'Contrassegno',
  'Altro',
]

type Props = {
  tipi: TipoPagamentoVoce[]
  onSave: (next: TipoPagamentoVoce[]) => Promise<void> | void
  onClose: () => void
}

export default function TipiPagamentoModal({ tipi, onSave, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(tipi[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tipi.length > 0 && (!selectedId || !tipi.some(t => t.id === selectedId))) {
      setSelectedId(tipi[0].id)
    }
  }, [tipi, selectedId])

  const selected = useMemo(() => tipi.find(t => t.id === selectedId) ?? null, [tipi, selectedId])

  const commit = async (next: TipoPagamentoVoce[]) => {
    setError(null)
    try {
      await onSave(next)
    } catch {
      setError('Salvataggio non riuscito.')
    }
  }

  const patchSelected = (patch: Partial<TipoPagamentoVoce>) => {
    if (!selected) return
    void commit(tipi.map(t => (t.id === selected.id ? { ...t, ...patch } : t)))
  }

  const handleNuovo = () => {
    const id = newTableId()
    const next: TipoPagamentoVoce = { id, nome: 'Nuovo pagamento', scadenza: 'immediata' }
    void commit([...tipi, next])
    setSelectedId(id)
  }

  const handleDuplica = () => {
    if (!selected) return
    const id = newTableId()
    void commit([...tipi, { ...selected, id, nome: `${selected.nome} (copia)`, predefinito: false }])
    setSelectedId(id)
  }

  const handleElimina = () => {
    if (!selected) return
    if (!confirm(`Eliminare il pagamento «${selected.nome}»?`)) return
    const remaining = tipi.filter(t => t.id !== selected.id)
    void commit(remaining)
    setSelectedId(remaining[0]?.id ?? null)
  }

  const handlePredefinito = (id: string) => {
    void commit(tipi.map(t => ({ ...t, predefinito: t.id === id })))
  }

  return (
    <div className="gestionale-dialog-overlay strum-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="strum-modal" role="dialog" aria-labelledby="strum-pag-title">
        <header className="strum-modal__header">
          <div>
            <h2 id="strum-pag-title" className="strum-modal__title">Tipi pagamento</h2>
            <p className="strum-modal__subtitle">Modifica elenco voci</p>
          </div>
          <div className="strum-modal__emoji" aria-hidden>💳</div>
          <button type="button" className="strum-modal__close-x" onClick={onClose} aria-label="Chiudi">✕</button>
        </header>

        <div className="strum-modal__body">
          <div className="strum-modal__master">
            <table className="strum-table">
              <thead>
                <tr>
                  <th>Nome pagamento</th>
                  <th className="strum-table__col-predef">Predef.</th>
                </tr>
              </thead>
              <tbody>
                {tipi.map(t => (
                  <tr
                    key={t.id}
                    className={`strum-table__row${selectedId === t.id ? ' strum-table__row--selected' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <td>{t.nome}</td>
                    <td className="strum-table__col-predef">
                      <input
                        type="checkbox"
                        checked={!!t.predefinito}
                        onChange={() => handlePredefinito(t.id)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Predefinito ${t.nome}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="strum-modal__detail">
            {selected ? (
              <>
                <label className="strum-field">
                  <span className="strum-field__label">Nome pagamento</span>
                  <input
                    className="strum-input"
                    key={`nome-${selected.id}`}
                    defaultValue={selected.nome}
                    onBlur={e => e.target.value.trim() && e.target.value.trim() !== selected.nome && patchSelected({ nome: e.target.value.trim() })}
                  />
                </label>
                <label className="strum-field">
                  <span className="strum-field__label">Modalità</span>
                  <select
                    className="strum-select"
                    value={selected.modalita ?? ''}
                    onChange={e => patchSelected({ modalita: e.target.value || undefined })}
                  >
                    <option value="">—</option>
                    {MODALITA.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>

                <fieldset className="strum-fieldset">
                  <legend>Scadenza</legend>
                  {([
                    ['immediata', 'Immediata'],
                    ['gia_saldata', 'Già saldata'],
                    ['altro', 'A scadenza (giorni)'],
                    ['fine_mese', 'A fine mese (giorni)'],
                  ] as [ScadenzaPagamento, string][]).map(([val, label]) => (
                    <label className="strum-radio" key={val}>
                      <input
                        type="radio"
                        name={`scad-${selected.id}`}
                        checked={selected.scadenza === val}
                        onChange={() => patchSelected({ scadenza: val })}
                      />
                      <span>{label}</span>
                      {(val === 'altro' || val === 'fine_mese') && selected.scadenza === val ? (
                        <input
                          type="number"
                          min={0}
                          className="strum-input"
                          key={`gg-${selected.id}`}
                          defaultValue={selected.giorni ?? 30}
                          onBlur={e => {
                            const v = parseInt(e.target.value, 10) || 0
                            if (v !== selected.giorni) patchSelected({ giorni: v })
                          }}
                        />
                      ) : null}
                    </label>
                  ))}
                </fieldset>

                <label className="strum-check">
                  <input
                    type="checkbox"
                    checked={!!selected.spostaScadenza}
                    onChange={e => patchSelected({ spostaScadenza: e.target.checked })}
                  />
                  <span>Sposta la scadenza a fine mese</span>
                </label>
                <label className="strum-check">
                  <input
                    type="checkbox"
                    checked={!!selected.speseIncasso}
                    onChange={e => patchSelected({ speseIncasso: e.target.checked })}
                  />
                  <span>Spese d&apos;incasso</span>
                </label>
                <label className="strum-check">
                  <input
                    type="checkbox"
                    checked={!!selected.pagabileTeamSystemPay}
                    onChange={e => patchSelected({ pagabileTeamSystemPay: e.target.checked })}
                  />
                  <span>Pagabile anche con TeamSystem Pay</span>
                </label>
              </>
            ) : (
              <p className="strum-modal__empty">Seleziona un pagamento dall&apos;elenco.</p>
            )}
            {error ? <p className="strum-modal__error">{error}</p> : null}
          </div>
        </div>

        <footer className="strum-modal__footer">
          <div className="strum-modal__footer-left">
            <button type="button" className="strum-btn" onClick={handleNuovo}>
              <span className="strum-btn__icon--new">+</span> Nuovo
            </button>
            <button type="button" className="strum-btn" disabled={!selected} onClick={handleDuplica}>Duplica</button>
            <button type="button" className="strum-btn" disabled={!selected} onClick={handleElimina}>
              <span className="strum-btn__icon--danger">✕</span> Elimina
            </button>
          </div>
          <div className="strum-modal__footer-right">
            <span className="strum-modal__count">{tipi.length} voci</span>
            <button type="button" className="strum-btn strum-btn--primary" onClick={onClose}>✕ Chiudi</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
