import { useMemo, useRef } from 'react'
import { useStudioTables } from '../../../../contexts/StudioTablesContext'
import { newTableId } from '../../../../lib/studioTables'
import { WinField, WinIconBtn, WinSelect } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

export default function TabPagamento({ doc, protetto, onChange }: Props) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const { tables, saveTipiPagamento } = useStudioTables()
  const tipiPagamento = useMemo(() => {
    const names = tables.tipiPagamento.map(t => t.nome)
    // Mantiene visibile il valore già salvato nel documento anche se rimosso dalla tabella.
    if (doc.tipoPagamento && !names.includes(doc.tipoPagamento)) names.push(doc.tipoPagamento)
    return names
  }, [tables.tipiPagamento, doc.tipoPagamento])

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
    <div className="vb-tab-panel vb-tab-stack">
      <WinField label="Tipo pagamento" htmlFor="vb-tipo-pagamento">
        <div className="vb-row">
          <WinSelect
            ref={selectRef}
            id="vb-tipo-pagamento"
            className="vb-input--flex"
            value={doc.tipoPagamento}
            disabled={protetto}
            onChange={e => onChange({ tipoPagamento: e.target.value })}
          >
            <option value="">— Seleziona —</option>
            {tipiPagamento.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </WinSelect>
          <WinIconBtn title="Apri elenco pagamenti" disabled={protetto} onClick={() => selectRef.current?.focus()}>
            ▼
          </WinIconBtn>
          <WinIconBtn title="Aggiungi tipo pagamento" disabled={protetto} onClick={addTipoPagamento}>
            ⋯
          </WinIconBtn>
        </div>
      </WinField>
    </div>
  )
}
