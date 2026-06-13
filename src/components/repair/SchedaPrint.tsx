import { useEffect, useState } from 'react'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { db } from '../../firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { Repair, RepairProduct } from '../../types'

interface Props {
  form: Partial<Repair>
  selected: RepairProduct[]
  totalCost: number
  repairId?: string
}

interface StudioData {
  name?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  website?: string
  vatNumber?: string
  fiscalCode?: string
  logoUrl?: string
  warrantyText?: string
  footerText?: string
}

export default function SchedaPrint({ form, selected, totalCost, repairId }: Props) {
  const { studioId } = useActiveStudio()
  const [studio, setStudio] = useState<StudioData>({})

  useEffect(() => {
    if (!studioId) return
    getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudio(snap.data() as StudioData)
    })
  }, [studioId])

  const labelStyle = { fontSize: '9px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '2px' }
  const valueStyle = { fontSize: '12px', color: '#1a1a1a', fontWeight: 500 }
  const divider = { borderTop: '1px dashed #ddd', margin: '12px 0' }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '20px', border: '1px solid #e0e0e0', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #0D0D0D' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {studio.logoUrl ? (
            <img src={studio.logoUrl} alt="logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
          ) : (
            <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#00E5A0', letterSpacing: '-1px' }}>FL</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0D0D0D', letterSpacing: '-0.5px' }}>{studio.name || 'FIXLab'}</div>
            {studio.address && <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{studio.address}{studio.city ? `, ${studio.city}` : ''}</div>}
            {studio.phone && <div style={{ fontSize: '11px', color: '#666' }}>{studio.phone}</div>}
            {studio.email && <div style={{ fontSize: '11px', color: '#666' }}>{studio.email}</div>}
            {studio.website && <div style={{ fontSize: '11px', color: '#666' }}>{studio.website}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Scheda di presa in carico</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#00E5A0' }}>#{repairId?.slice(-8).toUpperCase()}</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} — {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {studio.vatNumber && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>P.IVA: {studio.vatNumber}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
        <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', borderBottom: '1px solid #e0e0e0', paddingBottom: '6px' }}>Cliente</div>
          <div style={labelStyle}>Nome</div>
          <div style={valueStyle}>{form.clientName || '—'}</div>
          <div style={{ marginTop: '6px' }}>
            <div style={labelStyle}>Telefono</div>
            <div style={valueStyle}>{form.clientPhone || '—'}</div>
          </div>
          {form.clientEmail && (
            <div style={{ marginTop: '6px' }}>
              <div style={labelStyle}>Email</div>
              <div style={valueStyle}>{form.clientEmail}</div>
            </div>
          )}
        </div>

        <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', borderBottom: '1px solid #e0e0e0', paddingBottom: '6px' }}>Dispositivo</div>
          <div style={labelStyle}>Modello</div>
          <div style={valueStyle}>{form.deviceBrand} {form.deviceModel} {form.deviceColor ? `— ${form.deviceColor}` : ''}</div>
          <div style={{ marginTop: '6px' }}>
            <div style={labelStyle}>Tipo</div>
            <div style={valueStyle}>{form.deviceType}</div>
          </div>
          {form.imei && (
            <div style={{ marginTop: '6px' }}>
              <div style={labelStyle}>IMEI</div>
              <div style={valueStyle}>{form.imei}</div>
            </div>
          )}
          {form.deviceCondition && (
            <div style={{ marginTop: '6px' }}>
              <div style={labelStyle}>Stato estetico</div>
              <div style={valueStyle}>{form.deviceCondition}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', borderBottom: '1px solid #e0e0e0', paddingBottom: '6px' }}>Problema riportato</div>
        <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.5' }}>{form.problem || '—'}</div>
        {form.diagnosis && (
          <div style={{ marginTop: '8px' }}>
            <div style={labelStyle}>Diagnosi tecnica</div>
            <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.5' }}>{form.diagnosis}</div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', borderBottom: '1px solid #e0e0e0', paddingBottom: '6px' }}>Ricambi / prodotti</div>
          {selected.map(p => (
            <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #eee', color: '#333' }}>
              <span>{p.name} {p.qty > 1 ? `×${p.qty}` : ''} — {p.model}</span>
              <span style={{ fontWeight: 600 }}>€ {(p.price * p.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', color: '#333' }}>
            <span>Manodopera</span>
            <span style={{ fontWeight: 600 }}>€ {(form.laborCost || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Preventivo', value: `€ ${totalCost.toFixed(2)}`, color: '#00c488' },
          { label: 'Tempo stimato', value: form.estimatedTime || '—', color: '#333' },
          { label: 'Garanzia', value: form.warrantyDays === 0 ? 'Nessuna' : `${form.warrantyDays} giorni`, color: '#333' },
          { label: 'Tecnico', value: form.assignedTo || '—', color: '#333' },
        ].map(item => (
          <div key={item.label} style={{ background: '#f8f8f8', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {form.deadline && (
        <div style={{ background: '#fff3cd', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', border: '1px solid #ffc107' }}>
          <span style={{ fontSize: '12px', color: '#856404', fontWeight: 600 }}>📅 Scadenza prevista: {new Date(form.deadline).toLocaleDateString('it-IT')}</span>
        </div>
      )}

      {form.notes && (
        <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={labelStyle}>Note interne</div>
          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>{form.notes}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '16px', borderTop: '2px solid #0D0D0D', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Firma cliente — accettazione preventivo</div>
          <div style={{ borderBottom: '1px solid #333', width: '100%' }}></div>
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{form.clientName}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '28px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Firma tecnico</div>
          <div style={{ borderBottom: '1px solid #333', width: '100%' }}></div>
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>{form.assignedTo || studio.name}</div>
        </div>
      </div>

      <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
          {studio.warrantyText || 'Garanzia 90 giorni sulla riparazione.'}<br />
          Informativa privacy: i dati raccolti saranno trattati ai sensi del GDPR 679/2016 esclusivamente per la gestione della riparazione.
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '12px', color: '#999', paddingTop: '12px', borderTop: '1px solid #eee' }}>
        {studio.footerText || 'Grazie per aver scelto il nostro servizio!'}
        {studio.website && <span> — {studio.website}</span>}
      </div>

      <button onClick={() => window.print()} style={{
        marginTop: '16px', width: '100%', padding: '10px',
        background: '#0D0D0D', color: '#00E5A0',
        border: 'none', borderRadius: '8px', fontSize: '13px',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
      }}>
        🖨️ Stampa / Salva PDF
      </button>
    </div>
  )
}