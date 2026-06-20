import { useCallback, useMemo, useState } from 'react'
import { getNoteElencoPresetLabels, getNoteElencoVoci } from '../../../../lib/userPrefs'
import ElencoNoteDialog from '../dialogs/ElencoNoteDialog'
import {
  NOTE_CAMPO_LABELS,
  NOTE_ELENCO_DEFAULTS,
  noteCampoKeyFromIndex,
  type NoteCampoKey,
} from '../noteElenco'
import WinDropdownMenu from '../WinDropdownMenu'
import { WinField, WinInput, WinTextarea } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

function noteDropdownItems(
  campoKey: NoteCampoKey,
  onPick: (text: string) => void,
  onPersonalizza: () => void,
) {
  const presets = getNoteElencoPresetLabels(campoKey, NOTE_ELENCO_DEFAULTS[campoKey])
  return [
    ...presets.map(text => ({
      id: `${campoKey}-${text}`,
      label: text,
      onClick: () => onPick(text),
    })),
    ...(presets.length ? [{ id: `${campoKey}-sep`, separator: true as const }] : []),
    {
      id: `${campoKey}-personalizza`,
      label: 'Personalizza…',
      onClick: onPersonalizza,
    },
  ]
}

export default function TabNote({ doc, protetto, onChange }: Props) {
  const [prefsVersion, setPrefsVersion] = useState(0)
  const [elencoCampo, setElencoCampo] = useState<NoteCampoKey | null>(null)

  const refreshPrefs = useCallback(() => setPrefsVersion(v => v + 1), [])

  const setLibero = (index: number, value: string) => {
    const campi = [...doc.campiLiberi] as DocumentoVenditaBanco['campiLiberi']
    campi[index] = value
    onChange({ campiLiberi: campi })
  }

  const elencoInitialVoci = useMemo(() => {
    if (!elencoCampo) return []
    return getNoteElencoVoci(elencoCampo, NOTE_ELENCO_DEFAULTS[elencoCampo])
  }, [elencoCampo, prefsVersion])

  const openPersonalizza = (campoKey: NoteCampoKey) => {
    setElencoCampo(campoKey)
  }

  return (
    <div className="vb-tab-panel vb-tab-stack vb-tab-note">
      <p className="vb-section-title">Campi aggiuntivi</p>
      {([0, 1, 2, 3] as const).map(i => {
        const campoKey = noteCampoKeyFromIndex(i)
        const label = NOTE_CAMPO_LABELS[campoKey]
        return (
          <WinField key={campoKey} label={label} htmlFor={`vb-libero-${i}`}>
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
                items={noteDropdownItems(campoKey, text => setLibero(i, text), () => openPersonalizza(campoKey))}
              />
            </div>
          </WinField>
        )
      })}

      <WinField label={NOTE_CAMPO_LABELS.noteFine} htmlFor="vb-note-fine">
        <div className="vb-row vb-row--top">
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
            items={noteDropdownItems('noteFine', text => onChange({ noteFine: text }), () => openPersonalizza('noteFine'))}
          />
        </div>
      </WinField>

      {elencoCampo ? (
        <ElencoNoteDialog
          campoKey={elencoCampo}
          initialVoci={elencoInitialVoci}
          onClose={() => setElencoCampo(null)}
          onSaved={refreshPrefs}
        />
      ) : null}
    </div>
  )
}
