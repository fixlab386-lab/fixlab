import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import type { Payment, PaymentResource } from '../../../types'
import { NUMERAZIONI } from '../vendita-banco/constants'
import { WinField, WinInput, WinSelect } from '../vendita-banco/WinControls'
import { formatDataIt, parseDataIt } from '../vendita-banco/utils'
import TabRigheRegistrazione from './tabs/TabRigheRegistrazione'
import {
  PAGAMENTO_DETTAGLIO_TABS,
  SPESE_DESCRIZIONI_PREDEFINITE,
  buildPaymentUpdateFromDettaglio,
  dettaglioTotale,
  pagamentoDettaglioTitle,
  paymentToDettaglioState,
  type PagamentoDettaglioState,
  type PagamentoDettaglioTabId,
} from './paymentDettaglio'
import '../../../theme/gestionale-mdi-window.css'
import '../../../theme/gestionale-document-form.css'
import '../../theme/vendita-al-banco.css'
import '../../theme/pagamenti-section.css'

type Props = {
  payment: Payment
  resources: PaymentResource[]
  studioId: string
  saving: boolean
  saveError: string | null
  onChange: (state: PagamentoDettaglioState) => void
  state: PagamentoDettaglioState
  onSave: () => void
  onClose: () => void
}

export function createDettaglioStateFromPayment(p: Payment, resources: PaymentResource[]): PagamentoDettaglioState {
  return paymentToDettaglioState(p, resources)
}

