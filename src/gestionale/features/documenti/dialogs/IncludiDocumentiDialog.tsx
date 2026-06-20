import { useEffect, useMemo, useState } from 'react'
import type { DocRecord } from '../../../../types'
import { WinButton } from '../../vendita-banco/WinControls'
import { formatDataIt } from '../../vendita-banco/utils'
import { documentTypeLabel } from '../utils'
import type { InclusionMode } from '../inclusionUtils'

export type IncludiDocumentiOptions = {
  copyPayment: boolean
  copyNotes: boolean
  copyShipping: boolean
  copyDestination: boolean
}

type Props = {
  documents: DocRecord[]
  loading: boolean
  title?: string
  subtitle?: string
  subjectLabel?: string
  onInclude: (doc: DocRecord, mode: InclusionMode, options: IncludiDocumentiOptions) => void
  onClose: () => void
}

function formatDocLabel(d: DocRecord): string {
  const tipo = documentTypeLabel(d.type)
  const dataIt = formatDataIt(d.date) || d.date
  return `${tipo} ${d.fullNumber} del ${dataIt}`
}

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

export default function IncludiDocumentiDialog({
  documents,
  loading,
  title = 'Includi Preventivi',
  subtitle = 'Selezionare i documenti da includere',
  subjectLabel = 'cliente',
  onInclude,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<InclusionMode>('dettagliata')
  const [copyPayment, setCopyPayment] = useState(true)
  const [copyNotes, setCopyNotes] = useState(true)
  const [copyShipping, setCopyShipping] = useState(false)
  const [copyDestination, setCopyDestination] = useState(true)

  useEffect(() => {
    if (documents.length > 0 && !selectedId) setSelectedId(documents[0].id)
  }, [documents, selectedId])

  const selected = documents.find(d => d.id === selectedId)
  const totalSelected = selected?.totalDocument ?? 0

  const summaryLabel = useMemo(() => {
    const count = documents.length
    return `${count} ${count === 1 ? 'voce' : 'voci'}`
  }, [documents.length])

  return (
    <div className="vb-dialog-overlay oc-includi-overlay" role="dialog" aria-modal="true" style={{ zIndex: 24000 }}>
      <div className="vb-dialog vb-dialog--includi">
        <div className="vb-dialog__titlebar">
          <span>{title}</span>
          <button type="button" className="vb-icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="vb-dialog__body vb-dialog__body--includi">
          <p className="vb-includi-subtitle">{subtitle}</p>

          {loading ? (
            <p>Caricamento documenti…</p>
          ) : documents.length === 0 ? (
            <p>Nessun documento includibile per questo {subjectLabel}.</p>
          ) : (
            <>
              <fieldset className="vb-includi-fieldset">
                <legend>Tipo inclusione</legend>
                <label className="vb-includi-radio">
                  <input type="radio" name="incl-mode" checked={mode === 'dettagliata'} onChange={() => setMode('dettagliata')} />
                  Dettagliata
                </label>
                <label className="vb-includi-radio">
                  <input type="radio" name="incl-mode" checked={mode === 'raggruppata'} onChange={() => setMode('raggruppata')} />
                  Raggruppata
                </label>
                <label className="vb-includi-radio">
                  <input type="radio" name="incl-mode" checked={mode === 'sintetica'} onChange={() => setMode('sintetica')} />
                  Sintetica
                </label>
              </fieldset>

              <fieldset className="vb-includi-fieldset">
                <legend>Copia da primo documento incluso</legend>
                <label className="vb-includi-check">
                  <input type="checkbox" checked={copyPayment} onChange={e => setCopyPayment(e.target.checked)} />
                  Pagamento
                </label>
                <label className="vb-includi-check">
                  <input type="checkbox" checked={copyNotes} onChange={e => setCopyNotes(e.target.checked)} />
                  Note
                </label>
                <label className="vb-includi-check">
                  <input type="checkbox" checked={copyShipping} onChange={e => setCopyShipping(e.target.checked)} />
                  Trasporto
                </label>
                <label className="vb-includi-check">
                  <input type="checkbox" checked={copyDestination} onChange={e => setCopyDestination(e.target.checked)} />
                  Destinazione
                </label>
              </fieldset>

              <div className="vb-includi-grid-wrap">
                <table className="vb-includi-grid">
                  <thead>
                    <tr>
                      <th />
                      <th>Documento</th>
                      <th>Tot. dovuto</th>
                      <th>Pagamento</th>
                      <th>Commento</th>
                      <th>Agente</th>
                      <th>Destinazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(d => {
                      const isSelected = selectedId === d.id
                      return (
                        <tr
                          key={d.id}
                          className={isSelected ? 'vb-includi-grid__row--selected' : undefined}
                          onClick={() => setSelectedId(d.id)}
                        >
                          <td>
                            <input type="radio" checked={isSelected} onChange={() => setSelectedId(d.id)} />
                          </td>
                          <td>{formatDocLabel(d)}</td>
                          <td className="vb-includi-grid__num">{formatEuro(d.totalDocument ?? 0)}</td>
                          <td>{d.paymentMethod || '—'}</td>
                          <td className="vb-includi-grid__comment">{d.internalNotes?.split('\n')[0] || '—'}</td>
                          <td>{d.agentName || '—'}</td>
                          <td>{d.deliveryAddress || d.deliveryCity || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="vb-includi-summary">
                <span>{summaryLabel}</span>
                {selected ? <span className="vb-includi-summary__total">{formatEuro(totalSelected)}</span> : null}
              </div>
            </>
          )}
        </div>

        <div className="vb-dialog__footer">
          <WinButton
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onInclude(selected, mode, { copyPayment, copyNotes, copyShipping, copyDestination })
              }
            }}
          >
            OK
          </WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
          <WinButton onClick={() => alert('Guida inclusione documenti.')}>?</WinButton>
        </div>
      </div>
    </div>
  )
}
