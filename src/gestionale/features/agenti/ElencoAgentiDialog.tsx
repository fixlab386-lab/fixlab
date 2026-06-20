import { useCallback, useEffect, useMemo, useState } from 'react'
import { addAgent, deleteAgent, ensureDefaultAgents, updateAgent } from '../../../lib/firestore'
import type { Agent } from '../../../types'
import { WinButton, WinField, WinInput, WinTextarea } from '../vendita-banco/WinControls'
import {
  emptyCommissionMatrix,
  normalizeCommissionMatrix,
  PROVVIGIONE_CLASSI,
  PROVVIGIONE_LISTINI,
} from './agentCommissions'
import '../../theme/agenti.css'
import '../../theme/vendita-al-banco.css'

type Props = {
  studioId: string
  onClose: () => void
  onChanged?: () => void
}

type DraftAgent = {
  name: string
  notes: string
  hidden: boolean
  matrix: Record<string, Record<string, number>>
}

function agentToDraft(agent: Agent): DraftAgent {
  return {
    name: agent.name,
    notes: agent.notes ?? '',
    hidden: agent.isActive === false,
    matrix: normalizeCommissionMatrix(agent.commissionMatrix, agent.commissionPercent ?? 0),
  }
}

function emptyDraft(): DraftAgent {
  return { name: '', notes: '', hidden: false, matrix: emptyCommissionMatrix(0) }
}

