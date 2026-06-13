import { TIPI_PAGAMENTO_VENDITA_BANCO } from '../constants'
import { WinField, WinIconBtn, WinSelect } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'
import { buildScadenzario } from '../utils'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

export default function TabPagamento({ doc, protetto, onChange }: Props) {
  const scadenze = buildScadenzario(doc.tipoPagamento, doc.totaleDocumento, doc.data)

  return (
    <div className="vb-tab-panel vb-tab-stack">
      <WinField
        label="Tipo pagamento"
        htmlFor="vb-tipo-pagamento"
        action={<WinIconBtn title="Opzioni pagamento">▼</WinIconBtn>}
      >
        <div className="vb-row">
          <WinSelect
            id="vb-tipo-pagamento"
            className="vb-input--flex"
            value={doc.tipoPagamento}
            disabled={protetto}
            onChange={e => onChange({ tipoPagamento: e.target.value })}
          >
            <option value="">— Seleziona —</option>
            {TIPI_PAGAMENTO_VENDITA_BANCO.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </WinSelect>
          <WinIconBtn title="Gestione tipi pagamento">⋯</WinIconBtn>
        </div>
      </WinField>

      {scadenze.length > 0 ? (
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
