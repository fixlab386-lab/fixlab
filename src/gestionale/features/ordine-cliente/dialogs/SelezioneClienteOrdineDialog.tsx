import { useEffect, useMemo, useRef, useState } from 'react'
import ClientSearchDialog from '../../../../components/clients/ClientSearchDialog'
import ClientFormModal from '../../../../components/ClientFormModal'
import DaneaSelectionHeader from '../../../../components/anagrafica/DaneaSelectionHeader'
import { FiscalCodeAssistField, AddressCapAssistFields, VatNumberAssistField } from '../../../../components/anagrafica/assist'
import { addClient, getNextClientCode } from '../../../../lib/firestore'
import { autocompleteClients } from '../../../../lib/firestorePagination'
import { loadRecentClients } from '../../../../lib/loadStudioCatalog'
import type { Client, Payment } from '../../../../types'
import { WinButton, WinField, WinInput, WinSelect } from '../../vendita-banco/WinControls'
import { clientToOrdineCliente } from '../utils'
import {
  buildClientDestinations,
  formatAddressLine1,
  formatAddressLine2,
} from '../clientDestinations'
import {
  getClientOverduePayments,
  isArretratiWarningHidden,
} from '../clientOverduePayments'
import PagamentiArretratiDialog from './PagamentiArretratiDialog'

export type SelezioneClienteOrdineResult = {
  client: Client
  destinazioneMerceId: string
}

type Props = {
  studioId: string
  clients: Client[]
  payments: Payment[]
  onConfirm: (result: SelezioneClienteOrdineResult) => void
  onClose: () => void
}

type NewClientForm = {
  code: string
  fiscalCode: string
  vatNumber: string
  name: string
  address: string
  cap: string
  city: string
  province: string
  nation: string
  destinationCode: string
  phone: string
  cellPhone: string
  email: string
  shipAddress: string
  shipCap: string
  shipCity: string
  shipProvince: string
  shipNation: string
  shipPhone: string
  shipCell: string
  shipEmail: string
}

const emptyNew: NewClientForm = {
  code: '',
  fiscalCode: '',
  vatNumber: '',
  name: '',
  address: '',
  cap: '',
  city: '',
  province: '',
  nation: 'Italia',
  destinationCode: '',
  phone: '',
  cellPhone: '',
  email: '',
  shipAddress: '',
  shipCap: '',
  shipCity: '',
  shipProvince: '',
  shipNation: 'Italia',
  shipPhone: '',
  shipCell: '',
  shipEmail: '',
}

