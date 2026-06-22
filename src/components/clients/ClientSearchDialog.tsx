import { useCallback, useEffect, useState } from 'react'
import type { Client } from '../../types'
import {
  EMPTY_CLIENT_SEARCH_CRITERIA,
  filterClientsByCriteria,
  type ClientSearchCriteria,
} from '../../lib/clientSearch'
import { searchClientsByCriteria } from '../../lib/firestorePagination'
import { loadRecentClients } from '../../lib/loadStudioCatalog'
import { FormField } from '../ui'
import '../../theme/gestionale-dialog.css'
import '../../theme/client-search-dialog.css'

type Props = {
  /** Se presente, la ricerca avviene su Firestore (bounded) invece che in memoria. */
  studioId?: string
  /** Fallback legacy: elenco in memoria (solo archivi piccoli). */
  clients?: Client[]
  onSelect: (client: Client) => void
  onNoClient: () => void
  onNewClient: () => void
  onClose: () => void
  /** Nasconde «Nessun cliente» (es. ordine cliente). */
  requireClient?: boolean
  title?: string
}

export default function ClientSearchDialog({
  studioId,
  clients = [],
  onSelect,
  onNoClient,
  onNewClient,
  onClose,
  requireClient = false,
  title = 'Cerca cliente',
}: Props) {
  const [criteria, setCriteria] = useState<ClientSearchCriteria>(EMPTY_CLIENT_SEARCH_CRITERIA)
  const [results, setResults] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const patchCriteria = (patch: Partial<ClientSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...patch }))
  }

  const runSearch = useCallback(async () => {
    setSearching(true)
    setSearched(true)
    try {
      if (studioId) {
        const data = await searchClientsByCriteria(studioId, criteria, 40)
        setResults([...data].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })))
      } else {
        const filtered = filterClientsByCriteria(clients, criteria)
        setResults([...filtered].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })))
      }
    } finally {
      setSearching(false)
    }
  }, [studioId, criteria, clients])

  useEffect(() => {
    if (!studioId) {
      setResults(
        [...clients].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })),
      )
      return
    }
    let cancelled = false
    void loadRecentClients(studioId).then(data => {
      if (!cancelled) {
        setResults([...data].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })))
        setSearched(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [studioId, clients])

  const hasActiveCriteria = Object.values(criteria).some(v => v.trim())

  return (
    <div className="gestionale-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="client-search-title">
      <div className="gestionale-dialog-card gestionale-dialog-card--wide client-search-dialog">
        <div className="gestionale-dialog-card__header">
          <h2 id="client-search-title" className="gestionale-dialog-card__title">
            {title}
          </h2>
        </div>

        <div className="gestionale-dialog-card__body client-search-dialog__body">
          <div className="client-search-dialog__filters">
            <FormField label="Codice" htmlFor="client-search-code">
              <input
                id="client-search-code"
                className="gestionale-form-field__input"
                value={criteria.code}
                onChange={e => patchCriteria({ code: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && void runSearch()}
              />
            </FormField>
            <FormField label="Denominazione" htmlFor="client-search-name">
              <input
                id="client-search-name"
                className="gestionale-form-field__input"
                value={criteria.name}
                onChange={e => patchCriteria({ name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && void runSearch()}
              />
            </FormField>
            <FormField label="Codice fiscale" htmlFor="client-search-cf">
              <input
                id="client-search-cf"
                className="gestionale-form-field__input"
                value={criteria.fiscalCode}
                onChange={e => patchCriteria({ fiscalCode: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && void runSearch()}
              />
            </FormField>
            <FormField label="P.IVA" htmlFor="client-search-vat">
              <input
                id="client-search-vat"
                className="gestionale-form-field__input"
                value={criteria.vatNumber}
                onChange={e => patchCriteria({ vatNumber: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && void runSearch()}
              />
            </FormField>
            <button
              type="button"
              className="gestionale-dialog-btn gestionale-dialog-btn--primary client-search-dialog__search-btn"
              onClick={() => void runSearch()}
              disabled={searching}
            >
              {searching ? 'Ricerca…' : 'Cerca'}
            </button>
          </div>

          <p className="client-search-dialog__hint">
            {searching
              ? 'Ricerca in corso…'
              : hasActiveCriteria && searched
                ? `${results.length} cliente/i trovati.`
                : `${results.length} cliente/i — compila i filtri e clicca Cerca.`}
          </p>

          <div className="client-search-dialog__table-wrap">
            <table className="client-search-dialog__table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Denominazione</th>
                  <th>Città</th>
                  <th>Prov.</th>
                  <th>CF</th>
                  <th>P.IVA</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="client-search-dialog__empty">
                      Nessun cliente corrisponde ai criteri di ricerca.
                    </td>
                  </tr>
                ) : (
                  results.map(client => (
                    <tr
                      key={client.id}
                      className="client-search-dialog__row"
                      onClick={() => onSelect(client)}
                    >
                      <td>{client.code || '—'}</td>
                      <td>{client.name}</td>
                      <td>{client.city || '—'}</td>
                      <td>{client.province || '—'}</td>
                      <td>{client.fiscalCode || '—'}</td>
                      <td>{client.vatNumber || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gestionale-dialog-card__footer client-search-dialog__footer">
          {!requireClient ? (
            <button type="button" className="gestionale-dialog-btn" onClick={onNoClient}>
              Nessun cliente
            </button>
          ) : null}
          <button type="button" className="gestionale-dialog-btn" onClick={onNewClient}>
            + Nuovo cliente
          </button>
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
