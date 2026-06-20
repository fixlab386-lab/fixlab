import { useState, useEffect } from 'react'
import { addClient, updateClient, getNextClientCode } from '../lib/firestore'
import type { Client } from '../types'
import { FiscalCodeAssistField, AddressCapAssistFields, VatNumberAssistField } from './anagrafica/assist'
import DaneaSelectionHeader from './anagrafica/DaneaSelectionHeader'
import { WinButton, WinField, WinInput, WinSelect, WinTextarea } from '../gestionale/features/vendita-banco/WinControls'
import '../theme/gestionale-dialog.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../gestionale/theme/vendita-al-banco.css'
import '../gestionale/theme/ordine-cliente.css'

interface Props {
  studioId: string
  client?: Client | null        // se presente, modalità modifica
  onSave: (client: Client) => void
  onClose: () => void
}

const emptyForm: Omit<Client, 'id' | 'createdAt'> = {
  studioId: '', code: '', type: 'client', name: '', phone: '', email: '', pec: '',
  vatNumber: '', fiscalCode: '',
  address: '', city: '', province: '', cap: '', nation: 'Italia',
  contactPerson: '', cellPhone: '', fax: '',
  priceList: 'privati', paymentMethod: '', notes: '',
  totalSpent: 0, repairsCount: 0
}

