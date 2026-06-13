import { useState } from 'react'
import type { DocumentType } from '../../../../types'
import { WinButton, WinField, WinSelect } from '../WinControls'

const TIPI_COLLEGATI: { value: DocumentType; label: string }[] = [
  { value: 'fattura', label: 'Fattura' },
  { value: 'ddt', label: 'Doc. di trasporto' },
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'ordine_cliente', label: 'Ordine cliente' },
  { value: 'conferma_ordine', label: 'Conferma d\'ordine' },
]

type Props = {
  onGenerate: (type: DocumentType) => void
  onClose: () => void
}

export default function GeneraDocCollegatoDialog({ onGenerate, onClose }: Props) {
  const [tipo, setTipo] = useState<DocumentType>('fattura')

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>Genera documento collegato</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body">
          <WinField label="Tipo documento da generare" htmlFor="gen-doc-tipo">
            <WinSelect id="gen-doc-tipo" value={tipo} onChange={e => setTipo(e.target.value as DocumentType)}>
              {TIPI_COLLEGATI.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </WinSelect>
          </WinField>
          <p style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
            Verrà creato un nuovo documento con le righe e il cliente correnti, collegato alla vendita al banco.
          </p>
        </div>
        <div className="vb-dialog__footer">
          <WinButton onClick={() => onGenerate(tipo)}>Genera</WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
        </div>
      </div>
    </div>
  )
}
