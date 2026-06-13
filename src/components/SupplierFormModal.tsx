import { useEffect, useState } from 'react'
import { addSupplier, updateSupplier, getNextSupplierCode } from '../lib/firestore'
import type { Supplier } from '../types'
import { FiscalCodeAssistField, AddressCapAssistFields } from './anagrafica/assist'
import '../theme/gestionale-dialog.css'

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

  const inp: React.CSSProperties = {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={{ background: 'rgba(0,0,0,0.5)', position: 'absolute', inset: 0 }} onClick={onClose} />
      <div
        style={{
          position: 'relative',
          width: '520px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            {editing ? '✏️ Modifica fornitore' : '🏭 Nuovo fornitore'}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '8px' }}>
              <div>
                <div style={lbl}>Codice</div>
                <input style={{ ...inp, background: 'var(--bg-primary)' }} value={form.code} readOnly />
              </div>
              <div>
                <div style={lbl}>Denominazione *</div>
                <input
                  style={inp}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome fornitore"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={lbl}>P. IVA</div>
                <input style={inp} value={form.vatNumber} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} />
              </div>
              <FiscalCodeAssistField
                value={form.fiscalCode}
                onChange={fiscalCode => setForm(f => ({ ...f, fiscalCode }))}
                inp={inp}
                lbl={lbl}
              />
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>
              Sede operativa
            </div>
            <div>
              <div style={lbl}>Indirizzo</div>
              <input style={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <AddressCapAssistFields
              value={{ cap: form.cap, city: form.city, province: form.province }}
              onChange={patch => setForm(f => ({ ...f, ...patch }))}
              inp={inp}
              lbl={lbl}
            />
            <div>
              <div style={lbl}>Nazione</div>
              <input style={inp} value={form.nation} onChange={e => setForm(f => ({ ...f, nation: e.target.value }))} />
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>Contatti</div>
            <div>
              <div style={lbl}>Referente</div>
              <input style={inp} value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={lbl}>Telefono</div>
                <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <div style={lbl}>Cellulare</div>
                <input style={inp} value={form.cellPhone} onChange={e => setForm(f => ({ ...f, cellPhone: e.target.value }))} />
              </div>
            </div>
            <div>
              <div style={lbl}>Fax</div>
              <input style={inp} value={form.fax} onChange={e => setForm(f => ({ ...f, fax: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>Email</div>
              <input style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>PEC</div>
              <input style={inp} value={form.pec} onChange={e => setForm(f => ({ ...f, pec: e.target.value }))} />
            </div>

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>
              Dati commerciali
            </div>
            <div>
              <div style={lbl}>Condizioni pagamento</div>
              <input
                style={inp}
                value={form.paymentTerms}
                onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="Es: 30 gg fine mese"
              />
            </div>
            <div>
              <div style={lbl}>Banca</div>
              <input style={inp} value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>IBAN</div>
              <input style={inp} value={form.bankIban} onChange={e => setForm(f => ({ ...f, bankIban: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>Note</div>
              <textarea
                style={{ ...inp, minHeight: '50px', resize: 'vertical' }}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            style={{
              flex: 1,
              padding: '10px',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: saving || !form.name ? 0.5 : 1,
            }}
          >
            {saving ? '⏳ Salvataggio...' : editing ? 'Aggiorna fornitore' : '✅ Salva fornitore'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: '1px solid var(--border-secondary)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
