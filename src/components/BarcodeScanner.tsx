import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('barcode-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (code) => {
        scanner.stop().then(() => { setScanning(false); onScan(code) })
      },
      () => {}
    ).then(() => { setScanning(true) }).catch(() => {
      setError('Impossibile accedere alla fotocamera — controlla i permessi')
    })

    return () => { scanner.stop().catch(() => {}) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '20px'
    }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px', border: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>📷 Scanner codice a barre</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Inquadra il codice a barre del prodotto</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {error ? (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '16px', textAlign: 'center', color: 'var(--danger)', fontSize: '13px' }}>
            {error}
          </div>
        ) : (
          <>
            <div style={{ borderRadius: '10px', overflow: 'hidden', position: 'relative', background: '#000' }}>
              <div id="barcode-reader" style={{ width: '100%' }} />
              {scanning && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '250px', height: '150px', border: '2px solid var(--accent)', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                </div>
              )}
            </div>
            <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {scanning ? '🟢 Scanner attivo — inquadra il codice' : '⏳ Avvio fotocamera...'}
            </div>
          </>
        )}

        <button onClick={onClose} style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'transparent', border: '1px solid var(--border-primary)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
          Annulla
        </button>
      </div>
    </div>
  )
}