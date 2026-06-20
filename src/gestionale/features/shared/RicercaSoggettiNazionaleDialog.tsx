import { useCallback, useState } from 'react'
import {
  searchSoggettiNazionale,
  type SoggettoRicercaRecord,
  type SoggettoRicercaResult,
} from '../../lib/ricercaSoggetto'

type Props = {
  initialQuery?: string
  studioRecords: SoggettoRicercaRecord[]
  onClose: () => void
  onSelect: (result: SoggettoRicercaResult) => void
}

export default function RicercaSoggettiNazionaleDialog({
  initialQuery = '',
  studioRecords,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SoggettoRicercaResult[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setHint('Inserisci codice fiscale, partita IVA o denominazione.')
      return
    }
    setLoading(true)
    setHint(null)
    setSelectedIdx(null)
    try {
      const { results: found, viesError } = await searchSoggettiNazionale(q, studioRecords)
      setResults(found)
      if (found.length === 0) {
        setHint(
          viesError
            ? 'Nessun risultato nell\'archivio. Verifica la partita IVA o inserisci i dati manualmente.'
            : 'Nessun soggetto trovato. Prova con partita IVA (11 cifre), codice fiscale o denominazione.',
        )
      } else if (found.length === 1) {
        setSelectedIdx(0)
      }
    } finally {
      setLoading(false)
    }
  }, [query, studioRecords])

  const confirmSelection = useCallback(() => {
    if (selectedIdx == null || !results[selectedIdx]) {
      setHint('Seleziona una riga dalla tabella.')
      return
    }
    onSelect(results[selectedIdx])
    onClose()
  }, [selectedIdx, results, onSelect, onClose])

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--xl">
        <div className="clienti-dialog__titlebar">
          <span>Ricerca soggetti su elenco nazionale</span>
          <button type="button" className="clienti-icon-btn clienti-icon-btn--close" onClick={onClose} title="Chiudi">
            ✕
          </button>
        </div>
        <div className="clienti-dialog__body">
          <p className="clienti-dialog__hint">
            Cerca nell&apos;archivio dello studio o, per partita IVA italiana (11 cifre), verifica su registro VIES UE.
          </p>
          <div className="clienti-row">
            <div className="clienti-field" style={{ flex: 1 }}>
              <label className="clienti-field__label">Cod. Fiscale, Partita Iva o Denominazione del soggetto:</label>
              <input
                className="clienti-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSearch()
                }}
              />
            </div>
            <button type="button" className="clienti-dialog__btn" disabled={loading} onClick={() => void handleSearch()}>
              {loading ? 'Cerca…' : 'Cerca'}
            </button>
          </div>
          {hint ? <p className="clienti-dialog__hint clienti-dialog__hint--warn">{hint}</p> : null}
          <table className="clienti-grid clienti-grid--selectable" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Denominazione</th>
                <th>Indirizzo</th>
                <th>Cap</th>
                <th>Città</th>
                <th>Prov.</th>
                <th>Cod. Fiscale</th>
                <th>Partita Iva</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="clienti-empty">
                    {loading ? 'Ricerca in corso…' : 'Nessun risultato.'}
                  </td>
                </tr>
              ) : (
                results.map((r, i) => (
                  <tr
                    key={`${r.source}-${r.denominazione}-${r.piva}-${i}`}
                    className={selectedIdx === i ? 'clienti-grid__row--selected' : ''}
                    onClick={() => setSelectedIdx(i)}
                    onDoubleClick={() => {
                      onSelect(r)
                      onClose()
                    }}
                  >
                    <td>
                      {r.denominazione}
                      {r.source === 'vies' ? <span className="clienti-grid__badge"> VIES</span> : null}
                    </td>
                    <td>{r.indirizzo}</td>
                    <td>{r.cap}</td>
                    <td>{r.citta}</td>
                    <td>{r.prov}</td>
                    <td>{r.cf}</td>
                    <td>{r.piva}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn clienti-dialog__btn--primary" onClick={confirmSelection}>
            OK
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
