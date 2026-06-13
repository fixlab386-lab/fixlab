import { useMemo, useState } from 'react'
import { getCustomNoteDocumento, addCustomNotaDocumento } from '../../../../lib/userPrefs'
import WinDropdownMenu from '../WinDropdownMenu'
import { WinField, WinInput, WinTextarea } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

export default function TabNote({ doc, protetto, onChange }: Props) {
  const [prefsVersion, setPrefsVersion] = useState(0)
  const notePresets = useMemo(
    () => [...getCustomNoteDocumento(), 'Personalizza…'],
    [prefsVersion],
  )
  void prefsVersion

  const setLibero = (index: number, value: string) => {
    const campi = [...doc.campiLiberi] as DocumentoVenditaBanco['campiLiberi']
    campi[index] = value
    onChange({ campiLiberi: campi })
  }

  const pickPreset = (target: 'libero' | 'fine', index?: number) => (label: string) => {
    if (label === 'Personalizza…') {
      const text = window.prompt('Testo predefinito:')
      if (!text?.trim()) return
      addCustomNotaDocumento(text)
      setPrefsVersion(v => v + 1)
      if (target === 'fine') onChange({ noteFine: text.trim() })
      else if (index !== undefined) setLibero(index, text.trim())
      return
    }
    if (target === 'fine') onChange({ noteFine: label })
    else if (index !== undefined) setLibero(index, label)
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
            <WinDropdownMenu
              disabled={protetto}
              label="▼"
              items={notePresets.map(label => ({
                id: `${i}-${label}`,
                label,
                onClick: () => pickPreset('libero', i)(label),
              }))}
            />
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
          <WinDropdownMenu
            disabled={protetto}
            label="▼"
            items={notePresets.map(label => ({
              id: `fine-${label}`,
              label,
              onClick: () => pickPreset('fine')(label),
            }))}
          />
        </div>
      </WinField>
    </div>
  )
}
