import { useEffect, useState } from 'react'
import { addSupplier, updateSupplier, getNextSupplierCode } from '../lib/firestore'
import type { Supplier } from '../types'
import { FiscalCodeAssistField, AddressCapAssistFields, VatNumberAssistField } from './anagrafica/assist'
import DaneaSelectionHeader from './anagrafica/DaneaSelectionHeader'
import { WinButton, WinField, WinInput, WinSelect, WinTextarea } from '../gestionale/features/vendita-banco/WinControls'
import '../theme/gestionale-dialog.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../gestionale/theme/vendita-al-banco.css'
import '../gestionale/theme/ordine-cliente.css'

interface Props {
  studioId: string
  supplier?: Supplier | null
  onSave: (supplier: Supplier) => void
  onClose: () => void
}

const emptyForm: Omit<Supplier, 'id' | 'createdAt'> = {
  studioId: '',
  code: '',
  name: '',
  vatNumber: '',
  fiscalCode: '',
  address: '',
  city: '',
  province: '',
  cap: '',
  nation: 'Italia',
  contactPerson: '',
  phone: '',
  cellPhone: '',
  fax: '',
  email: '',
  pec: '',
  paymentTerms: '',
  bankName: '',
  bankIban: '',
  notes: '',
}

export default function SupplierFormModal({ studioId, supplier, onSave, onClose }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const editing = !!supplier

  useEffect(() => {
    if (supplier) {
      setForm({
        studioId,
        code: supplier.code,
        name: supplier.name,
        vatNumber: supplier.vatNumber || '',
        fiscalCode: supplier.fiscalCode || '',
        address: supplier.address || '',
        city: supplier.city || '',
        province: supplier.province || '',
        cap: supplier.cap || '',
        nation: supplier.nation || 'Italia',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        cellPhone: supplier.cellPhone || '',
        fax: supplier.fax || '',
        email: supplier.email || '',
        pec: supplier.pec || '',
        paymentTerms: supplier.paymentTerms || '',
        bankName: supplier.bankName || '',
        bankIban: supplier.bankIban || '',
        notes: supplier.notes || '',
      })
    } else {
      getNextSupplierCode(studioId).then(code => {
        setForm({ ...emptyForm, studioId, code })
      })
    }
  }, [supplier, studioId])

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editing && supplier) {
        await updateSupplier(supplier.id, form)
        onSave({ ...supplier, ...form } as Supplier)
      } else {
        const docRef = await addSupplier(form as Omit<Supplier, 'id' | 'createdAt'>)
        onSave({ ...form, id: docRef.id, createdAt: new Date() } as Supplier)
      }
    } catch (err) {
      console.error('Errore salvataggio fornitore:', err)
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
          <span>{editing ? 'Modifica fornitore' : 'Nuovo fornitore'}</span>
          <button type="button" className="vb-icon-btn vb-dialog__titlebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-dialog__body oc-selezione-cliente">
          <DaneaSelectionHeader
            title={editing ? 'Modifica fornitore' : 'Nuovo fornitore'}
            subtitle="Inserisci i dati anagrafici del fornitore"
          />

          <div className="oc-selezione-cliente__row2" style={{ gridTemplateColumns: '110px 1fr' }}>
            <WinField label="Codice">
              <WinInput value={form.code} readOnly />
            </WinField>
            <WinField label="Denominazione *" htmlFor="sf-name">
              <WinInput
                id="sf-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome fornitore"
              />
            </WinField>
          </div>

          <div className="oc-selezione-cliente__row2">
            <WinField label="Partita IVA" htmlFor="sf-piva">
              <VatNumberAssistField
                variant="win"
                id="sf-piva"
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

          <p className="oc-anagrafica-section">Sede operativa</p>
          <WinField label="Indirizzo" htmlFor="sf-address">
            <WinInput
              id="sf-address"
              value={form.address || ''}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </WinField>
          <AddressCapAssistFields
            variant="win"
            value={{ cap: form.cap, city: form.city, province: form.province }}
            onChange={patch => setForm(f => ({ ...f, ...patch }))}
          />
          <WinField label="Nazione" htmlFor="sf-nation">
            <WinSelect
              id="sf-nation"
              value={form.nation || 'Italia'}
              onChange={e => setForm(f => ({ ...f, nation: e.target.value }))}
            >
              <option value="Italia">Italia</option>
              <option value="San Marino">San Marino</option>
              <option value="Svizzera">Svizzera</option>
            </WinSelect>
          </WinField>

          <p className="oc-anagrafica-section">Contatti</p>
          <WinField label="Referente" htmlFor="sf-ref">
            <WinInput
              id="sf-ref"
              value={form.contactPerson || ''}
              onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))}
            />
          </WinField>
          <div className="oc-selezione-cliente__row2">
            <WinField label="Telefono" htmlFor="sf-phone">
              <WinInput
                id="sf-phone"
                value={form.phone || ''}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </WinField>
            <WinField label="Cellulare" htmlFor="sf-cell">
              <WinInput
                id="sf-cell"
                value={form.cellPhone || ''}
                onChange={e => setForm(f => ({ ...f, cellPhone: e.target.value }))}
              />
            </WinField>
          </div>
          <WinField label="Fax" htmlFor="sf-fax">
            <WinInput id="sf-fax" value={form.fax || ''} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} />
          </WinField>
          <WinField label="Email" htmlFor="sf-email">
            <WinInput
              id="sf-email"
              value={form.email || ''}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </WinField>
          <WinField label="PEC" htmlFor="sf-pec">
            <WinInput id="sf-pec" value={form.pec || ''} onChange={e => setForm(f => ({ ...f, pec: e.target.value }))} />
          </WinField>

          <p className="oc-anagrafica-section">Dati commerciali</p>
          <WinField label="Condizioni pagamento" htmlFor="sf-terms">
            <WinInput
              id="sf-terms"
              value={form.paymentTerms || ''}
              onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
              placeholder="Es: 30 gg fine mese"
            />
          </WinField>
          <WinField label="Banca" htmlFor="sf-bank">
            <WinInput
              id="sf-bank"
              value={form.bankName || ''}
              onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
            />
          </WinField>
          <WinField label="IBAN" htmlFor="sf-iban">
            <WinInput
              id="sf-iban"
              value={form.bankIban || ''}
              onChange={e => setForm(f => ({ ...f, bankIban: e.target.value }))}
            />
          </WinField>
          <WinField label="Note" htmlFor="sf-notes">
            <WinTextarea
              id="sf-notes"
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </WinField>
        </div>

        <div className="vb-dialog__footer oc-selezione-cliente__footer">
          <WinButton onClick={() => void handleSave()} disabled={saving || !form.name}>
            {saving ? 'Salvataggio…' : editing ? 'Aggiorna' : 'OK'}
          </WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
        </div>
      </div>
    </div>
  )
}
