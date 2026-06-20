import { useCallback, useEffect, useState } from 'react'
import { saveNoteElencoVoci, type NoteElencoVoce } from '../../../../lib/userPrefs'
import { NOTE_CAMPO_LABELS, type NoteCampoKey } from '../noteElenco'
import { WinButton, WinInput } from '../WinControls'

type Props = {
  campoKey: NoteCampoKey
  initialVoci: NoteElencoVoce[]
  onClose: () => void
  onSaved: () => void
}

function cloneVoci(voci: NoteElencoVoce[]): NoteElencoVoce[] {
  return voci.map(v => ({ ...v }))
}

export default function ElencoNoteDialog({ campoKey, initialVoci, onClose, onSaved }: Props) {
  const [voci, setVoci] = useState<NoteElencoVoce[]>(() => cloneVoci(initialVoci))
  const [selectedId, setSelectedId] = useState<string | null>(initialVoci[0]?.id ?? null)
  const [draft, setDraft] = useState<NoteElencoVoce[]>(() => cloneVoci(initialVoci))

  useEffect(() => {
    setVoci(cloneVoci(initialVoci))
    setDraft(cloneVoci(initialVoci))
    setSelectedId(initialVoci[0]?.id ?? null)
  }, [initialVoci, campoKey])

  const title = NOTE_CAMPO_LABELS[campoKey]

  const patchVoci = useCallback((updater: (prev: NoteElencoVoce[]) => NoteElencoVoce[]) => {
    setVoci(prev => updater(prev))
  }, [])

  const handleNuovo = () => {
    const voce: NoteElencoVoce = {
      id: crypto.randomUUID(),
      text: '',
      predefinita: voci.length === 0,
    }
    patchVoci(prev => [...prev, voce])
    setSelectedId(voce.id)
  }

  const handleElimina = () => {
    if (!selectedId) return
    patchVoci(prev => {
      const next = prev.filter(v => v.id !== selectedId)
      if (next.length && !next.some(v => v.predefinita)) next[0].predefinita = true
      setSelectedId(next[0]?.id ?? null)
      return next
    })
  }

  const handleAnnulla = () => {
    setVoci(cloneVoci(draft))
    setSelectedId(draft[0]?.id ?? null)
  }

  const handleChiudi = () => {
    const cleaned = voci.map(v => ({ ...v, text: v.text.trim() })).filter(v => v.text)
    if (cleaned.length && !cleaned.some(v => v.predefinita)) cleaned[0].predefinita = true
    saveNoteElencoVoci(campoKey, cleaned)
    onSaved()
    onClose()
  }

  const setPredefinita = (id: string) => {
    patchVoci(prev => prev.map(v => ({ ...v, predefinita: v.id === id })))
  }

  const patchText = (id: string, text: string) => {
    patchVoci(prev => prev.map(v => (v.id === id ? { ...v, text } : v)))
  }

  return (
    <div
      className="vb-dialog-overlay vb-elenco-note-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="elenco-note-title"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="vb-dialog vb-dialog--elenco-note">
        <div className="vb-dialog__titlebar vb-elenco-note__titlebar">
          <div>
            <div id="elenco-note-title" className="vb-elenco-note__title">
              Elenco {title}
            </div>
            <div className="vb-elenco-note__subtitle">Modifica elenco voci</div>
          </div>
          <span className="vb-elenco-note__icon" aria-hidden="true">
            📝
          </span>
        </div>

        <div className="vb-elenco-note__body">
          <table className="vb-elenco-note__grid">
            <thead>
              <tr>
                <th>Voci</th>
                <th className="vb-elenco-note__col-predef">Predef.</th>
              </tr>
            </thead>
            <tbody>
              {voci.length === 0 ? (
                <tr>
                  <td colSpan={2} className="vb-elenco-note__empty">
                    (Non vi sono dati da visualizzare)
                  </td>
                </tr>
              ) : (
                voci.map(voce => (
                  <tr
                    key={voce.id}
                    className={selectedId === voce.id ? 'vb-elenco-note__row--selected' : undefined}
                    onClick={() => setSelectedId(voce.id)}
                  >
                    <td>
                      <WinInput
                        className="vb-input--flat"
                        value={voce.text}
                        onChange={e => patchText(voce.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="vb-elenco-note__col-predef">
                      <input
                        type="radio"
                        name={`predef-${campoKey}`}
                        checked={voce.predefinita}
                        onChange={() => setPredefinita(voce.id)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Predefinita ${voce.text || 'voce'}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="vb-elenco-note__footer">
          <WinButton onClick={handleNuovo}>Nuovo</WinButton>
          <WinButton disabled={!selectedId} onClick={handleElimina}>
            Elimina
          </WinButton>
          <WinButton onClick={handleAnnulla}>Annulla</WinButton>
          <WinButton title="Aiuto" onClick={() => window.alert('Aggiungi voci predefinite da inserire rapidamente nel campo. Segna una voce come predefinita per evidenziarla nell\'elenco.')}>
            ?
          </WinButton>
          <div className="vb-elenco-note__footer-spacer" />
          <WinButton onClick={handleChiudi}>Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