export default function ElencoAgentiDialog({ studioId, onClose, onChanged }: Props) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftAgent>(emptyDraft())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibleAgents = useMemo(() => agents.filter(a => a.isActive !== false), [agents])
  const allListItems = useMemo(() => agents, [agents])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await ensureDefaultAgents(studioId)
      setAgents(list)
      setError(null)
      return list
    } catch {
      setError('Impossibile caricare gli agenti.')
      return []
    } finally {
      setLoading(false)
    }
  }, [studioId])

  useEffect(() => {
    void load().then(list => {
      const first = list[0]
      if (first) {
        setSelectedId(first.id)
        setDraft(agentToDraft(first))
      }
    })
  }, [load])

  const selectAgent = (agent: Agent) => {
    setSelectedId(agent.id)
    setDraft(agentToDraft(agent))
    setError(null)
  }

  const patchMatrix = (classeId: string, listinoId: string, value: string) => {
    const n = Math.max(0, Math.min(100, parseFloat(value.replace(',', '.')) || 0))
    setDraft(prev => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [classeId]: { ...prev.matrix[classeId], [listinoId]: n },
      },
    }))
  }

  const handleNuovo = async () => {
    setSaving(true)
    setError(null)
    try {
      await addAgent({
        studioId,
        name: `Nuovo agente ${agents.length + 1}`,
        isActive: true,
        commissionPercent: 0,
        commissionMatrix: emptyCommissionMatrix(0),
      })
      const list = await load()
      const created = list[list.length - 1]
      if (created) selectAgent(created)
      onChanged?.()
    } catch {
      setError('Creazione agente non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleElimina = async () => {
    if (!selectedId) return
    const agent = agents.find(a => a.id === selectedId)
    if (!agent) return
    if (!confirm(`Eliminare l'agente "${agent.name}"?`)) return
    setSaving(true)
    try {
      await deleteAgent(selectedId)
      const list = await load()
      const next = list[0]
      if (next) {
        selectAgent(next)
      } else {
        setSelectedId(null)
        setDraft(emptyDraft())
      }
      onChanged?.()
    } catch {
      setError('Eliminazione non riuscita.')
    } finally {
      setSaving(false)
    }
  }

  const handleSalva = async () => {
    if (!selectedId) return
    const name = draft.name.trim()
    if (!name) {
      setError('Inserisci il nome agente.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const flat = draft.matrix.principale?.privati ?? 0
      await updateAgent(selectedId, {
        name,
        notes: draft.notes.trim() || undefined,
        isActive: !draft.hidden,
        commissionPercent: flat,
        commissionMatrix: draft.matrix,
      })
      const list = await load()
      const updated = list.find(a => a.id === selectedId)
      if (updated) selectAgent(updated)
      onChanged?.()
    } catch {
      setError('Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="vb-dialog-overlay agenti-elenco-overlay" role="dialog" aria-modal="true" aria-labelledby="elenco-agenti-title">
      <div className="vb-dialog agenti-elenco">
        <div className="vb-dialog__titlebar agenti-elenco__titlebar">
          <span id="elenco-agenti-title">Elenco agenti</span>
          <button type="button" className="vb-icon-btn" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="agenti-elenco__body">
          {error ? <div className="agenti-elenco__error">{error}</div> : null}

          <div className="agenti-elenco__layout">
            <aside className="agenti-elenco__list-panel">
              <div className="agenti-elenco__list-title">Agenti</div>
              {loading ? (
                <p className="agenti-elenco__loading">Caricamento…</p>
              ) : (
                <ul className="agenti-elenco__list" role="listbox">
                  {allListItems.map(agent => (
                    <li key={agent.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedId === agent.id}
                        className={`agenti-elenco__list-item${selectedId === agent.id ? ' agenti-elenco__list-item--active' : ''}${agent.isActive === false ? ' agenti-elenco__list-item--hidden' : ''}`}
                        onClick={() => selectAgent(agent)}
                      >
                        {agent.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="agenti-elenco__list-hint">{visibleAgents.length} attivi</p>
            </aside>

            <div className="agenti-elenco__detail">
              {selectedId ? (
                <>
                  <WinField label="Agente" htmlFor="agente-nome">
                    <WinInput
                      id="agente-nome"
                      value={draft.name}
                      onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    />
                  </WinField>

                  <label className="vb-check-label agenti-elenco__hide">
                    <input
                      type="checkbox"
                      checked={draft.hidden}
                      onChange={e => setDraft(d => ({ ...d, hidden: e.target.checked }))}
                    />
                    Nascondi (non compare nei documenti)
                  </label>

                  <WinField label="Note" htmlFor="agente-note">
                    <WinTextarea
                      id="agente-note"
                      rows={3}
                      value={draft.notes}
                      onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                    />
                  </WinField>

                  <div className="agenti-elenco__prov-section">
                    <div className="agenti-elenco__prov-title">Provvigioni (% sul totale imponibile)</div>
                    <p className="agenti-elenco__prov-hint">
                      Imposta la percentuale per listino cliente. Su ogni fattura/ordine, FixLab calcola la provvigione
                      dovuta all&apos;agente selezionato.
                    </p>
                    <table className="agenti-elenco__matrix">
                      <thead>
                        <tr>
                          <th>Classe provvigione</th>
                          {PROVVIGIONE_LISTINI.map(col => (
                            <th key={col.id}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PROVVIGIONE_CLASSI.map(classe => (
                          <tr key={classe.id}>
                            <th>{classe.label}</th>
                            {PROVVIGIONE_LISTINI.map(col => (
                              <td key={col.id}>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  className="vb-input agenti-elenco__pct"
                                  value={draft.matrix[classe.id]?.[col.id] ?? 0}
                                  onChange={e => patchMatrix(classe.id, col.id, e.target.value)}
                                />
                                <span className="agenti-elenco__pct-suffix">%</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="agenti-elenco__empty">Nessun agente. Clicca Nuovo per crearne uno.</p>
              )}
            </div>
          </div>
        </div>

        <div className="vb-dialog__footer agenti-elenco__footer">
          <WinButton onClick={() => void handleNuovo()} disabled={saving}>
            Nuovo
          </WinButton>
          <WinButton onClick={() => void handleElimina()} disabled={saving || !selectedId}>
            Elimina
          </WinButton>
          <div className="agenti-elenco__footer-spacer" />
          <WinButton onClick={() => void handleSalva()} disabled={saving || !selectedId}>
            {saving ? 'Salvataggio…' : 'Salva'}
          </WinButton>
          <WinButton onClick={onClose}>Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
