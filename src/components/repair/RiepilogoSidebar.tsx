import type { Repair, RepairProduct } from '../../types'

interface Props {
  form: Partial<Repair>
  selected: RepairProduct[]
  totalProducts: number
  totalCost: number
  preCompleted: number
  preTot: number
  postCompleted: number
  postTot: number
  saving: boolean
  isEdit: boolean
  onSave: () => void
  onRemoveProduct: (id: string) => void
  onWhatsApp?: () => void
}

const statusOptions = [
  { value: 'waiting', label: 'In attesa', color: 'var(--text-secondary)' },
  { value: 'accepted', label: 'Accettata', color: 'var(--info)' },
  { value: 'in_progress', label: 'In lavorazione', color: 'var(--warning)' },
  { value: 'ready', label: 'Pronta', color: 'var(--purple)' },
  { value: 'completed', label: 'Consegnata', color: 'var(--accent)' },
  { value: 'on_hold', label: 'In sospeso', color: 'var(--danger)' },
]

export default function RiepilogoSidebar({ form, selected, totalProducts, totalCost, preCompleted, preTot, postCompleted, postTot, saving, isEdit, onSave, onRemoveProduct, onWhatsApp }: Props) {
  const currentStatus = statusOptions.find(o => o.value === form.status)

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Riepilogo</div>

      <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>CLIENTE</div>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>{form.clientName || '—'}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{form.clientPhone}</div>
      </div>

      <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>DISPOSITIVO</div>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>
          {form.deviceBrand} {form.deviceModel || '—'} {form.deviceColor ? `— ${form.deviceColor}` : ''}
        </div>
        {form.imei && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>IMEI: {form.imei}</div>}
      </div>

      <div style={{ marginBottom: '10px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>PRE</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: preCompleted === preTot && preTot > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
            {preCompleted}/{preTot}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>POST</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: postCompleted === postTot && postTot > 0 ? 'var(--purple)' : 'var(--text-secondary)' }}>
            {postCompleted}/{postTot}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>PRODOTTI</div>
        {selected.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '6px 0' }}>Nessun prodotto aggiunto</div>}
        {selected.map(p => (
          <div key={p.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--bg-tertiary)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 500 }}>{p.name} {p.qty > 1 ? `×${p.qty}` : ''}</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginRight: '6px' }}>€ {(p.price * p.qty).toFixed(2)}</span>
            <button onClick={() => onRemoveProduct(p.productId)} style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-secondary)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
          <span>Prodotti</span><span>€ {totalProducts.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          <span>Manodopera</span><span>€ {(form.laborCost || 0).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
          <span>Totale</span><span style={{ color: 'var(--accent)' }}>€ {totalCost.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Stato</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: currentStatus?.color }}>{currentStatus?.label}</span>
      </div>

      <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Garanzia</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
          {form.warrantyDays === 0 ? 'Nessuna' : `${form.warrantyDays} giorni`}
        </span>
      </div>

      {form.status === 'ready' && form.clientPhone && onWhatsApp && (
        <button onClick={onWhatsApp} style={{
          width: '100%', padding: '11px', marginBottom: '8px',
          background: 'var(--whatsapp-bg)', color: 'var(--whatsapp)',
          border: '1px solid var(--whatsapp-border)',
          borderRadius: '8px', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}>
          💬 Invia WhatsApp al cliente
        </button>
      )}

      <button onClick={onSave} disabled={saving} style={{
        width: '100%', padding: '12px', background: 'var(--accent)',
        color: 'var(--accent-text)', border: 'none', borderRadius: '8px',
        fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
      }}>
        {saving ? 'Salvo...' : isEdit ? 'Aggiorna scheda' : 'Salva scheda'}
      </button>
    </div>
  )
}