export default function PagamentoDettaglioModal({
  payment,
  resources,
  studioId: _studioId,
  saving,
  saveError,
  onChange,
  state,
  onSave,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<PagamentoDettaglioTabId>('righe')
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [subjects, setSubjects] = useState<{ id: string; name: string; type: 'client' | 'supplier' }[]>([])

  const title = pagamentoDettaglioTitle(payment)
  const readOnly = state.documentProtected
  const totale = dettaglioTotale(state)
  const subjectLabel = state.subjectType === 'supplier' || payment.amountOut ? 'Fornitore' : 'Cliente'

  useEffect(() => {
    if (!state.subjectId) {
      setSubjects([])
      return
    }
    const col = state.subjectType === 'supplier' ? 'suppliers' : 'clients'
    void getDoc(doc(db, col, state.subjectId)).then(snap => {
      if (!snap.exists()) return
      const data = snap.data()
      const type = state.subjectType === 'supplier' ? ('supplier' as const) : ('client' as const)
      setSubjects([{ id: snap.id, name: String(data.name || ''), type }])
      if (!state.intestatarioIndirizzo && data.address) {
        onChange({
          ...state,
          intestatarioIndirizzo: String(data.address || ''),
          intestatarioCap: String(data.cap || ''),
          intestatarioCitta: String(data.city || ''),
          intestatarioProv: String(data.province || ''),
        })
      }
    })
  }, [state.subjectId, state.subjectType])

  const patch = useCallback(
    (p: Partial<PagamentoDettaglioState>) => onChange({ ...state, ...p }),
    [onChange, state],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        patch({ documentProtected: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [patch])

  const handleClose = () => {
    if (!readOnly) onSave()
    onClose()
  }

  const content = (
  <div className="gestionale-mdi-backdrop pagamenti-dettaglio-backdrop" onClick={e => e.target === e.currentTarget && handleClose()}>
    <div className={`gestionale-mdi-window gestionale-mdi-window--pagamento-dettaglio${minimized ? ' gestionale-mdi-window--minimized' : ''}`} role="dialog">
      <div className="gestionale-mdi-window__titlebar">
        <span className="gestionale-mdi-window__title-icon">💳</span>
        <span className="gestionale-mdi-window__title-text">{title}</span>
        <button type="button" className="gestionale-mdi-window__title-btn" onClick={() => setMinimized(m => !m)} title={minimized ? 'Ripristina' : 'Riduci a icona'}>
          {minimized ? '▢' : '_'}
        </button>
        <button type="button" className="gestionale-mdi-window__title-btn gestionale-mdi-window__title-btn--close" onClick={handleClose} title="Chiudi">
          ✕
        </button>
      </div>

      {!minimized ? (
        <>
          <div className="gestionale-mdi-window__body pagamenti-dettaglio__body">
            <div className="pagamenti-dettaglio__header">
              <WinField label={subjectLabel} htmlFor="pd-soggetto" className="pagamenti-dettaglio__field-soggetto">
                <WinSelect
                  id="pd-soggetto"
                  value={state.subjectId || ''}
                  disabled={readOnly}
                  onChange={e => {
                    const subj = subjects.find(s => s.id === e.target.value)
                    patch({
                      subjectId: e.target.value || undefined,
                      subjectName: subj?.name,
                      subjectType: subj?.type || state.subjectType,
                    })
                  }}
                >
                  <option value="">—</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </WinSelect>
              </WinField>

              <WinField label="Data registraz." htmlFor="pd-data-reg">
                <WinInput
                  id="pd-data-reg"
                  value={formatDataIt(state.registrationDate)}
                  disabled={readOnly}
                  onChange={e => {
                    const iso = parseDataIt(e.target.value)
                    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) patch({ registrationDate: iso })
                  }}
                />
              </WinField>

              <WinField label="Protoc." htmlFor="pd-protoc">
                <WinInput
                  id="pd-protoc"
                  type="number"
                  min={1}
                  className="vb-input--narrow"
                  value={state.protocolNumber}
                  disabled={readOnly}
                  onChange={e => patch({ protocolNumber: parseInt(e.target.value, 10) || 1 })}
                />
              </WinField>

              <WinField label="Numeraz." htmlFor="pd-numeraz">
                <WinSelect id="pd-numeraz" value={state.numbering} disabled={readOnly} onChange={e => patch({ numbering: e.target.value })}>
                  {NUMERAZIONI.map(n => (
                    <option key={n || 'default'} value={n}>
                      {n || '—'}
                    </option>
                  ))}
                </WinSelect>
              </WinField>
            </div>

            <WinField label="Descrizione spesa" htmlFor="pd-desc-spesa" className="pagamenti-dettaglio__desc-spesa">
              <WinSelect
                id="pd-desc-spesa"
                value={state.expenseDescription}
                disabled={readOnly}
                onChange={e => patch({ expenseDescription: e.target.value })}
              >
                <option value="">—</option>
                {SPESE_DESCRIZIONI_PREDEFINITE.map(d => (
                  <option key={d} value={d === 'Altro…' ? state.expenseDescription : d}>
                    {d}
                  </option>
                ))}
              </WinSelect>
            </WinField>

            {readOnly ? (
              <div className="pagamenti-dettaglio__protetto">
                <span className="pagamenti-dettaglio__protetto-icon" aria-hidden>
                  🔒
                </span>
                Documento protetto da modifica —{' '}
                <button type="button" className="pagamenti-dettaglio__sblocca" onClick={() => patch({ documentProtected: false })}>
                  sblocca (F11)
                </button>
              </div>
            ) : null}

            <div className="gestionale-mdi-window__tabs" role="tablist">
              {PAGAMENTO_DETTAGLIO_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`gestionale-mdi-window__tab${activeTab === tab.id ? ' gestionale-mdi-window__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="gestionale-mdi-window__panel pagamenti-dettaglio__panel" role="tabpanel">
              {activeTab === 'righe' ? (
                <TabRigheRegistrazione
                  lines={state.expenseLines}
                  readOnly={readOnly}
                  selectedLineId={selectedLineId}
                  onSelectLine={setSelectedLineId}
                  onChange={lines => patch({ expenseLines: lines })}
                />
              ) : null}

              {activeTab === 'pagamento' ? (
                <div className="pagamenti-dettaglio__tab-pagamento vb-tab-stack">
                  <div className="pagamenti-dettaglio__pagamento-grid">
                    <WinField label="Data scadenza" htmlFor="pd-scadenza">
                      <WinInput
                        id="pd-scadenza"
                        type="date"
                        value={state.dueDate}
                        disabled={readOnly}
                        onChange={e => patch({ dueDate: e.target.value })}
                      />
                    </WinField>
                    <WinField label="Data saldo" htmlFor="pd-saldo">
                      <WinInput
                        id="pd-saldo"
                        type="date"
                        value={state.settledDate}
                        disabled={readOnly || !state.settled}
                        onChange={e => patch({ settledDate: e.target.value })}
                      />
                    </WinField>
                    <WinField label="Risorsa" htmlFor="pd-risorsa">
                      <WinSelect
                        id="pd-risorsa"
                        value={state.resourceId}
                        disabled={readOnly}
                        onChange={e => patch({ resourceId: e.target.value })}
                      >
                        {resources.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </WinSelect>
                    </WinField>
                    <WinField label="Modalità" htmlFor="pd-modalita">
                      <WinInput
                        id="pd-modalita"
                        value={state.paymentMethod}
                        disabled={readOnly}
                        onChange={e => patch({ paymentMethod: e.target.value })}
                      />
                    </WinField>
                  </div>
                  <label className="vb-check-label">
                    <input
                      type="checkbox"
                      checked={state.settled}
                      disabled={readOnly}
                      onChange={e => patch({ settled: e.target.checked })}
                    />
                    Saldato
                  </label>
                  {state.linkedDocumentNumber ? (
                    <p className="pagamenti-dettaglio__rif">
                      Rif. documento: <strong>{state.linkedDocumentNumber}</strong>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'note' ? (
                <WinField label="Note" htmlFor="pd-note">
                  <textarea
                    id="pd-note"
                    className="pagamenti-dettaglio__textarea"
                    rows={6}
                    value={state.notes || ''}
                    disabled={readOnly}
                    onChange={e => patch({ notes: e.target.value })}
                  />
                </WinField>
              ) : null}

              {activeTab === 'indirizzi' ? (
                <div className="pagamenti-dettaglio__indirizzi vb-tab-stack">
                  <WinField label="Indirizzo" htmlFor="pd-ind">
                    <WinInput id="pd-ind" value={state.intestatarioIndirizzo} disabled={readOnly} onChange={e => patch({ intestatarioIndirizzo: e.target.value })} />
                  </WinField>
                  <div className="pagamenti-dettaglio__indirizzi-row">
                    <WinField label="CAP" htmlFor="pd-cap">
                      <WinInput id="pd-cap" value={state.intestatarioCap} disabled={readOnly} onChange={e => patch({ intestatarioCap: e.target.value })} />
                    </WinField>
                    <WinField label="Città" htmlFor="pd-citta">
                      <WinInput id="pd-citta" value={state.intestatarioCitta} disabled={readOnly} onChange={e => patch({ intestatarioCitta: e.target.value })} />
                    </WinField>
                    <WinField label="Prov." htmlFor="pd-prov">
                      <WinInput id="pd-prov" value={state.intestatarioProv} disabled={readOnly} onChange={e => patch({ intestatarioProv: e.target.value })} />
                    </WinField>
                  </div>
                </div>
              ) : null}

              {activeTab === 'opzioni' ? (
                <div className="pagamenti-dettaglio__opzioni vb-tab-stack">
                  <label className="vb-check-label">
                    <input
                      type="checkbox"
                      checked={state.documentProtected}
                      onChange={e => patch({ documentProtected: e.target.checked })}
                    />
                    Proteggi documento da modifiche
                  </label>
                </div>
              ) : null}
            </div>

            {saveError ? <p className="pagamenti-dettaglio__error">{saveError}</p> : null}
          </div>

          <div className="pagamenti-dettaglio__footer">
            <WinField label="Commento ad uso interno" htmlFor="pd-commento" className="pagamenti-dettaglio__commento">
              <WinInput
                id="pd-commento"
                value={state.internalComment}
                disabled={readOnly}
                onChange={e => patch({ internalComment: e.target.value })}
              />
            </WinField>
            <div className="pagamenti-dettaglio__totale">
              <span className="pagamenti-dettaglio__totale-label">Totale registrazione</span>
              <strong className="pagamenti-dettaglio__totale-value">€ {totale.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>

          <div className="gestionale-mdi-window__actionbar pagamenti-dettaglio__actionbar">
            <button type="button" className="gestionale-mdi-window__action-btn" disabled title="Ritenute">
              % Ritenute
            </button>
            <div className="pagamenti-dettaglio__actionbar-right">
              <button type="button" className="gestionale-mdi-window__action-btn" disabled title="Calcolatrice">
                🧮
              </button>
              <button type="button" className="gestionale-mdi-window__action-btn" title="Aiuto">
                ?
              </button>
              <button type="button" className="gestionale-mdi-window__action-btn gestionale-mdi-window__action-btn--primary" onClick={handleClose} disabled={saving}>
                {saving ? 'Salvataggio…' : '✕ Chiudi'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  </div>
  )

  return createPortal(content, document.body)
}

export { buildPaymentUpdateFromDettaglio, paymentToDettaglioState }
