import { WinField, WinIconBtn, WinInput, WinTextarea } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

export default function TabNote({ doc, protetto, onChange }: Props) {
  const setLibero = (index: number, value: string) => {
    const campi = [...doc.campiLiberi] as DocumentoVenditaBanco['campiLiberi']
    campi[index] = value
    onChange({ campiLiberi: campi })
  }

  return (
    <div className="vb-tab-panel vb-tab-stack">
      <p className="vb-section-title">Campi aggiuntivi</p>
      {([0, 1, 2, 3] as const).map(i => (
        <WinField key={i} label={`Libero ${i + 1}`} htmlFor={`vb-libero-${i}`}>
          <div className="vb-row">
            <WinInput
              id={`vb-libero-${i}`}
              className="vb-input--flex"
              value={doc.campiLiberi[i]}
              disabled={protetto}
              onChange={e => setLibero(i, e.target.value)}
            />
            <WinIconBtn title="Valori predefiniti">▼</WinIconBtn>
          </div>
        </WinField>
      ))}

      <WinField label="Note a fine documento" htmlFor="vb-note-fine">
        <div className="vb-row" style={{ alignItems: 'flex-start' }}>
          <WinTextarea
            id="vb-note-fine"
            className="vb-input--flex"
            rows={6}
            value={doc.noteFine}
            disabled={protetto}
            onChange={e => onChange({ noteFine: e.target.value })}
          />
          <WinIconBtn title="Note predefinite">▼</WinIconBtn>
        </div>
      </WinField>
    </div>
  )
}
