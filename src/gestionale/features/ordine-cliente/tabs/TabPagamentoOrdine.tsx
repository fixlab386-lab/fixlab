import { useMemo, useRef } from 'react'
import { useStudioTables } from '../../../../contexts/StudioTablesContext'
import { newTableId } from '../../../../lib/studioTables'
import { WinButton, WinField, WinIconBtn, WinInput, WinSelect } from '../../vendita-banco/WinControls'
import type { DocumentoOrdineCliente } from '../types'
import { buildScadenzario } from '../../vendita-banco/utils'

type Props = {
  doc: DocumentoOrdineCliente
  onChange: (patch: Partial<DocumentoOrdineCliente>) => void
  /** Mostra l'anteprima dello scadenzario (true di default). Disattivato per gli ordini cliente. */
  showScadenzario?: boolean
}

export default function TabPagamentoOrdine({ doc, onChange, showScadenzario = true }: Props) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const { tables, saveTipiPagamento } = useStudioTables()
  const tipiPagamento = useMemo(() => {
    const names = tables.tipiPagamento.map(t => t.nome)
    if (doc.tipoPagamento && !names.includes(doc.tipoPagamento)) names.push(doc.tipoPagamento)
    return names
  }, [tables.tipiPagamento, doc.tipoPagamento])

  const scadenze = buildScadenzario(doc.tipoPagamento, doc.totaleDocumento, doc.data)

  const addTipoPagamento = () => {
    const label = window.prompt('Nuovo tipo di pagamento:')
    if (!label?.trim()) return
    const nome = label.trim()
    if (!tables.tipiPagamento.some(t => t.nome === nome)) {
      void saveTipiPagamento([...tables.tipiPagamento, { id: newTableId(), nome, scadenza: 'immediata' }])
    }
    onChange({ tipoPagamento: nome })
  }

  return (
    <div className="vb-tab-panel vb-tab-stack oc-pagamento">
      <WinField label="Tipo pagamento" htmlFor="oc-tipo-pagamento">
        <div className="vb-row">
          <WinSelect
            ref={selectRef}
            id="oc-tipo-pagamento"
            className="vb-input--flex"
            value={doc.tipoPagamento}
            onChange={e => onChange({ tipoPagamento: e.target.value })}
          >
            <option value="">— Seleziona —</option>
            {tipiPagamento.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </WinSelect>
          <WinIconBtn title="Apri elenco pagamenti" onClick={() => selectRef.current?.focus()}>
            ▼
          </WinIconBtn>
          <WinIconBtn title="Aggiungi tipo pagamento" onClick={addTipoPagamento}>
            ⋯
          </WinIconBtn>
        </div>
      </WinField>

      <WinField label="Coordinate bancarie" htmlFor="oc-coordinate">
        <div className="vb-row">
          <WinInput
            id="oc-coordinate"
            className="vb-input--flex"
            value={doc.coordinateBancarie || ''}
            onChange={e => onChange({ coordinateBancarie: e.target.value })}
            placeholder="Banca - IBAN"
          />
          <WinIconBtn title="Modifica coordinate bancarie" onClick={() => document.getElementById('oc-coordinate')?.focus()}>
            ✎
          </WinIconBtn>
        </div>
      </WinField>

      <WinField label="Acconto" htmlFor="oc-acconto">
        <div className="vb-row">
          <WinInput
            id="oc-acconto"
            type="number"
            min={0}
            step={0.01}
            className="oc-acconto-input"
            value={doc.acconto}
            onChange={e => onChange({ acconto: e.target.value })}
          />
          <WinIconBtn title="Calcola acconto">€</WinIconBtn>
          <WinButton onClick={() => alert('Generazione fattura acconto non ancora disponibile.')}>
            Fattura acconto…
          </WinButton>
        </div>
      </WinField>

      {showScadenzario && scadenze.length > 0 ? (
        <div className="vb-scadenzario">
          <p className="vb-section-title">Scadenzario (predisposto)</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th style={{ textAlign: 'right' }}>Importo</th>
                <th>Descrizione</th>
              </tr>
            </thead>
            <tbody>
              {scadenze.map((s, i) => (
                <tr key={i}>
                  <td>{s.data}</td>
                  <td style={{ textAlign: 'right' }}>€ {s.importo.toFixed(2)}</td>
                  <td>{s.descrizione}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
