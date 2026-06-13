import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from './components/page/PageHeader'
import { ToolButton } from './components/ui'
import { createWhatsAppInstance, getQRCode, WA_INSTANCE } from './services/whatsapp'

type WhatsAppConnectionPanelProps = {
  /** Stile compatto per incorporamento nel tab Impostazioni */
  compact?: boolean
}

export function WhatsAppConnectionPanel({ compact = false }: WhatsAppConnectionPanelProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      await createWhatsAppInstance(WA_INSTANCE)
      await new Promise(resolve => setTimeout(resolve, 2000))
      const qrData = await getQRCode(WA_INSTANCE)

      let qrBase64: string | null = null
      if (qrData?.qrcode?.base64) {
        qrBase64 = qrData.qrcode.base64
      } else if (qrData?.qrcode) {
        qrBase64 = qrData.qrcode
      } else if (qrData?.base64) {
        qrBase64 = qrData.base64
      } else if (typeof qrData === 'string') {
        qrBase64 = qrData
      } else if (qrData?.instance?.qrcode?.base64) {
        qrBase64 = qrData.instance.qrcode.base64
      }

      if (qrBase64) {
        const dataUrl = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`
        setQrCode(dataUrl)
      } else {
        setError('Il server non ha restituito un QR Code. Riprova.')
      }
    } catch (err) {
      setError('Errore di connessione al server Railway.')
      console.error('Errore WhatsApp setup:', err)
    }
    setLoading(false)
  }

  return (
    <div
      className={compact ? 'gestionale-settings-panel' : undefined}
      style={compact ? { textAlign: 'center' } : {
        padding: '32px 28px',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {error ? (
        <div className={compact ? 'gestionale-settings-info-box gestionale-settings-info-box--danger' : undefined} style={compact ? { marginBottom: 12, textAlign: 'left' } : {
          color: 'var(--danger)',
          marginBottom: '16px',
          fontSize: '13px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
        }}>
          {error}
        </div>
      ) : null}

      {!qrCode ? (
        compact ? (
          <ToolButton
            label={loading ? 'Generazione in corso…' : 'Genera QR code'}
            onClick={handleConnect}
            disabled={loading}
          />
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="fixlab-btn fixlab-btn--primary"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Generazione in corso…' : 'Genera QR code'}
          </button>
        )
      ) : (
        <div>
          <div style={{
            background: 'white',
            padding: '15px',
            display: 'inline-block',
            borderRadius: '10px',
            marginBottom: '20px',
          }}>
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              style={{ display: 'block', width: compact ? '200px' : '250px', height: compact ? '200px' : '250px' }}
            />
          </div>
          <p style={{ color: compact ? 'var(--gestionale-link)' : 'var(--accent)', fontWeight: 600, marginBottom: '6px', fontSize: compact ? 12 : 14 }}>
            QR code pronto
          </p>
          <p style={{ color: compact ? 'var(--gestionale-text-muted)' : 'var(--text-secondary)', fontSize: compact ? 11 : 13 }}>
            Apri WhatsApp → Impostazioni → Dispositivi collegati → Collega un dispositivo
          </p>
          {compact ? (
            <ToolButton label="Annulla e riprova" onClick={() => setQrCode(null)} style={{ marginTop: 12 }} />
          ) : (
            <button
              type="button"
              onClick={() => setQrCode(null)}
              className="fixlab-btn fixlab-btn--secondary"
              style={{ marginTop: '16px', fontSize: '13px' }}
            >
              Annulla e riprova
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function WhatsAppSetup() {
  return (
    <div data-tutorial="page-whatsapp" style={{ maxWidth: '560px', margin: '0 auto', padding: '8px 0 32px' }}>
      <PageHeader
        title="Collegamento WhatsApp"
        subtitle="Serve per inviare «riparazione pronta» dalla scheda ticket. Genera il QR, aprilo da WhatsApp sul telefono del laboratorio (Dispositivi collegati → Collega), poi attendi la connessione."
        actions={
          <Link to="/impostazioni" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            ← Impostazioni
          </Link>
        }
      />
      <WhatsAppConnectionPanel />
    </div>
  )
}