export default function ClientFormModal({ studioId, client, onSave, onClose }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const editing = !!client

  useEffect(() => {
    if (client) {
      setForm({
        studioId, code: client.code || '', type: client.type || 'client',
        name: client.name, phone: client.phone, email: client.email || '',
        pec: client.pec || '', vatNumber: client.vatNumber || '', fiscalCode: client.fiscalCode || '',
        address: client.address || '', city: client.city || '',
        province: client.province || '', cap: client.cap || '',
        nation: client.nation || 'Italia',
        contactPerson: client.contactPerson || '', cellPhone: client.cellPhone || '',
        fax: client.fax || '',
        priceList: client.priceList || 'privati', paymentMethod: client.paymentMethod || '',
        notes: client.notes || '',
        totalSpent: client.totalSpent, repairsCount: client.repairsCount
      })
    } else {
      getNextClientCode(studioId).then(code => {
        setForm({ ...emptyForm, studioId, code })
      })
    }
  }, [client, studioId])

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editing && client) {
        await updateClient(client.id, form)
        onSave({ ...client, ...form } as Client)
      } else {
        const docRef = await addClient(form as Omit<Client, 'id' | 'createdAt'>)
        onSave({ ...form, id: docRef.id, createdAt: new Date() } as Client)
      }
    } catch (err) {
      console.error('Errore salvataggio cliente:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="vb-dialog-overlay vb-dialog-overlay--anagrafica"
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="vb-dialog vb-dialog--anagrafica">
        <div className="vb-dialog__titlebar vb-dialog__titlebar--brand">
          <span>{editing ? 'Modifica cliente' : 'Nuovo cliente'}</span>
          <button type="button" className="vb-icon-btn vb-dialog__titlebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-dialog__body oc-selezione-cliente">
          <DaneaSelectionHeader
            title={editing ? 'Modifica cliente' : 'Nuovo cliente'}
            subtitle="Inserisci i dati anagrafici del cliente"
          />

          <div className="oc-selezione-cliente__row2" style={{ gridTemplateColumns: '110px 1fr' }}>
            <WinField label="Codice">
              <WinInput value={form.code} readOnly />
            </WinField>
            <WinField label="Nome *" htmlFor="cf-name">
              <WinInput
                id="cf-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mario Rossi"
              />
            </WinField>
          </div>

          <div className="oc-anagrafica__tipi">
            <label>
              <input
                type="checkbox"
                checked={form.type === 'client' || form.type === 'both'}
                onChange={() =>
                  setForm(f => ({ ...f, type: f.type === 'both' ? 'supplier' : f.type === 'client' ? 'client' : 'both' }))
                }
              />
              Cliente
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.type === 'supplier' || form.type === 'both'}
                onChange={() =>
                  setForm(f => ({ ...f, type: f.type === 'both' ? 'client' : f.type === 'supplier' ? 'supplier' : 'both' }))
                }
              />
              Fornitore
            </label>
          </div>

          <div className="oc-selezione-cliente__row2">
            <WinField label="Partita IVA" htmlFor="cf-piva">
              <VatNumberAssistField
                variant="win"
                id="cf-piva"
                value={form.vatNumber || ''}
                onChange={v => setForm(f => ({ ...f, vatNumber: v }))}
                onResolved={data =>
                  setForm(f => ({
                    ...f,
                    ...(data.name && !f.name.trim() ? { name: data.name } : {}),
                    ...(data.address ? { address: data.address } : {}),
                    ...(data.cap ? { cap: data.cap } : {}),
                    ...(data.city ? { city: data.city } : {}),
                    ...(data.province ? { province: data.province } : {}),
                  }))
                }
              />
            </WinField>
            <WinField label="Cod. fiscale">
              <FiscalCodeAssistField
                variant="win"
                value={form.fiscalCode || ''}
                onChange={fiscalCode => setForm(f => ({ ...f, fiscalCode }))}
              />
            </WinField>
          </div>

          <p className="oc-anagrafica-section">Sede</p>
          <WinField label="Indirizzo" htmlFor="cf-address">
            <WinInput
              id="cf-address"
              value={form.address || ''}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </WinField>
          <AddressCapAssistFields
            variant="win"
            value={{ cap: form.cap, city: form.city, province: form.province }}
            onChange={patch => setForm(f => ({ ...f, ...patch }))}
          />
          <WinField label="Nazione" htmlFor="cf-nation">
            <WinSelect
              id="cf-nation"
              value={form.nation || 'Italia'}
              onChange={e => setForm(f => ({ ...f, nation: e.target.value }))}
            >
              <option value="Italia">Italia</option>
              <option value="San Marino">San Marino</option>
              <option value="Svizzera">Svizzera</option>
            </WinSelect>
          </WinField>

          <p className="oc-anagrafica-section">Contatti</p>
          <div className="oc-selezione-cliente__row2">
            <WinField label="Telefono" htmlFor="cf-phone">
              <WinInput
                id="cf-phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="333 1234567"
              />
            </WinField>
            <WinField label="Cellulare" htmlFor="cf-cell">
              <WinInput
                id="cf-cell"
                value={form.cellPhone || ''}
                onChange={e => setForm(f => ({ ...f, cellPhone: e.target.value }))}
              />
            </WinField>
          </div>
          <WinField label="Email" htmlFor="cf-email">
            <WinInput
              id="cf-email"
              value={form.email || ''}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="mario@email.com"
            />
          </WinField>
          <WinField label="PEC" htmlFor="cf-pec">
            <WinInput id="cf-pec" value={form.pec || ''} onChange={e => setForm(f => ({ ...f, pec: e.target.value }))} />
          </WinField>
          <WinField label="Referente" htmlFor="cf-ref">
            <WinInput
              id="cf-ref"
              value={form.contactPerson || ''}
              onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}
            />
          </WinField>

          <p className="oc-anagrafica-section">Commerciale</p>
          <WinField label="Listino prezzi" htmlFor="cf-listino">
            <WinSelect
              id="cf-listino"
              value={form.priceList}
              onChange={e => setForm(f => ({ ...f, priceList: e.target.value as Client['priceList'] }))}
            >
              <option value="privati">Privati</option>
              <option value="aziende">Aziende</option>
              <option value="convenzionati">Convenzionati</option>
              <option value="vip">VIP</option>
            </WinSelect>
          </WinField>
          <WinField label="Modalità pagamento" htmlFor="cf-pay">
            <WinInput
              id="cf-pay"
              value={form.paymentMethod || ''}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              placeholder="Es: Contanti, Bonifico 30gg..."
            />
          </WinField>
          <WinField label="Note" htmlFor="cf-notes">
            <WinTextarea
              id="cf-notes"
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </WinField>
        </div>

        <div className="vb-dialog__footer oc-selezione-cliente__footer">
          <WinButton onClick={onClose}>Annulla</WinButton>
          <WinButton className="vb-btn--ok" onClick={() => void handleSave()} disabled={saving || !form.name}>
            {saving ? 'Salvataggio…' : editing ? 'Aggiorna' : 'OK'}
          </WinButton>
        </div>
      </div>
    </div>
  )
}
