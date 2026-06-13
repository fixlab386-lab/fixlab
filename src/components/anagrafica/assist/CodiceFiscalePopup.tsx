import { useEffect, useState } from 'react'
import FormField from '../../ui/FormField'
import {
  calcolaCodiceFiscale,
  formatComuneLabel,
  loadComuniDataset,
  searchComuni,
  type ComuneRecord,
} from '../../../lib/codiceFiscale'
import '../../../theme/gestionale-dialog.css'

type CodiceFiscalePopupProps = {
  onClose: () => void
  onApply: (cf: string) => void
}

export default function CodiceFiscalePopup({ onClose, onApply }: CodiceFiscalePopupProps) {
  const [cognome, setCognome] = useState('')
  const [nome, setNome] = useState('')
  const [sesso, setSesso] = useState<'M' | 'F'>('M')
  const [dataNascita, setDataNascita] = useState('')
  const [comuneQuery, setComuneQuery] = useState('')
  const [comuneSelected, setComuneSelected] = useState<ComuneRecord | null>(null)
  const [comuneResults, setComuneResults] = useState<ComuneRecord[]>([])
  const [loadingComuni, setLoadingComuni] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadComuniDataset()
  }, [])

  useEffect(() => {
    if (!comuneQuery.trim() || comuneSelected?.n === comuneQuery) {
      setComuneResults([])
      return
    }
    let cancelled = false
    setLoadingComuni(true)
    const timer = setTimeout(() => {
      void searchComuni(comuneQuery, 30).then(results => {
        if (!cancelled) {
          setComuneResults(results)
          setLoadingComuni(false)
        }
      })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [comuneQuery, comuneSelected])

  const handleOk = () => {
    setError('')
    if (!cognome.trim() || !nome.trim()) {
      setError('Inserisci cognome e nome.')
      return
    }
    if (!dataNascita) {
      setError('Inserisci la data di nascita.')
      return
    }
    if (!comuneSelected) {
      setError('Seleziona il comune o lo stato estero di nascita.')
      return
    }
    const date = new Date(dataNascita)
    if (Number.isNaN(date.getTime())) {
      setError('Data di nascita non valida.')
      return
    }
    const cf = calcolaCodiceFiscale({
      cognome,
      nome,
      sesso,
      dataNascita: date,
      codiceCatastale: comuneSelected.c,
    })
    onApply(cf)
    onClose()
  }

  return (
    <div className="gestionale-dialog-overlay gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gestionale-dialog-card gestionale-dialog-card--wide" role="dialog" aria-labelledby="cf-popup-title">
        <header className="gestionale-dialog-card__header">
          <h2 id="cf-popup-title" className="gestionale-dialog-card__title">
            Calcola codice fiscale
          </h2>
        </header>
        <div className="gestionale-dialog-card__body">
          <div className="gestionale-dialog-form-stack">
            {error ? <div className="gestionale-dialog-error-banner">{error}</div> : null}
            <FormField label="Cognome" htmlFor="cf-cognome" required>
              <input
                id="cf-cognome"
                className="gestionale-form-field__input"
                value={cognome}
                onChange={e => setCognome(e.target.value)}
              />
            </FormField>
            <FormField label="Nome" htmlFor="cf-nome" required>
              <input
                id="cf-nome"
                className="gestionale-form-field__input"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </FormField>
            <FormField label="Sesso" htmlFor="cf-sesso">
              <select
                id="cf-sesso"
                className="gestionale-form-field__input"
                value={sesso}
                onChange={e => setSesso(e.target.value as 'M' | 'F')}
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </FormField>
            <FormField label="Data nascita" htmlFor="cf-data" required>
              <input
                id="cf-data"
                type="date"
                className="gestionale-form-field__input"
                value={dataNascita}
                onChange={e => setDataNascita(e.target.value)}
              />
            </FormField>
            <FormField label="Comune / Stato" htmlFor="cf-comune" required>
              <input
                id="cf-comune"
                className="gestionale-form-field__input"
                value={comuneQuery}
                placeholder="Cerca comune o stato estero…"
                onChange={e => {
                  setComuneQuery(e.target.value)
                  setComuneSelected(null)
                }}
              />
              {comuneResults.length > 0 ? (
                <div className="gestionale-dialog-comune-list" role="listbox">
                  {comuneResults.map(item => (
                    <button
                      key={`${item.c}-${item.n}`}
                      type="button"
                      className="gestionale-dialog-comune-list__item"
                      onClick={() => {
                        setComuneSelected(item)
                        setComuneQuery(formatComuneLabel(item))
                        setComuneResults([])
                      }}
                    >
                      {formatComuneLabel(item)}
                    </button>
                  ))}
                </div>
              ) : loadingComuni && comuneQuery ? (
                <span className="gestionale-dialog-hint" style={{ marginTop: 4, display: 'block' }}>
                  Ricerca…
                </span>
              ) : null}
            </FormField>
          </div>
        </div>
        <footer className="gestionale-dialog-card__footer">
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="gestionale-dialog-btn gestionale-dialog-btn--primary" onClick={handleOk}>
            OK
          </button>
        </footer>
      </div>
    </div>
  )
}
