import { useEffect, useState } from 'react'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  callDeleteStudioComplete,
  callExtendSubscription,
  callImpersonateUser,
  callUpdateStudioSubscription,
  type StudioAdminSummary,
} from '../../lib/adminApi'
import { formatCallableError } from '../../lib/cloudFunctions'
import {
  formatEuro,
  resolveSubscriptionState,
  subscriptionStatusEmoji,
  subscriptionStatusLabel,
  todayYmd,
} from '../../lib/subscription'
import { setImpersonationStudioName } from '../../components/ImpersonationBanner'
import type { AdminNote, Studio, Subscription } from '../../types'

type TabId = 'info' | 'subscription' | 'support' | 'danger'

type Props = {
  studio: StudioAdminSummary
  onClose: () => void
  onUpdated: () => void
}

export default function StudioDetail({ studio, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<TabId>('info')
  const [studioDoc, setStudioDoc] = useState<Studio | null>(null)
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [extendMonths, setExtendMonths] = useState(12)
  const [extendAmount, setExtendAmount] = useState(studio.subscription?.yearlyPrice ?? 200)
  const [extendMethod, setExtendMethod] = useState<Subscription['paymentMethod']>('bonifico')
  const [newPlan, setNewPlan] = useState<Subscription['plan']>(studio.subscription?.plan ?? 'starter')

  const [noteType, setNoteType] = useState<AdminNote['type']>('support')
  const [noteMessage, setNoteMessage] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteProgress, setDeleteProgress] = useState('')

  useEffect(() => {
    void getDoc(doc(db, 'studios', studio.id)).then(snap => {
      if (snap.exists()) setStudioDoc({ id: snap.id, ...snap.data() } as Studio)
    })
    void loadNotes()
  }, [studio.id])

  const loadNotes = async () => {
    const q = query(collection(db, 'adminNotes'), where('studioId', '==', studio.id))
    const snap = await getDocs(q)
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminNote))
    list.sort((a, b) => {
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return tb - ta
    })
    setNotes(list)
  }

  const subState = resolveSubscriptionState(studio.subscription, todayYmd())

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  }

  const panelStyle: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      style={{
        padding: '10px 16px',
        background: tab === id ? '#7c3aed' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: tab === id ? '#fff' : '#a1a1aa',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: tab === id ? 600 : 400,
      }}
    >
      {label}
    </button>
  )

  const handleExtend = async () => {
    setBusy('extend')
    setError('')
    try {
      await callExtendSubscription({
        studioId: studio.id,
        months: extendMonths,
        paymentAmount: extendAmount,
        paymentMethod: extendMethod,
      })
      setSuccess('Abbonamento esteso con successo.')
      onUpdated()
    } catch (err) {
      setError(formatCallableError(err, 'Estensione non riuscita.'))
    } finally {
      setBusy('')
    }
  }

  const handleStatusChange = async (status: Subscription['status']) => {
    setBusy('status')
    setError('')
    try {
      await callUpdateStudioSubscription(studio.id, { status })
      setSuccess(`Stato aggiornato: ${status}`)
      onUpdated()
    } catch (err) {
      setError(formatCallableError(err, 'Aggiornamento non riuscito.'))
    } finally {
      setBusy('')
    }
  }

  const handlePlanChange = async () => {
    setBusy('plan')
    setError('')
    try {
      await callUpdateStudioSubscription(studio.id, { plan: newPlan })
      setSuccess(`Piano aggiornato: ${newPlan}`)
      onUpdated()
    } catch (err) {
      setError(formatCallableError(err, 'Cambio piano non riuscito.'))
    } finally {
      setBusy('')
    }
  }

  const handleImpersonate = async () => {
    setBusy('impersonate')
    setError('')
    setSuccess('')

    // Apri subito (sincrono col click) — altrimenti i browser bloccano il popup dopo l'await.
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      setError('Il browser ha bloccato la finestra. Consenti i popup per questo sito e riprova.')
      setBusy('')
      return
    }
    popup.document.title = 'Impersonazione FIXLab'
    popup.document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:24px;color:#52525b">Accesso in corso...</p>'

    try {
      const { token } = await callImpersonateUser(studio.ownerId)
      setImpersonationStudioName(studio.name)
      const qs = `token=${encodeURIComponent(token)}&studio=${encodeURIComponent(studio.name)}`
      const isHashRouter = window.location.hash.startsWith('#/') || window.fixlabDesktop?.isElectron === true
      const url = isHashRouter
        ? `${window.location.origin}${window.location.pathname}#/impersonate?${qs}`
        : `${window.location.origin}/impersonate?${qs}`
      popup.location.href = url
      popup.focus()
      setSuccess('Finestra impersonazione aperta.')
    } catch (err) {
      popup.close()
      setError(formatCallableError(err, 'Impersonazione non riuscita.'))
    } finally {
      setBusy('')
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'ELIMINA') {
      setError('Scrivi ELIMINA per confermare.')
      return
    }
    setBusy('delete')
    setError('')
    setDeleteProgress('Eliminazione in corso...')
    try {
      const res = await callDeleteStudioComplete(studio.id)
      setDeleteProgress(`Completato. Documenti eliminati: ${JSON.stringify(res.deletedCounts)}`)
      setSuccess('Studio eliminato completamente.')
      onUpdated()
      setTimeout(onClose, 2000)
    } catch (err) {
      setError(formatCallableError(err, 'Eliminazione non riuscita.'))
      setDeleteProgress('')
    } finally {
      setBusy('')
    }
  }

  const handleAddNote = async () => {
    if (!noteMessage.trim()) return
    setBusy('note')
    try {
      await addDoc(collection(db, 'adminNotes'), {
        studioId: studio.id,
        studioName: studio.name,
        message: noteMessage.trim(),
        type: noteType,
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setNoteMessage('')
      await loadNotes()
      setSuccess('Ticket creato.')
    } catch (err) {
      setError(formatCallableError(err, 'Creazione ticket non riuscita.'))
    } finally {
      setBusy('')
    }
  }

  const resolveNote = async (noteId: string) => {
    await updateDoc(doc(db, 'adminNotes', noteId), {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
    })
    await loadNotes()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{studio.name}</h2>
            <div style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>{studio.email}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '12px 24px', display: 'flex', gap: '8px', borderBottom: '1px solid #27272a', flexWrap: 'wrap' }}>
          {tabBtn('info', 'Info studio')}
          {tabBtn('subscription', 'Abbonamento')}
          {tabBtn('support', 'Supporto')}
          {tabBtn('danger', 'Azioni pericolose')}
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '14px', lineHeight: 1.6 }}>
          {error && <div style={{ padding: '10px', background: '#450a0a', borderRadius: '8px', marginBottom: '12px', color: '#fca5a5' }}>{error}</div>}
          {success && <div style={{ padding: '10px', background: '#14532d', borderRadius: '8px', marginBottom: '12px', color: '#86efac' }}>{success}</div>}

          {tab === 'info' && (
            <div>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px' }}>
                <dt style={{ color: '#71717a' }}>P.IVA</dt><dd style={{ margin: 0 }}>{studioDoc?.vatNumber || '—'}</dd>
                <dt style={{ color: '#71717a' }}>Telefono</dt><dd style={{ margin: 0 }}>{studioDoc?.phone || studioDoc?.cellPhone || '—'}</dd>
                <dt style={{ color: '#71717a' }}>Indirizzo</dt><dd style={{ margin: 0 }}>{[studioDoc?.address, studioDoc?.city, studioDoc?.cap].filter(Boolean).join(', ') || '—'}</dd>
                <dt style={{ color: '#71717a' }}>Registrazione</dt><dd style={{ margin: 0 }}>{studio.createdAt ? new Date(studio.createdAt).toLocaleDateString('it-IT') : '—'}</dd>
                <dt style={{ color: '#71717a' }}>Ultimo accesso</dt><dd style={{ margin: 0 }}>{studio.lastLoginAt ? new Date(studio.lastLoginAt).toLocaleString('it-IT') : '—'}</dd>
                <dt style={{ color: '#71717a' }}>Owner UID</dt><dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px' }}>{studio.ownerId}</dd>
              </dl>
              <h3 style={{ margin: '20px 0 12px', fontSize: '15px' }}>Conteggi</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  ['Prodotti', studio.counts.products],
                  ['Clienti', studio.counts.clients],
                  ['Fornitori', studio.counts.suppliers],
                  ['Documenti', studio.counts.documents],
                  ['Riparazioni', studio.counts.repairs],
                  ['Pagamenti', studio.counts.payments],
                ].map(([label, count]) => (
                  <div key={String(label)} style={{ background: '#09090b', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#71717a' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'subscription' && (
            <div>
              {studio.subscription ? (
                <>
                  <p>
                    {subscriptionStatusEmoji(subState?.effectiveStatus ?? studio.subscription.status)}{' '}
                    <strong>{subscriptionStatusLabel(subState?.effectiveStatus ?? studio.subscription.status)}</strong>
                    {' · '}Piano: <strong>{studio.subscription.plan}</strong>
                  </p>
                  <dl style={{ margin: '0 0 20px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px' }}>
                    <dt style={{ color: '#71717a' }}>Inizio</dt><dd style={{ margin: 0 }}>{studio.subscription.startDate}</dd>
                    <dt style={{ color: '#71717a' }}>Scadenza</dt><dd style={{ margin: 0 }}>{studio.subscription.expiryDate}</dd>
                    <dt style={{ color: '#71717a' }}>Giorni rimanenti</dt><dd style={{ margin: 0 }}>{subState?.daysLeft ?? '—'}</dd>
                    <dt style={{ color: '#71717a' }}>Ultimo pagamento</dt><dd style={{ margin: 0 }}>
                      {studio.subscription.lastPaymentDate
                        ? `${studio.subscription.lastPaymentDate} — ${formatEuro(studio.subscription.lastPaymentAmount ?? 0)}`
                        : '—'}
                    </dd>
                  </dl>
                </>
              ) : (
                <p style={{ color: '#71717a' }}>Nessun abbonamento configurato.</p>
              )}

              <h3 style={{ fontSize: '15px', margin: '0 0 12px' }}>Estendi abbonamento</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[1, 3, 6, 12].map(m => (
                  <button key={m} type="button" onClick={() => setExtendMonths(m)} style={{ padding: '8px 14px', background: extendMonths === m ? '#7c3aed' : '#27272a', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    {m} {m === 1 ? 'mese' : 'mesi'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>Importo ricevuto (€)</span>
                  <input type="number" value={extendAmount} onChange={e => setExtendAmount(Number(e.target.value))} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>Metodo pagamento</span>
                  <select value={extendMethod} onChange={e => setExtendMethod(e.target.value as Subscription['paymentMethod'])} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff' }}>
                    <option value="bonifico">Bonifico</option>
                    <option value="paypal">PayPal</option>
                    <option value="satispay">Satispay</option>
                    <option value="altro">Altro</option>
                  </select>
                </label>
              </div>
              <button type="button" disabled={busy === 'extend'} onClick={() => void handleExtend()} style={{ padding: '10px 20px', background: '#7c3aed', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', marginBottom: '20px' }}>
                Estendi abbonamento
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <button type="button" disabled={!!busy} onClick={() => void handleStatusChange('suspended')} style={{ padding: '8px 14px', background: '#27272a', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Sospendi</button>
                <button type="button" disabled={!!busy} onClick={() => void handleStatusChange('active')} style={{ padding: '8px 14px', background: '#16a34a', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Riattiva</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={newPlan} onChange={e => setNewPlan(e.target.value as Subscription['plan'])} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff' }}>
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                </select>
                <button type="button" disabled={busy === 'plan'} onClick={() => void handlePlanChange()} style={{ padding: '8px 14px', background: '#27272a', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Cambia piano</button>
              </div>
            </div>
          )}

          {tab === 'support' && (
            <div>
              <h3 style={{ fontSize: '15px', margin: '0 0 12px' }}>Nuovo ticket</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <select value={noteType} onChange={e => setNoteType(e.target.value as AdminNote['type'])} style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff' }}>
                  <option value="bug">Bug</option>
                  <option value="support">Supporto</option>
                  <option value="payment">Pagamento</option>
                  <option value="feature_request">Feature request</option>
                  <option value="general">Generale</option>
                </select>
                <textarea value={noteMessage} onChange={e => setNoteMessage(e.target.value)} rows={3} placeholder="Messaggio..." style={{ padding: '8px', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', resize: 'vertical' }} />
                <button type="button" disabled={busy === 'note'} onClick={() => void handleAddNote()} style={{ alignSelf: 'flex-start', padding: '8px 16px', background: '#7c3aed', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Crea ticket</button>
              </div>

              <h3 style={{ fontSize: '15px', margin: '0 0 12px' }}>Cronologia</h3>
              {notes.length === 0 ? (
                <p style={{ color: '#71717a' }}>Nessun ticket.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notes.map(n => (
                    <li key={n.id} style={{ background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#a78bfa' }}>{n.type} · {n.status}</span>
                        {n.status !== 'resolved' && (
                          <button type="button" onClick={() => void resolveNote(n.id)} style={{ fontSize: '11px', padding: '2px 8px', background: '#27272a', border: 'none', borderRadius: '4px', color: '#86efac', cursor: 'pointer' }}>Risolvi</button>
                        )}
                      </div>
                      <div>{n.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'danger' && (
            <div>
              <div style={{ marginBottom: '24px', padding: '16px', background: '#1e1b4b', borderRadius: '8px', border: '1px solid #4338ca' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>🔑 Impersona utente</h3>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#a1a1aa' }}>
                  Apre una nuova finestra con la sessione del cliente. La sessione admin resta intatta.
                </p>
                <button type="button" disabled={busy === 'impersonate'} onClick={() => void handleImpersonate()} style={{ padding: '10px 20px', background: '#4338ca', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                  Impersona utente
                </button>
              </div>

              <div style={{ padding: '16px', background: '#450a0a', borderRadius: '8px', border: '1px solid #991b1b' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: '#fca5a5' }}>🗑️ Elimina studio completo</h3>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#fecaca' }}>
                  IRREVERSIBILE: elimina tutti i documenti Firestore, file Storage, utente Auth e lo studio.
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder='Scrivi "ELIMINA" per confermare'
                  style={{ width: '100%', padding: '10px', marginBottom: '12px', background: '#09090b', border: '1px solid #991b1b', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
                {deleteProgress && <p style={{ fontSize: '12px', color: '#fcd34d' }}>{deleteProgress}</p>}
                <button type="button" disabled={busy === 'delete'} onClick={() => void handleDelete()} style={{ padding: '10px 20px', background: '#dc2626', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  Elimina studio completo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
