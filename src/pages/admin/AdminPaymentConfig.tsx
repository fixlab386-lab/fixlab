import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { DEFAULT_PAYMENT_CONFIG } from '../../lib/subscription'
import type { PaymentConfig } from '../../types'

export default function AdminPaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void getDoc(doc(db, 'config', 'payment')).then(snap => {
      if (snap.exists()) {
        setConfig({ ...DEFAULT_PAYMENT_CONFIG, ...(snap.data() as PaymentConfig) })
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await setDoc(doc(db, 'config', 'payment'), config, { merge: true })
      setMessage('Configurazione salvata.')
    } catch {
      setMessage('Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof PaymentConfig, label: string, type: 'text' | 'number' = 'text') => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '13px', color: '#71717a' }}>{label}</span>
      <input
        type={type}
        value={config[key]}
        onChange={e =>
          setConfig(prev => ({
            ...prev,
            [key]: type === 'number' ? Number(e.target.value) : e.target.value,
          }))
        }
        style={{
          padding: '10px 12px',
          background: '#09090b',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
          color: '#fafafa',
          fontSize: '14px',
        }}
      />
    </label>
  )

  if (loading) {
    return <div style={{ color: '#71717a' }}>Caricamento...</div>
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: '24px' }}>Configurazione pagamenti</h1>
      <p style={{ margin: '0 0 24px', color: '#71717a', fontSize: '14px' }}>
        Dati mostrati ai clienti nella pagina abbonamento e nella schermata di blocco.
      </p>

      <div
        style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          maxWidth: '800px',
        }}
      >
        {field('iban', 'IBAN')}
        {field('ibanHolder', 'Intestatario IBAN')}
        {field('bankName', 'Nome banca')}
        {field('paypalLink', 'Link PayPal')}
        {field('satispayId', 'Satispay ID / username')}
        {field('whatsappNumber', 'WhatsApp (con prefisso, es. +39333...)')}
        {field('supportEmail', 'Email supporto')}
        {field('trialDays', 'Giorni trial', 'number')}
        {field('monthlyPrice', 'Prezzo mensile (€)', 'number')}
        {field('yearlyPrice', 'Prezzo annuale (€)', 'number')}
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          style={{
            padding: '12px 24px',
            background: '#7c3aed',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {saving ? 'Salvataggio...' : 'Salva configurazione'}
        </button>
        {message && <span style={{ color: message.includes('Errore') ? '#fca5a5' : '#86efac' }}>{message}</span>}
      </div>
    </div>
  )
}
