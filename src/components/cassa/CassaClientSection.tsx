import type { Client } from '../../types'

export type NewClientForm = {
  name: string
  phone: string
  email: string
  vatNumber: string
  fiscalCode: string
  address: string
  city: string
  province: string
  cap: string
}

export const emptyNewClientForm = (): NewClientForm => ({
  name: '',
  phone: '',
  email: '',
  vatNumber: '',
  fiscalCode: '',
  address: '',
  city: '',
  province: '',
  cap: '',
})

type Props = {
  selectedClient: Client | null
  clientSearch: string
  showClientDropdown: boolean
  filteredClients: Client[]
  showNewClient: boolean
  newClientForm: NewClientForm
  savingClient: boolean
  onClientSearchChange: (v: string) => void
  onShowClientDropdown: (v: boolean) => void
  onSelectClient: (c: Client) => void
  onClearClient: () => void
  onToggleNewClient: (v: boolean) => void
  onNewClientFormChange: (f: NewClientForm) => void
  onCreateClient: () => void
}

export default function CassaClientSection({
  selectedClient,
  clientSearch,
  showClientDropdown,
  filteredClients,
  showNewClient,
  newClientForm,
  savingClient,
  onClientSearchChange,
  onShowClientDropdown,
  onSelectClient,
  onClearClient,
  onToggleNewClient,
  onNewClientFormChange,
  onCreateClient,
}: Props) {
  return (
    <div className="gestionale-cassa-client">
      <div className="gestionale-cassa-client__title">Cliente (opzionale)</div>
      {selectedClient ? (
        <div className="gestionale-cassa-client__selected">
          <div className="gestionale-cassa-client__avatar">{selectedClient.name.charAt(0).toUpperCase()}</div>
          <div className="gestionale-cassa-client__details">
            <strong>{selectedClient.name}</strong>
            <span>
              {selectedClient.phone}
              {selectedClient.vatNumber ? ` · P.IVA ${selectedClient.vatNumber}` : ''}
            </span>
          </div>
          <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--sm" onClick={onClearClient}>
            Cambia
          </button>
        </div>
      ) : (
        <>
          <div className="gestionale-cassa-client__search-row">
            <input
              className="gestionale-cassa-search"
              value={clientSearch}
              onChange={e => {
                onClientSearchChange(e.target.value)
                onShowClientDropdown(true)
              }}
              onFocus={() => onShowClientDropdown(true)}
              placeholder="Cerca nome, telefono, P.IVA…"
            />
            <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--sm" onClick={() => onToggleNewClient(true)}>
              + Nuovo
            </button>
          </div>
          {showClientDropdown && clientSearch && filteredClients.length > 0 ? (
            <ul className="gestionale-doc-client-dropdown">
              {filteredClients.slice(0, 8).map(c => (
                <li key={c.id}>
                  <button type="button" onClick={() => onSelectClient(c)}>
                    <strong>{c.name}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--gestionale-text-muted)' }}>{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showNewClient ? (
            <div className="gestionale-cassa-client__new-form">
              <div className="gestionale-cassa-client__new-grid">
                <input
                  className="gestionale-cassa-search"
                  placeholder="Nome *"
                  value={newClientForm.name}
                  onChange={e => onNewClientFormChange({ ...newClientForm, name: e.target.value })}
                />
                <input
                  className="gestionale-cassa-search"
                  placeholder="Telefono"
                  value={newClientForm.phone}
                  onChange={e => onNewClientFormChange({ ...newClientForm, phone: e.target.value })}
                />
              </div>
              <div className="gestionale-cassa-client__new-actions">
                <button
                  type="button"
                  className="gestionale-cassa-btn gestionale-cassa-btn--primary gestionale-cassa-btn--sm"
                  disabled={savingClient || !newClientForm.name}
                  onClick={onCreateClient}
                >
                  {savingClient ? 'Salvo…' : 'Crea e seleziona'}
                </button>
                <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--sm" onClick={() => onToggleNewClient(false)}>
                  Annulla
                </button>
              </div>
            </div>
          ) : null}
          <p className="gestionale-cassa-client__hint">Senza cliente: «Cliente generico»</p>
        </>
      )}
    </div>
  )
}