export default function SelezioneClienteOrdineDialog({
  studioId,
  clients,
  payments,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [destinazioneMerceId, setDestinazioneMerceId] = useState('sede')
  const [clientQuery, setClientQuery] = useState('')
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showEditClient, setShowEditClient] = useState(false)
  const [showArretrati, setShowArretrati] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<SelezioneClienteOrdineResult | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [newForm, setNewForm] = useState<NewClientForm>(emptyNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getNextClientCode(studioId).then(code => setNewForm(prev => ({ ...prev, code })))
  }, [studioId])

  const patchNew = (patch: Partial<NewClientForm>) => setNewForm(prev => ({ ...prev, ...patch }))

  const clientDestinations = useMemo(
    () => (selectedClient ? buildClientDestinations(selectedClient) : []),
    [selectedClient],
  )

  const displayedSede = clientDestinations.find(d => d.id === 'sede') || clientDestinations[0]

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      const q = clientQuery.trim()
      if (!q) {
        void loadRecentClients(studioId, 12).then(items => {
          if (!cancelled) setClientSuggestions(items)
        })
        return
      }
      setSuggestLoading(true)
      void autocompleteClients(studioId, q, 12)
        .then(items => {
          if (!cancelled) setClientSuggestions(items)
        })
        .finally(() => {
          if (!cancelled) setSuggestLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [studioId, clientQuery])

  const showCreateSuggestion = clientQuery.trim().length > 0

  const pickExistingClient = (client: Client) => {
    setSelectedClient(client)
    setClientQuery(client.name)
    setDestinazioneMerceId('sede')
    setSuggestOpen(false)
    setMode('existing')
    setError(null)
  }

  const pickCreateClient = (name?: string) => {
    const label = (name ?? clientQuery).trim()
    setMode('new')
    setSelectedClient(null)
    setSuggestOpen(false)
    setNewForm(prev => ({ ...prev, name: label }))
    setError(null)
  }

  const handleClientQueryChange = (value: string) => {
    setClientQuery(value)
    setSuggestOpen(true)
    if (selectedClient && value.trim() !== selectedClient.name) {
      setSelectedClient(null)
      setDestinazioneMerceId('sede')
    }
  }

  const tryConfirmExistingFromQuery = (): Client | 'create' | null => {
    if (selectedClient) return selectedClient
    const q = clientQuery.trim()
    if (!q) return null
    const exact = clients.filter(c => c.name.toLowerCase() === q.toLowerCase())
    if (exact.length === 1) return exact[0]
    if (clientSuggestions.length === 1) return clientSuggestions[0]
    if (clientSuggestions.length === 0) return 'create'
    return null
  }

  const finishConfirm = (result: SelezioneClienteOrdineResult) => {
    onConfirm(result)
  }

  const tryConfirmClient = (client: Client, destId = destinazioneMerceId) => {
    const result = { client, destinazioneMerceId: destId }
    const overdue = getClientOverduePayments(payments, client.id)
    if (overdue.length > 0 && !isArretratiWarningHidden()) {
      setPendingConfirm(result)
      setShowArretrati(true)
      return
    }
    finishConfirm(result)
  }

  const handleOk = async () => {
    setError(null)
    if (mode === 'existing') {
      const resolved = tryConfirmExistingFromQuery()
      if (resolved === 'create') {
        pickCreateClient()
        return
      }
      if (resolved) {
        tryConfirmClient(resolved)
        return
      }
      setError('Seleziona un cliente dalla lista oppure creane uno nuovo.')
      setSuggestOpen(true)
      return
    }
    if (!newForm.name.trim()) {
      setError('Inserisci il nome del cliente.')
      return
    }
    setSaving(true)
    try {
      const payload: Omit<Client, 'id' | 'createdAt'> = {
        studioId,
        code: newForm.code,
        type: 'client',
        name: newForm.name.trim(),
        fiscalCode: newForm.fiscalCode,
        vatNumber: newForm.vatNumber,
        address: newForm.address,
        cap: newForm.cap,
        city: newForm.city,
        province: newForm.province,
        nation: newForm.nation,
        destinationCode: newForm.destinationCode,
        phone: newForm.phone,
        cellPhone: newForm.cellPhone,
        email: newForm.email,
        priceList: 'privati',
        totalSpent: 0,
        repairsCount: 0,
        extraData:
          newForm.shipAddress.trim() || newForm.shipCity.trim()
            ? {
                sediExtra: [
                  {
                    denominazione: 'Destinazione merce',
                    indirizzo: newForm.shipAddress,
                    cap: newForm.shipCap,
                    citta: newForm.shipCity,
                    prov: newForm.shipProvince,
                    nazione: newForm.shipNation,
                  },
                ],
              }
            : undefined,
      }
      const ref = await addClient(payload)
      const created: Client = { ...payload, id: ref.id, createdAt: new Date() }
      tryConfirmClient(created, 'sede')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio cliente non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  if (showSearch) {
    return (
      <ClientSearchDialog
        studioId={studioId}
        clients={clients}
        requireClient
        title="Selezione cliente"
        onSelect={c => {
          pickExistingClient(c)
          setShowSearch(false)
        }}
        onNoClient={() => setShowSearch(false)}
        onNewClient={() => {
          pickCreateClient()
          setShowSearch(false)
        }}
        onClose={() => setShowSearch(false)}
      />
    )
  }

  const overdueRows = pendingConfirm ? getClientOverduePayments(payments, pendingConfirm.client.id) : []

  return (
    <>
      {showArretrati && pendingConfirm ? (
        <PagamentiArretratiDialog
          clientName={pendingConfirm.client.name}
          rows={overdueRows}
          onConfirm={() => {
            setShowArretrati(false)
            finishConfirm(pendingConfirm)
            setPendingConfirm(null)
          }}
          onClose={() => {
            setShowArretrati(false)
            setPendingConfirm(null)
          }}
        />
      ) : null}

      {showEditClient && selectedClient ? (
        <ClientFormModal
          studioId={studioId}
          client={selectedClient}
          onSave={updated => {
            pickExistingClient(updated)
            setShowEditClient(false)
          }}
          onClose={() => setShowEditClient(false)}
        />
      ) : null}

      <div className="vb-dialog-overlay oc-selezione-overlay" role="dialog" aria-modal="true">
        <div className="vb-dialog vb-dialog--ordine-cliente">
          <div className="vb-dialog__titlebar vb-dialog__titlebar--brand">
            <span>Selezione cliente</span>
            <button type="button" className="vb-icon-btn vb-dialog__titlebar-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="vb-dialog__body oc-selezione-cliente">
            <DaneaSelectionHeader
              title="Selezione cliente"
              subtitle="Indicare il cliente a cui si desidera intestare il documento"
            />

            <label className="vb-radio oc-selezione-cliente__radio">
              <input
                type="radio"
                name="oc-client-mode"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
              />
              Usa un cliente già esistente
            </label>

            {mode === 'existing' ? (
              <div className="oc-selezione-cliente__existing-panel">
                <div className="oc-selezione-cliente__existing-grid">
                  <div className="oc-selezione-cliente__existing-left">
                    <div className="vb-row oc-selezione-cliente__search">
                      <div className="oc-selezione-cliente__autocomplete">
                        {selectedClient && !suggestOpen ? (
                          <WinInput
                            className="vb-input--flex oc-selezione-cliente__client-select"
                            value={selectedClient.name}
                            readOnly
                            onFocus={() => {
                              setSuggestOpen(true)
                              window.setTimeout(() => searchInputRef.current?.focus(), 0)
                            }}
                          />
                        ) : (
                          <WinInput
                            ref={searchInputRef}
                            className="vb-input--flex"
                            value={clientQuery}
                            placeholder="Digita nome, codice o P.IVA…"
                            onChange={e => handleClientQueryChange(e.target.value)}
                            onFocus={() => setSuggestOpen(true)}
                            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const resolved = tryConfirmExistingFromQuery()
                                if (resolved === 'create') pickCreateClient()
                                else if (resolved && typeof resolved !== 'string') pickExistingClient(resolved)
                                else setSuggestOpen(true)
                              }
                            }}
                          />
                        )}
                        {suggestOpen && !selectedClient && (suggestLoading || clientSuggestions.length > 0 || showCreateSuggestion) ? (
                          <ul className="oc-selezione-cliente__suggest" role="listbox">
                            {suggestLoading ? (
                              <li className="oc-selezione-cliente__suggest-loading">Ricerca…</li>
                            ) : null}
                            {clientSuggestions.map(c => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  role="option"
                                  onMouseDown={e => {
                                    e.preventDefault()
                                    pickExistingClient(c)
                                  }}
                                >
                                  <strong>{c.name}</strong>
                                  {c.code ? (
                                    <span className="oc-selezione-cliente__suggest-meta"> — {c.code}</span>
                                  ) : null}
                                </button>
                              </li>
                            ))}
                            {showCreateSuggestion && clientSuggestions.length === 0 ? (
                              <li>
                                <button
                                  type="button"
                                  role="option"
                                  className="oc-selezione-cliente__suggest-create"
                                  onMouseDown={e => {
                                    e.preventDefault()
                                    pickCreateClient()
                                  }}
                                >
                                  ➕ Crea nuovo cliente: <strong>{clientQuery.trim()}</strong>
                                </button>
                              </li>
                            ) : null}
                          </ul>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="vb-icon-btn vb-icon-btn--search oc-selezione-cliente__binoculars"
                        title="Ricerca avanzata clienti"
                        onClick={() => setShowSearch(true)}
                      >
                        🔭
                      </button>
                    </div>

                    {selectedClient && displayedSede ? (
                      <div className="oc-selezione-cliente__address">
                        {formatAddressLine1(displayedSede) ? (
                          <p className="oc-selezione-cliente__address-line">{formatAddressLine1(displayedSede)}</p>
                        ) : null}
                        {formatAddressLine2(displayedSede) ? (
                          <p className="oc-selezione-cliente__address-line">{formatAddressLine2(displayedSede)}</p>
                        ) : null}
                        <button type="button" className="vb-link oc-selezione-cliente__modifica" onClick={() => setShowEditClient(true)}>
                          Modifica…
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="oc-selezione-cliente__existing-right">
                    <WinField label="Destinazione merce" htmlFor="oc-dest-merci">
                      <WinSelect
                        id="oc-dest-merci"
                        value={destinazioneMerceId}
                        disabled={!selectedClient}
                        onChange={e => setDestinazioneMerceId(e.target.value)}
                      >
                        {clientDestinations.length === 0 ? (
                          <option value="sede">(Sede operativa)</option>
                        ) : (
                          clientDestinations.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))
                        )}
                      </WinSelect>
                    </WinField>
                  </div>
                </div>
              </div>
            ) : null}

            <label className="vb-radio oc-selezione-cliente__radio">
              <input type="radio" name="oc-client-mode" checked={mode === 'new'} onChange={() => setMode('new')} />
              Crea un nuovo cliente:
            </label>

            <div
              className={`oc-selezione-cliente__form${mode === 'existing' ? ' oc-selezione-cliente__form--disabled' : ''}`}
              aria-disabled={mode === 'existing'}
            >
              <div className="oc-selezione-cliente__col">
                <p className="oc-selezione-cliente__col-title">Intestatario</p>
                <div className="oc-selezione-cliente__row2">
                  <WinField label="Cod. fiscale">
                    <FiscalCodeAssistField
                      variant="win"
                      value={newForm.fiscalCode}
                      onChange={v => patchNew({ fiscalCode: v })}
                    />
                  </WinField>
                  <WinField label="Partita Iva" htmlFor="oc-piva">
                    <VatNumberAssistField
                      variant="win"
                      id="oc-piva"
                      value={newForm.vatNumber}
                      disabled={mode === 'existing'}
                      onChange={v => patchNew({ vatNumber: v })}
                      onResolved={data =>
                        patchNew({
                          ...(data.name && !newForm.name.trim() ? { name: data.name } : {}),
                          ...(data.address ? { address: data.address } : {}),
                          ...(data.cap ? { cap: data.cap } : {}),
                          ...(data.city ? { city: data.city } : {}),
                          ...(data.province ? { province: data.province } : {}),
                        })
                      }
                    />
                  </WinField>
                </div>
                <WinField label="Intestatario" htmlFor="oc-name">
                  <div className="vb-row">
                    <WinInput
                      id="oc-name"
                      className="vb-input--flex"
                      value={newForm.name}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ name: e.target.value })}
                    />
                    <button type="button" className="vb-icon-btn vb-icon-btn--search" title="Cerca" disabled={mode === 'existing'}>
                      🔍
                    </button>
                  </div>
                </WinField>
                <WinField label="Indirizzo" htmlFor="oc-address">
                  <WinInput
                    id="oc-address"
                    value={newForm.address}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ address: e.target.value })}
                  />
                </WinField>
                <AddressCapAssistFields
                  variant="win"
                  value={{ cap: newForm.cap, city: newForm.city, province: newForm.province }}
                  onChange={patch => patchNew(patch)}
                />
                <WinField label="Nazione" htmlFor="oc-nation">
                  <div className="vb-row">
                    <WinSelect
                      id="oc-nation"
                      className="vb-input--flex"
                      value={newForm.nation}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ nation: e.target.value })}
                    >
                      <option value="Italia">Italia</option>
                      <option value="San Marino">San Marino</option>
                      <option value="Svizzera">Svizzera</option>
                    </WinSelect>
                    <button type="button" className="vb-icon-btn vb-icon-btn--search" title="Cerca nazione" disabled={mode === 'existing'}>
                      🔍
                    </button>
                  </div>
                </WinField>
                <WinField label="Cod. dest./ Pec" htmlFor="oc-dest">
                  <WinInput
                    id="oc-dest"
                    value={newForm.destinationCode}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ destinationCode: e.target.value })}
                  />
                </WinField>
                <div className="oc-selezione-cliente__row2">
                  <WinField label="Telefono" htmlFor="oc-phone">
                    <WinInput
                      id="oc-phone"
                      value={newForm.phone}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ phone: e.target.value })}
                    />
                  </WinField>
                  <WinField label="Cellulare" htmlFor="oc-cell">
                    <WinInput
                      id="oc-cell"
                      value={newForm.cellPhone}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ cellPhone: e.target.value })}
                    />
                  </WinField>
                </div>
                <WinField label="e-mail" htmlFor="oc-email">
                  <WinInput
                    id="oc-email"
                    value={newForm.email}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ email: e.target.value })}
                  />
                </WinField>
              </div>

              <div className="oc-selezione-cliente__col">
                <p className="oc-selezione-cliente__col-title">Destinazione merce (se diversa)</p>
                <WinField label="Indirizzo" htmlFor="oc-ship-address">
                  <WinInput
                    id="oc-ship-address"
                    value={newForm.shipAddress}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ shipAddress: e.target.value })}
                  />
                </WinField>
                <AddressCapAssistFields
                  variant="win"
                  value={{ cap: newForm.shipCap, city: newForm.shipCity, province: newForm.shipProvince }}
                  onChange={patch =>
                    patchNew({
                      shipCap: patch.cap ?? newForm.shipCap,
                      shipCity: patch.city ?? newForm.shipCity,
                      shipProvince: patch.province ?? newForm.shipProvince,
                    })
                  }
                />
                <WinField label="Nazione" htmlFor="oc-ship-nation">
                  <WinSelect
                    id="oc-ship-nation"
                    value={newForm.shipNation}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ shipNation: e.target.value })}
                  >
                    <option value="Italia">Italia</option>
                  </WinSelect>
                </WinField>
                <div className="oc-selezione-cliente__row2">
                  <WinField label="Telefono" htmlFor="oc-ship-phone">
                    <WinInput
                      id="oc-ship-phone"
                      value={newForm.shipPhone}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ shipPhone: e.target.value })}
                    />
                  </WinField>
                  <WinField label="Cellulare" htmlFor="oc-ship-cell">
                    <WinInput
                      id="oc-ship-cell"
                      value={newForm.shipCell}
                      disabled={mode === 'existing'}
                      onChange={e => patchNew({ shipCell: e.target.value })}
                    />
                  </WinField>
                </div>
                <WinField label="e-mail" htmlFor="oc-ship-email">
                  <WinInput
                    id="oc-ship-email"
                    value={newForm.shipEmail}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ shipEmail: e.target.value })}
                  />
                </WinField>
              </div>
            </div>

            {error ? <p className="oc-selezione-cliente__error">{error}</p> : null}
          </div>
          <div className="vb-dialog__footer oc-selezione-cliente__footer">
            <WinButton onClick={() => void handleOk()} disabled={saving}>
              {saving ? 'Salvataggio…' : 'OK'}
            </WinButton>
            <WinButton onClick={onClose}>Annulla</WinButton>
          </div>
        </div>
      </div>
    </>
  )
}
