import { useMemo, useState } from 'react'
import type { Client } from '../../types'
import {
  EMPTY_CLIENT_SEARCH_CRITERIA,
  filterClientsByCriteria,
  type ClientSearchCriteria,
} from '../../lib/clientSearch'
import { FormField } from '../ui'
import '../../theme/gestionale-dialog.css'
import '../../theme/client-search-dialog.css'

type Props = {
  clients: Client[]
  onSelect: (client: Client) => void
  onNoClient: () => void
  onNewClient: () => void
  onClose: () => void
}

export default function ClientSearchDialog({ clients, onSelect, onNoClient, onNewClient, onClose }: Props) {
  const [criteria, setCriteria] = useState<ClientSearchCriteria>(EMPTY_CLIENT_SEARCH_CRITERIA)

  const results = useMemo(() => {
    const filtered = filterClientsByCriteria(clients, criteria)
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }))
  }, [clients, criteria])

  const patchCriteria = (patch: Partial<ClientSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...patch }))
  }

  const runSearch = () => {
    setCriteria(prev => ({ ...prev }))
  }

  const hasActiveCriteria = Object.values(criteria).some(v => v.trim())

  return (
    <div className="gestionale-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="client-search-title">
      <div className="gestionale-dialog-card gestionale-dialog-card--wide client-search-dialog">
        <div className="gestionale-dialog-card__header">
          <h2 id="client-search-title" className="gestionale-dialog-card__title">
            Cerca cliente
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
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <FormField label="Denominazione" htmlFor="client-search-name">
              <input
                id="client-search-name"
                className="gestionale-form-field__input"
                value={criteria.name}
                onChange={e => patchCriteria({ name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <FormField label="Codice fiscale" htmlFor="client-search-cf">
              <input
                id="client-search-cf"
                className="gestionale-form-field__input"
                value={criteria.fiscalCode}
                onChange={e => patchCriteria({ fiscalCode: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <FormField label="P.IVA" htmlFor="client-search-vat">
              <input
                id="client-search-vat"
                className="gestionale-form-field__input"
                value={criteria.vatNumber}
                onChange={e => patchCriteria({ vatNumber: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <button type="button" className="gestionale-dialog-btn gestionale-dialog-btn--primary client-search-dialog__search-btn" onClick={runSearch}>
              Cerca
            </button>
          </div>

          <p className="client-search-dialog__hint">
            {hasActiveCriteria
              ? `${results.length} cliente/i trovati (voci che contengono i testi immessi).`
              : `${results.length} cliente/i — compila i filtri e clicca Cerca, oppure seleziona una riga.`}
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
          <button type="button" className="gestionale-dialog-btn" onClick={onNoClient}>
            Nessun cliente
          </button>
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
