import { useEffect, useState } from 'react'
import FormField from '../../ui/FormField'
import { loadCapDataset, searchCapRecords, type CapRecord } from '../../../lib/capLookup'
import '../../../theme/gestionale-dialog.css'

type CapLookupPopupProps = {
  initialCap?: string
  initialCitta?: string
  initialProvincia?: string
  onClose: () => void
  onApply: (record: CapRecord) => void
}

export default function CapLookupPopup({
  initialCap = '',
  initialCitta = '',
  initialProvincia = '',
  onClose,
  onApply,
}: CapLookupPopupProps) {
  const [cap, setCap] = useState(initialCap)
  const [citta, setCitta] = useState(initialCitta)
  const [provincia, setProvincia] = useState(initialProvincia)
  const [results, setResults] = useState<CapRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void loadCapDataset()
  }, [])

  useEffect(() => {
    if (!cap && !citta && !provincia) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      void searchCapRecords({ cap, citta, provincia, limit: 80 }).then(rows => {
        if (!cancelled) {
          setResults(rows)
          setLoading(false)
        }
      })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [cap, citta, provincia])

  return (
    <div className="gestionale-dialog-overlay gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gestionale-dialog-card gestionale-dialog-card--wide" role="dialog" aria-labelledby="cap-popup-title">
        <header className="gestionale-dialog-card__header">
          <h2 id="cap-popup-title" className="gestionale-dialog-card__title">
            Ricerca CAP / Città / Provincia
          </h2>
        </header>
        <div className="gestionale-dialog-card__body">
          <div className="gestionale-dialog-form-stack">
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 70px', gap: 8 }}>
              <FormField label="CAP" htmlFor="cap-search" labelWidth={60}>
                <input
                  id="cap-search"
                  className="gestionale-form-field__input"
                  value={cap}
                  maxLength={5}
                  onChange={e => setCap(e.target.value.replace(/\D/g, '').slice(0, 5))}
                />
              </FormField>
              <FormField label="Città" htmlFor="citta-search" labelWidth={60}>
                <input
                  id="citta-search"
                  className="gestionale-form-field__input"
                  value={citta}
                  onChange={e => setCitta(e.target.value)}
                />
              </FormField>
              <FormField label="Prov." htmlFor="prov-search" labelWidth={50}>
                <input
                  id="prov-search"
                  className="gestionale-form-field__input"
                  value={provincia}
                  maxLength={2}
                  onChange={e => setProvincia(e.target.value.toUpperCase())}
                />
              </FormField>
            </div>

            {loading ? <span className="gestionale-dialog-hint">Ricerca…</span> : null}
            {!loading && results.length === 0 && (cap || citta || provincia) ? (
              <span className="gestionale-dialog-hint">Nessun risultato.</span>
            ) : null}

            {results.length > 0 ? (
              <div className="gestionale-dialog-results">
                {results.map(row => (
                  <button
                    key={`${row.cap}-${row.citta}-${row.provincia}`}
                    type="button"
                    className="gestionale-dialog-results__item"
                    onClick={() => {
                      onApply(row)
                      onClose()
                    }}
                  >
                    {row.cap} — {row.citta} ({row.provincia})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
