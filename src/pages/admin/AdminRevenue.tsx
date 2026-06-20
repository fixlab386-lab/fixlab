import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatEuro } from '../../lib/subscription'

type PaymentRow = {
  id: string
  studioId: string
  studioName: string
  amount: number
  paymentMethod: string
  months: number
  paidAt: string
}

export default function AdminRevenue() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'subscriptionPayments'), orderBy('paidAt', 'desc')))
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRow)))
      } catch {
        const snap = await getDocs(collection(db, 'subscriptionPayments'))
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRow)))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const year = new Date().getFullYear()
  const yearTotal = useMemo(
    () =>
      payments
        .filter(p => p.paidAt?.startsWith(String(year)))
        .reduce((sum, p) => sum + (p.amount ?? 0), 0),
    [payments, year],
  )

  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      const month = p.paidAt?.slice(0, 7)
      if (!month) continue
      map.set(month, (map.get(month) ?? 0) + (p.amount ?? 0))
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  }, [payments])

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: '24px' }}>Revenue</h1>
      <p style={{ margin: '0 0 24px', color: '#71717a', fontSize: '14px' }}>
        Pagamenti abbonamento registrati dal pannello admin
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#71717a' }}>Incassato {year}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#a78bfa' }}>{formatEuro(yearTotal)}</div>
        </div>
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#71717a' }}>Pagamenti totali</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{payments.length}</div>
        </div>
      </div>

      {byMonth.length > 0 && (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>Revenue mensile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {byMonth.map(([month, total]) => (
              <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '80px', fontSize: '13px', color: '#71717a' }}>{month}</span>
                <div style={{ flex: 1, height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (total / Math.max(...byMonth.map(([, t]) => t), 1)) * 100)}%`,
                      background: '#7c3aed',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <span style={{ width: '90px', textAlign: 'right', fontSize: '13px' }}>{formatEuro(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>Caricamento...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#09090b' }}>
                {['Data', 'Studio', 'Importo', 'Metodo', 'Mesi'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#71717a', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #27272a' }}>
                  <td style={{ padding: '12px 14px' }}>{p.paidAt}</td>
                  <td style={{ padding: '12px 14px' }}>{p.studioName}</td>
                  <td style={{ padding: '12px 14px', color: '#a78bfa' }}>{formatEuro(p.amount ?? 0)}</td>
                  <td style={{ padding: '12px 14px' }}>{p.paymentMethod}</td>
                  <td style={{ padding: '12px 14px' }}>{p.months}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && payments.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>Nessun pagamento registrato.</div>
        )}
      </div>
    </div>
  )
}
