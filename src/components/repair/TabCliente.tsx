import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { loadRecentClients } from '../../lib/loadStudioCatalog'
import { searchClients } from '../../lib/firestorePagination'
import type { Client, Repair } from '../../types'
import ClientFormModal from '../ClientFormModal'
import FormField from '../ui/FormField'
import { displayValue } from '../anagrafica/utils'

interface Props {
  form: Partial<Repair>
  s: (field: string, val: unknown) => void
}

export default function TabCliente({ form, s }: Props) {
  const { studioId } = useActiveStudio()

  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState(form.clientName || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    const term = clientSearch.trim()
    const timer = window.setTimeout(
      () => {
        const load = term ? searchClients(studioId, term) : loadRecentClients(studioId)
        void load.then(data => {
          if (!cancelled) setClients(data)
        })
      },
      term ? 250 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [studioId, clientSearch])

  useEffect(() => {
    if (!studioId || !form.clientId) return
    const c = clients.find(x => x.id === form.clientId)
    if (c) {
      setSelectedClient(c)
      return
    }
    let cancelled = false
    void getDoc(doc(db, 'clients', form.clientId)).then(snap => {
      if (cancelled || !snap.exists()) return
      const client = { id: snap.id, ...snap.data() } as Client
      setSelectedClient(client)
      setClients(prev => (prev.some(x => x.id === client.id) ? prev : [client, ...prev]))
    })
    return () => {
      cancelled = true
    }
  }, [studioId, form.clientId, clients])

  const filteredClients = clients

  const selectClient = (c: Client) => {
    setSelectedClient(c)
    setClientSearch(c.name)
    setShowDropdown(false)
    s('clientId', c.id)
    s('clientName', c.name)
    s('clientPhone', c.phone || c.cellPhone || '')
    s('clientEmail', c.email || '')
    s('clientAddress', c.address || '')
    s('clientCity', c.city || '')
    s('clientProvince', c.province || '')
    s('clientCap', c.cap || '')
  }

  const clearClient = () => {
    setSelectedClient(null)
    setClientSearch('')
    s('clientId', '')
    s('clientName', '')
    s('clientPhone', '')
    s('clientEmail', '')
    s('clientAddress', '')
    s('clientCity', '')
    s('clientProvince', '')
    s('clientCap', '')
  }

  const clientAddressLine = [
    form.clientAddress,
    [form.clientCap, form.clientCity, form.clientProvince].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="gestionale-repair-client">
      {selectedClient || form.clientName ? (
        <div className="gestionale-repair-client__card">
          <div className="gestionale-repair-client__card-head">
            <strong>{form.clientName}</strong>
            <button type="button" className="gestionale-tool-btn" onClick={clearClient}>
              Cambia
            </button>
          </div>
          <dl className="gestionale-repair-client__dl">
            <dt>Indirizzo</dt>
            <dd>{displayValue(clientAddressLine)}</dd>
            <dt>Cell.</dt>
            <dd>{displayValue(form.clientPhone)}</dd>
            <dt>E-mail</dt>
            <dd>{displayValue(form.clientEmail)}</dd>
          </dl>
        </div>
      ) : (
        <div className="gestionale-repair-client__search">
          <FormField label="Cerca cliente" htmlFor="repair-client-search">
            <div className="gestionale-field-with-action">
              <input
                id="repair-client-search"
                className="gestionale-form-field__input gestionale-field-with-action__input"
                value={clientSearch}
                onChange={e => {
                  setClientSearch(e.target.value)
                  setShowDropdown(true)
                  s('clientName', e.target.value)
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Nome, telefono, P.IVA…"
              />
              <button type="button" className="gestionale-field-action-btn" onClick={() => setShowClientModal(true)} title="Nuovo cliente">
                +
              </button>
            </div>
          </FormField>
          {showDropdown && clientSearch && filteredClients.length > 0 ? (
            <div className="gestionale-repair-lines__picker">
              {filteredClients.slice(0, 8).map(c => (
                <button key={c.id} type="button" className="gestionale-dialog-results__item" onClick={() => selectClient(c)}>
                  {c.name} — {c.phone || '—'} {c.city ? `· ${c.city}` : ''}
                </button>
              ))}
            </div>
          ) : null}
          <div className="gestionale-repair-form-grid" style={{ marginTop: 8 }}>
            <FormField label="Telefono" htmlFor="repair-client-phone">
              <input
                id="repair-client-phone"
                className="gestionale-form-field__input"
                value={form.clientPhone || ''}
                onChange={e => s('clientPhone', e.target.value)}
              />
            </FormField>
            <FormField label="E-mail" htmlFor="repair-client-email">
              <input
                id="repair-client-email"
                className="gestionale-form-field__input"
                value={form.clientEmail || ''}
                onChange={e => s('clientEmail', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      )}

      {showClientModal && studioId ? (
        <ClientFormModal
          studioId={studioId}
          onSave={client => {
            setClients(prev => [client, ...prev])
            selectClient(client)
            setShowClientModal(false)
          }}
          onClose={() => setShowClientModal(false)}
        />
      ) : null}
    </div>
  )
}
