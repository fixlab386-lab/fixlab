import { useCallback, useEffect, useState } from 'react'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import {
  addPriceListConfig,
  addWarehouse,
  deletePriceListConfig,
  deleteWarehouse,
  ensureDefaultAgents,
  ensureDefaultPriceLists,
  ensureDefaultWarehouses,
} from '../../../lib/firestore'
import type { Agent, PriceListConfig, Warehouse } from '../../../types'
import { agentNamesFromList } from '../../hooks/useAgentOptions'
import ElencoAgentiDialog from '../agenti/ElencoAgentiDialog'
import '../../theme/agenti.css'

type Tab = 'agenti' | 'magazzini' | 'listini'

export default function EnterpriseConfigSection() {
  const { studioId } = useActiveStudio()
  const [tab, setTab] = useState<Tab>('agenti')
  const [agents, setAgents] = useState<Agent[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [priceLists, setPriceLists] = useState<PriceListConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [showElencoAgenti, setShowElencoAgenti] = useState(false)

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const [a, w, p] = await Promise.all([
        ensureDefaultAgents(studioId),
        ensureDefaultWarehouses(studioId),
        ensureDefaultPriceLists(studioId),
      ])
      setAgents(a)
      setWarehouses(w)
      setPriceLists(p)
      setError(null)
    } catch {
      setError('Impossibile caricare la configurazione.')
    }
  }, [studioId])

  useEffect(() => {
    if (!studioId) {
      setLoading(false)
      return
    }
    setLoading(true)
    void refresh().finally(() => setLoading(false))
  }, [studioId, refresh])

  const handleAdd = async () => {
    if (!studioId || !newName.trim()) return
    try {
      if (tab === 'magazzini')
        await addWarehouse({ studioId, name: newName.trim(), code: newName.trim().slice(0, 8).toUpperCase() })
      if (tab === 'listini')
        await addPriceListConfig({
          studioId,
          name: newName.trim(),
          code: newName.trim().toLowerCase().replace(/\s+/g, '_'),
          sortOrder: priceLists.length + 1,
          vatIncluded: true,
        })
      setNewName('')
      await refresh()
    } catch {
      setError('Salvataggio non riuscito.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa voce?')) return
    try {
      if (tab === 'magazzini') await deleteWarehouse(id)
      if (tab === 'listini') await deletePriceListConfig(id)
      await refresh()
    } catch {
      setError('Eliminazione non riuscita.')
    }
  }

  if (!studioId) return null
  if (loading) return <p className="gestionale-settings__hint">Caricamento configurazione FIXLab…</p>

  const rows = tab === 'magazzini' ? warehouses : priceLists

  return (
    <section className="gestionale-settings__section">
      <h3 className="gestionale-settings__section-title">Configurazione FIXLab Enterprise</h3>
      {error ? <p className="gestionale-settings__error">{error}</p> : null}
      <div className="gestionale-magazzino-tabs" role="tablist" style={{ marginBottom: 12 }}>
        {(['agenti', 'magazzini', 'listini'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            className={`gestionale-magazzino-tabs__tab${tab === t ? ' gestionale-magazzino-tabs__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'agenti' ? 'Agenti' : t === 'magazzini' ? 'Magazzini' : 'Listini prezzi'}
          </button>
        ))}
      </div>

      {tab === 'agenti' ? (
        <div className="gestionale-settings__agenti-block">
          <p className="gestionale-settings__hint">
            Gli <strong>agenti</strong> sono i rappresentanti di vendita: su ogni fattura o ordine puoi indicare chi ha
            concluso la vendita e FixLab calcola automaticamente la <strong>provvigione</strong> (% sul totale imponibile)
            in base al listino cliente.
          </p>
          <p className="gestionale-settings__hint">
            Agenti attivi: {agentNamesFromList(agents).slice(1).join(', ') || 'nessuno'}
          </p>
          <button type="button" className="gestionale-tool-btn" onClick={() => setShowElencoAgenti(true)}>
            Apri elenco agenti…
          </button>
        </div>
      ) : (
        <>
          <ul className="gestionale-settings__list">
            {rows.map(row => (
              <li key={row.id} className="gestionale-settings__list-item">
                <span>{row.name}</span>
                {'code' in row && row.code ? <span className="gestionale-settings__muted"> ({row.code})</span> : null}
                {'isDefault' in row && row.isDefault ? <span className="gestionale-settings__muted"> — predefinito</span> : null}
                <button type="button" className="gestionale-link" onClick={() => void handleDelete(row.id)}>
                  Elimina
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="gestionale-form-field__input"
              placeholder="Nuovo nome…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button type="button" className="gestionale-tool-btn" onClick={() => void handleAdd()}>
              Aggiungi
            </button>
          </div>
        </>
      )}

      {showElencoAgenti ? (
        <ElencoAgentiDialog
          studioId={studioId}
          onClose={() => setShowElencoAgenti(false)}
          onChanged={() => void refresh()}
        />
      ) : null}
    </section>
  )
}
