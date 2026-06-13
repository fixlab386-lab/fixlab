import { useEffect, useState } from 'react'
import type { DocRecord } from '../../../../types'
import { documentTypeLabel } from '../utils'
import type { InclusionMode } from '../inclusionUtils'

type Props = {
  documents: DocRecord[]
  loading: boolean
  subjectLabel?: string
  onInclude: (doc: DocRecord, mode: InclusionMode, options: { copyPayment: boolean; copyNotes: boolean; copyShipping: boolean }) => void
  onClose: () => void
}

export default function IncludiDocumentiDialog({
  documents,
  loading,
  subjectLabel = 'cliente',
  onInclude,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<InclusionMode>('dettagliata')
  const [copyPayment, setCopyPayment] = useState(false)
  const [copyNotes, setCopyNotes] = useState(false)
  const [copyShipping, setCopyShipping] = useState(false)

  useEffect(() => {
    if (documents.length > 0 && !selectedId) setSelectedId(documents[0].id)
  }, [documents, selectedId])

  const selected = documents.find(d => d.id === selectedId)

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--wide">
        <div className="clienti-dialog__titlebar">
          Includi doc. — documenti dello stesso {subjectLabel}
        </div>
        <div className="clienti-dialog__body">
          {loading ? (
            <p>Caricamento documenti…</p>
          ) : documents.length === 0 ? (
            <p>Nessun documento includibile per questo {subjectLabel}.</p>
          ) : (
            <>
              <div className="clienti-field" style={{ marginBottom: 8 }}>
                <label className="clienti-field__label">Modalità inclusione</label>
                <select className="clienti-input" value={mode} onChange={e => setMode(e.target.value as InclusionMode)}>
                  <option value="dettagliata">Dettagliata</option>
                  <option value="raggruppata">Raggruppata</option>
                  <option value="sintetica">Sintetica</option>
                </select>
              </div>
              <label className="clienti-check">
                <input type="checkbox" checked={copyPayment} onChange={e => setCopyPayment(e.target.checked)} />
                Riporta pagamento
              </label>
              <label className="clienti-check">
                <input type="checkbox" checked={copyNotes} onChange={e => setCopyNotes(e.target.checked)} />
                Riporta note
              </label>
              <label className="clienti-check">
                <input type="checkbox" checked={copyShipping} onChange={e => setCopyShipping(e.target.checked)} />
                Riporta info trasporto
              </label>
              <table className="clienti-grid" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th />
                    <th>Tipo</th>
                    <th>Numero</th>
                    <th>Data</th>
                    <th style={{ textAlign: 'right' }}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} onClick={() => setSelectedId(d.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <input type="radio" checked={selectedId === d.id} onChange={() => setSelectedId(d.id)} />
                      </td>
                      <td>{documentTypeLabel(d.type)}</td>
                      <td>{d.fullNumber}</td>
                      <td>{d.date}</td>
                      <td style={{ textAlign: 'right' }}>€ {(d.totalDocument ?? 0).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="clienti-dialog__footer">
          <button
            type="button"
            className="clienti-dialog__btn"
            disabled={!selected}
            onClick={() => {
              if (selected) onInclude(selected, mode, { copyPayment, copyNotes, copyShipping })
            }}
          >
            Includi selezionato
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
