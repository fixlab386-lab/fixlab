import { useEffect, useMemo, useRef, useState } from 'react'
import SupplierFormModal from '../../../../components/SupplierFormModal'
import DaneaSelectionHeader from '../../../../components/anagrafica/DaneaSelectionHeader'
import { FiscalCodeAssistField, AddressCapAssistFields, VatNumberAssistField } from '../../../../components/anagrafica/assist'
import { addSupplier, getNextSupplierCode } from '../../../../lib/firestore'
import type { Supplier } from '../../../../types'
import { WinButton, WinField, WinInput, WinSelect } from '../../vendita-banco/WinControls'
import {
  buildSupplierDestinations,
  formatAddressLine1,
  formatAddressLine2,
} from '../supplierDestinations'

export type SelezioneFornitoreOrdineResult = {
  supplier: Supplier
  destinazioneMerceId: string
}

type Props = {
  studioId: string
  suppliers: Supplier[]
  onConfirm: (result: SelezioneFornitoreOrdineResult) => void
  onClose: () => void
}

type NewSupplierForm = {
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

const emptyNew: NewSupplierForm = {
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

export default function SelezioneFornitoreOrdineDialog({
  studioId,
  suppliers,
  onConfirm,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [destinazioneMerceId, setDestinazioneMerceId] = useState('sede')
  const [supplierQuery, setSupplierQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [showEditSupplier, setShowEditSupplier] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [newForm, setNewForm] = useState<NewSupplierForm>(emptyNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getNextSupplierCode(studioId).then(code => setNewForm(prev => ({ ...prev, code })))
  }, [studioId])

  const patchNew = (patch: Partial<NewSupplierForm>) => setNewForm(prev => ({ ...prev, ...patch }))

  const supplierDestinations = useMemo(
    () => (selectedSupplier ? buildSupplierDestinations(selectedSupplier) : []),
    [selectedSupplier],
  )

  const displayedSede = supplierDestinations.find(d => d.id === 'sede') || supplierDestinations[0]

  const supplierSuggestions = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase()
    if (!q) return suppliers.slice(0, 12)
    return suppliers
      .filter(s => {
        const haystack = [s.name, s.code, s.fiscalCode, s.vatNumber, s.email, s.phone, s.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .slice(0, 12)
  }, [suppliers, supplierQuery])

  const showCreateSuggestion = supplierQuery.trim().length > 0

  const pickExistingSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSupplierQuery(supplier.name)
    setDestinazioneMerceId('sede')
    setSuggestOpen(false)
    setMode('existing')
    setError(null)
  }

  const pickCreateSupplier = (name?: string) => {
    const label = (name ?? supplierQuery).trim()
    setMode('new')
    setSelectedSupplier(null)
    setSuggestOpen(false)
    setNewForm(prev => ({ ...prev, name: label }))
    setError(null)
  }

  const handleSupplierQueryChange = (value: string) => {
    setSupplierQuery(value)
    setSuggestOpen(true)
    if (selectedSupplier && value.trim() !== selectedSupplier.name) {
      setSelectedSupplier(null)
      setDestinazioneMerceId('sede')
    }
  }

  const tryConfirmExistingFromQuery = (): Supplier | 'create' | null => {
    if (selectedSupplier) return selectedSupplier
    const q = supplierQuery.trim()
    if (!q) return null
    const exact = suppliers.filter(s => s.name.toLowerCase() === q.toLowerCase())
    if (exact.length === 1) return exact[0]
    if (supplierSuggestions.length === 1) return supplierSuggestions[0]
    if (supplierSuggestions.length === 0) return 'create'
    return null
  }

  const finishConfirm = (result: SelezioneFornitoreOrdineResult) => {
    onConfirm(result)
  }

  const handleOk = async () => {
    setError(null)
    if (mode === 'existing') {
      const resolved = tryConfirmExistingFromQuery()
      if (resolved === 'create') {
        pickCreateSupplier()
        return
      }
      if (resolved) {
        finishConfirm({ supplier: resolved, destinazioneMerceId })
        return
      }
      setError('Seleziona un fornitore dalla lista oppure creane uno nuovo.')
      setSuggestOpen(true)
      return
    }
    if (!newForm.name.trim()) {
      setError('Inserisci il nome del fornitore.')
      return
    }
    setSaving(true)
    try {
      const payload: Omit<Supplier, 'id' | 'createdAt'> = {
        studioId,
        code: newForm.code,
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
      const ref = await addSupplier(payload)
      const created: Supplier = { ...payload, id: ref.id, createdAt: new Date() }
      finishConfirm({ supplier: created, destinazioneMerceId: 'sede' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio fornitore non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  if (showEditSupplier && selectedSupplier) {
    return (
      <SupplierFormModal
        studioId={studioId}
        supplier={selectedSupplier}
        onSave={updated => {
          pickExistingSupplier(updated)
          setShowEditSupplier(false)
        }}
        onClose={() => setShowEditSupplier(false)}
      />
    )
  }

  return (
    <div className="vb-dialog-overlay oc-selezione-overlay of-selezione-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--ordine-cliente vb-dialog--ordine-fornitore">
        <div className="vb-dialog__titlebar">
          <span>Selezione fornitore</span>
          <button type="button" className="vb-icon-btn vb-dialog__titlebar-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body oc-selezione-cliente of-selezione-fornitore">
          <DaneaSelectionHeader
            title="Selezione fornitore"
            subtitle="Indicare il fornitore a cui si desidera intestare il documento"
          />

          <label className="vb-radio oc-selezione-cliente__radio">
            <input
              type="radio"
              name="of-supplier-mode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
            />
            Usa un fornitore già esistente
          </label>

          {mode === 'existing' ? (
            <div className="oc-selezione-cliente__existing-panel">
              <div className="oc-selezione-cliente__existing-grid">
                <div className="oc-selezione-cliente__existing-left">
                  <div className="vb-row oc-selezione-cliente__search">
                    <div className="oc-selezione-cliente__autocomplete">
                      {selectedSupplier && !suggestOpen ? (
                        <WinSelect
                          className="vb-input--flex oc-selezione-cliente__client-select"
                          value={selectedSupplier.id}
                          onChange={e => {
                            const s = suppliers.find(x => x.id === e.target.value)
                            if (s) pickExistingSupplier(s)
                          }}
                          onFocus={() => {
                            setSuggestOpen(true)
                            window.setTimeout(() => searchInputRef.current?.focus(), 0)
                          }}
                        >
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </WinSelect>
                      ) : (
                        <WinInput
                          ref={searchInputRef}
                          className="vb-input--flex"
                          value={supplierQuery}
                          placeholder="Digita nome, codice o P.IVA…"
                          onChange={e => handleSupplierQueryChange(e.target.value)}
                          onFocus={() => setSuggestOpen(true)}
                          onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const resolved = tryConfirmExistingFromQuery()
                              if (resolved === 'create') pickCreateSupplier()
                              else if (resolved && typeof resolved !== 'string') pickExistingSupplier(resolved)
                              else setSuggestOpen(true)
                            }
                          }}
                        />
                      )}
                      {suggestOpen && !selectedSupplier && (supplierSuggestions.length > 0 || showCreateSuggestion) ? (
                        <ul className="oc-selezione-cliente__suggest" role="listbox">
                          {supplierSuggestions.map(s => (
                            <li key={s.id}>
                              <button
                                type="button"
                                role="option"
                                onMouseDown={e => {
                                  e.preventDefault()
                                  pickExistingSupplier(s)
                                }}
                              >
                                <strong>{s.name}</strong>
                                {s.code ? (
                                  <span className="oc-selezione-cliente__suggest-meta"> — {s.code}</span>
                                ) : null}
                              </button>
                            </li>
                          ))}
                          {showCreateSuggestion && supplierSuggestions.length === 0 ? (
                            <li>
                              <button
                                type="button"
                                role="option"
                                className="oc-selezione-cliente__suggest-create"
                                onMouseDown={e => {
                                  e.preventDefault()
                                  pickCreateSupplier()
                                }}
                              >
                                ➕ Crea nuovo fornitore: <strong>{supplierQuery.trim()}</strong>
                              </button>
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
                  </div>

                  {selectedSupplier && displayedSede ? (
                    <div className="oc-selezione-cliente__address">
                      {formatAddressLine1(displayedSede) ? (
                        <p className="oc-selezione-cliente__address-line">{formatAddressLine1(displayedSede)}</p>
                      ) : null}
                      {formatAddressLine2(displayedSede) ? (
                        <p className="oc-selezione-cliente__address-line">{formatAddressLine2(displayedSede)}</p>
                      ) : null}
                      <button
                        type="button"
                        className="vb-link oc-selezione-cliente__modifica"
                        onClick={() => setShowEditSupplier(true)}
                      >
                        Modifica…
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="oc-selezione-cliente__existing-right">
                  <WinField label="Destinazione merce" htmlFor="of-dest-merci">
                    <WinSelect
                      id="of-dest-merci"
                      value={destinazioneMerceId}
                      disabled={!selectedSupplier}
                      onChange={e => setDestinazioneMerceId(e.target.value)}
                    >
                      {supplierDestinations.length === 0 ? (
                        <option value="sede">(Sede operativa)</option>
                      ) : (
                        supplierDestinations.map(d => (
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
            <input type="radio" name="of-supplier-mode" checked={mode === 'new'} onChange={() => setMode('new')} />
            Crea un nuovo fornitore:
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
                <WinField label="Partita Iva" htmlFor="of-piva">
                  <VatNumberAssistField
                    variant="win"
                    id="of-piva"
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
              <WinField label="Intestatario" htmlFor="of-name">
                <div className="vb-row">
                  <WinInput
                    id="of-name"
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
              <WinField label="Indirizzo" htmlFor="of-address">
                <WinInput
                  id="of-address"
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
              <WinField label="Nazione" htmlFor="of-nation">
                <div className="vb-row">
                  <WinSelect
                    id="of-nation"
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
              <WinField label="Cod. dest./ Pec" htmlFor="of-dest">
                <WinInput
                  id="of-dest"
                  value={newForm.destinationCode}
                  disabled={mode === 'existing'}
                  onChange={e => patchNew({ destinationCode: e.target.value })}
                />
              </WinField>
              <div className="oc-selezione-cliente__row2">
                <WinField label="Telefono" htmlFor="of-phone">
                  <WinInput
                    id="of-phone"
                    value={newForm.phone}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ phone: e.target.value })}
                  />
                </WinField>
                <WinField label="Cellulare" htmlFor="of-cell">
                  <WinInput
                    id="of-cell"
                    value={newForm.cellPhone}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ cellPhone: e.target.value })}
                  />
                </WinField>
              </div>
              <WinField label="e-mail" htmlFor="of-email">
                <WinInput
                  id="of-email"
                  value={newForm.email}
                  disabled={mode === 'existing'}
                  onChange={e => patchNew({ email: e.target.value })}
                />
              </WinField>
            </div>

            <div className="oc-selezione-cliente__col">
              <p className="oc-selezione-cliente__col-title">Destinazione merce (se diversa)</p>
              <WinField label="Indirizzo" htmlFor="of-ship-address">
                <WinInput
                  id="of-ship-address"
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
              <WinField label="Nazione" htmlFor="of-ship-nation">
                <WinSelect
                  id="of-ship-nation"
                  value={newForm.shipNation}
                  disabled={mode === 'existing'}
                  onChange={e => patchNew({ shipNation: e.target.value })}
                >
                  <option value="Italia">Italia</option>
                </WinSelect>
              </WinField>
              <div className="oc-selezione-cliente__row2">
                <WinField label="Telefono" htmlFor="of-ship-phone">
                  <WinInput
                    id="of-ship-phone"
                    value={newForm.shipPhone}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ shipPhone: e.target.value })}
                  />
                </WinField>
                <WinField label="Cellulare" htmlFor="of-ship-cell">
                  <WinInput
                    id="of-ship-cell"
                    value={newForm.shipCell}
                    disabled={mode === 'existing'}
                    onChange={e => patchNew({ shipCell: e.target.value })}
                  />
                </WinField>
              </div>
              <WinField label="e-mail" htmlFor="of-ship-email">
                <WinInput
                  id="of-ship-email"
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
          <WinButton onClick={onClose}>Annulla</WinButton>
          <WinButton className="vb-btn--ok" onClick={() => void handleOk()} disabled={saving}>
            {saving ? 'Salvataggio…' : 'OK'}
          </WinButton>
        </div>
      </div>
    </div>
  )
}
