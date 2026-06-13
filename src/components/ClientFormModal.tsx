import { useState, useEffect } from 'react'
import { addClient, updateClient, getNextClientCode } from '../lib/firestore'
import type { Client } from '../types'
import { FiscalCodeAssistField, AddressCapAssistFields } from './anagrafica/assist'
import '../theme/gestionale-dialog.css'

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

  const inp: React.CSSProperties = {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
    borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = { fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'rgba(0,0,0,0.5)', position: 'absolute', inset: 0 }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '520px', maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
        borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{editing ? '✏️ Modifica cliente' : '👤 Nuovo cliente'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>×</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Codice + Nome */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '8px' }}>
              <div><div style={lbl}>Codice</div><input style={{ ...inp, background: 'var(--bg-primary)' }} value={form.code} readOnly /></div>
              <div><div style={lbl}>Nome *</div><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mario Rossi" /></div>
            </div>

            {/* Tipo */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.type === 'client' || form.type === 'both'} onChange={() => {
                  setForm(f => ({ ...f, type: f.type === 'both' ? 'supplier' : f.type === 'client' ? 'client' : 'both' }))
                }} style={{ accentColor: 'var(--accent)' }} /> Cliente
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.type === 'supplier' || form.type === 'both'} onChange={() => {
                  setForm(f => ({ ...f, type: f.type === 'both' ? 'client' : f.type === 'supplier' ? 'supplier' : 'both' }))
                }} style={{ accentColor: 'var(--accent)' }} /> Fornitore
              </label>
            </div>

            {/* P.IVA + CF */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><div style={lbl}>P. IVA</div><input style={inp} value={form.vatNumber || ''} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} /></div>
              <FiscalCodeAssistField
                value={form.fiscalCode || ''}
                onChange={fiscalCode => setForm(f => ({ ...f, fiscalCode }))}
                inp={inp}
                lbl={lbl}
              />
            </div>

            {/* Sede */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>Sede</div>
            <div><div style={lbl}>Indirizzo</div><input style={inp} value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <AddressCapAssistFields
              value={{ cap: form.cap, city: form.city, province: form.province }}
              onChange={patch => setForm(f => ({ ...f, ...patch }))}
              inp={inp}
              lbl={lbl}
            />

            {/* Contatti */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>Contatti</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div><div style={lbl}>Telefono</div><input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="333 1234567" /></div>
              <div><div style={lbl}>Cellulare</div><input style={inp} value={form.cellPhone || ''} onChange={e => setForm(f => ({ ...f, cellPhone: e.target.value }))} /></div>
            </div>
            <div><div style={lbl}>Email</div><input style={inp} value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mario@email.com" /></div>
            <div><div style={lbl}>PEC</div><input style={inp} value={form.pec || ''} onChange={e => setForm(f => ({ ...f, pec: e.target.value }))} /></div>
            <div><div style={lbl}>Referente</div><input style={inp} value={form.contactPerson || ''} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>

            {/* Commerciale */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '6px' }}>Commerciale</div>
            <div><div style={lbl}>Listino prezzi</div>
              <select style={inp} value={form.priceList} onChange={e => setForm(f => ({ ...f, priceList: e.target.value as any }))}>
                <option value="privati">Privati</option><option value="aziende">Aziende</option>
                <option value="convenzionati">Convenzionati</option><option value="vip">VIP</option>
              </select>
            </div>
            <div><div style={lbl}>Modalità pagamento</div><input style={inp} value={form.paymentMethod || ''} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} placeholder="Es: Contanti, Bonifico 30gg..." /></div>
            <div><div style={lbl}>Note</div><textarea style={{ ...inp, minHeight: '50px', resize: 'vertical' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving || !form.name} style={{
            flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--accent-text)',
            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.name ? 0.5 : 1
          }}>
            {saving ? '⏳ Salvataggio...' : editing ? 'Aggiorna cliente' : '✅ Salva cliente'}
          </button>
          <button onClick={onClose} style={{
            padding: '10px 18px', background: 'transparent', border: '1px solid var(--border-secondary)',
            borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}