import { useEffect, useState } from 'react'
import type { DocRecord } from '../../../../types'
import { WinButton } from '../WinControls'

type Props = {
  documents: DocRecord[]
  loading: boolean
  onSelect: (doc: DocRecord) => void
  onClose: () => void
}

export default function IncludiDocumentiDialog({ documents, loading, onSelect, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (documents.length > 0 && !selectedId) setSelectedId(documents[0].id)
  }, [documents, selectedId])

  const selected = documents.find(d => d.id === selectedId)

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--lg">
        <div className="vb-dialog__titlebar">
          <span>Includi doc. — documenti dello stesso cliente</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body">
          {loading ? (
            <p>Caricamento documenti…</p>
          ) : documents.length === 0 ? (
            <p>Nessun documento includibile per questo cliente.</p>
          ) : (
            <div className="vb-scadenzario">
              <table>
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
                      <td>{d.type}</td>
                      <td>{d.fullNumber}</td>
                      <td>{d.date}</td>
                      <td style={{ textAlign: 'right' }}>€ {(d.totalDocument ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="vb-dialog__footer">
          <WinButton
            disabled={!selected}
            onClick={() => {
              if (selected) onSelect(selected)
            }}
          >
            Includi selezionato
          </WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
        </div>
      </div>
    </div>
  )
}
