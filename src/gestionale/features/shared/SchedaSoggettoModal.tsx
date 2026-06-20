import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { updateClient, updateSupplier } from '../../../lib/firestore'
import type { Client, Payment, Supplier } from '../../../types'
import { clientToCliente, clienteToClientPayload, type Cliente } from '../clienti/types'
import TabAnagraficaCliente from '../clienti/tabs/TabAnagrafica'
import TabRapportiCommercialiCliente from '../clienti/tabs/TabRapportiCommerciali'
import TabVarieCliente from '../clienti/tabs/TabVarie'
import {
  ContattiExtraDialog,
  SedeLegaleDialog,
  SediListaDialog,
} from '../clienti/dialogs/ClientiAnagraficaDialogs'
import RicercaSoggettiNazionaleDialog from './RicercaSoggettiNazionaleDialog'
import { applySoggettoRicerca } from './applySoggettoRicerca'
import type { SoggettoRicercaRecord } from '../../lib/ricercaSoggetto'
import { supplierToFornitore, fornitoreToSupplierPayload, type Fornitore } from '../fornitori/types'
import TabAnagraficaFornitore from '../fornitori/tabs/TabAnagrafica'
import TabRapportiCommercialiFornitore from '../fornitori/tabs/TabRapportiCommerciali'
import TabVarieFornitore from '../fornitori/tabs/TabVarie'
import {
  ContattiExtraDialog as ContattiExtraFornitoreDialog,
  SedeLegaleDialog as SedeLegaleFornitoreDialog,
  SediListaDialog as SediListaFornitoreDialog,
} from '../fornitori/dialogs/FornitoriAnagraficaDialogs'
import { PAGAMENTI_SCHEDA_TABS, type PagamentiSchedaTabId } from '../pagamenti/schedaTabs'
import '../../theme/clienti-section.css'
import '../../theme/danea-anagrafica.css'
import '../../theme/pagamenti-section.css'

type ClientPayload = {
  kind: 'client'
  cliente: Cliente
  baseline: Cliente
}

type SupplierPayload = {
  kind: 'supplier'
  fornitore: Fornitore
  baseline: Fornitore
}

export type SchedaSoggettoPayload = ClientPayload | SupplierPayload

type Props = {
  payment: Payment
  studioId: string
  studioRecords: SoggettoRicercaRecord[]
  payload: SchedaSoggettoPayload
  onClose: () => void
  onSaved?: () => void
}

function cloneCliente(c: Cliente): Cliente {
  return structuredClone(c)
}

function cloneFornitore(f: Fornitore): Fornitore {
  return structuredClone(f)
}

export function buildSchedaPayloadFromPayment(
  payment: Payment,
  clients: Client[],
  suppliers: Supplier[],
): SchedaSoggettoPayload | null {
  if (payment.subjectType === 'client') {
    const raw =
      (payment.subjectId ? clients.find(c => c.id === payment.subjectId) : null) ||
      clients.find(c => c.name.trim().toLowerCase() === (payment.subjectName || '').trim().toLowerCase())
    if (!raw) return null
    const cliente = clientToCliente(raw)
    return { kind: 'client', cliente, baseline: structuredClone(cliente) }
  }
  if (payment.subjectType === 'supplier') {
    const raw =
      (payment.subjectId ? suppliers.find(s => s.id === payment.subjectId) : null) ||
      suppliers.find(s => s.name.trim().toLowerCase() === (payment.subjectName || '').trim().toLowerCase())
    if (!raw) return null
    const fornitore = supplierToFornitore(raw)
    return { kind: 'supplier', fornitore, baseline: structuredClone(fornitore) }
  }
  return null
}

export default function SchedaSoggettoModal({
  payment,
  studioId,
  studioRecords,
  payload,
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<PagamentiSchedaTabId>('anagrafica')
  const [cliente, setCliente] = useState<Cliente | null>(payload.kind === 'client' ? payload.cliente : null)
  const [fornitore, setFornitore] = useState<Fornitore | null>(payload.kind === 'supplier' ? payload.fornitore : null)
  const [baselineCliente, setBaselineCliente] = useState<Cliente | null>(
    payload.kind === 'client' ? payload.baseline : null,
  )
  const [baselineFornitore, setBaselineFornitore] = useState<Fornitore | null>(
    payload.kind === 'supplier' ? payload.baseline : null,
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [showRicercaNaz, setShowRicercaNaz] = useState(false)
  const [showSedeLegale, setShowSedeLegale] = useState(false)
  const [showSediAmmin, setShowSediAmmin] = useState(false)
  const [showSediExtra, setShowSediExtra] = useState(false)
  const [showContattiExtra, setShowContattiExtra] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = payload.kind === 'client' ? 'Scheda cliente' : 'Scheda fornitore'

  const isDirty = useMemo(() => {
    if (payload.kind === 'client' && cliente && baselineCliente) {
      return JSON.stringify(cliente) !== JSON.stringify(baselineCliente)
    }
    if (payload.kind === 'supplier' && fornitore && baselineFornitore) {
      return JSON.stringify(fornitore) !== JSON.stringify(baselineFornitore)
    }
    return false
  }, [payload.kind, cliente, baselineCliente, fornitore, baselineFornitore])

  const handleOk = useCallback(async () => {
    if (!isDirty) {
      onClose()
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (payload.kind === 'client' && cliente && !cliente.id.startsWith('draft-')) {
        await updateClient(cliente.id, clienteToClientPayload(cliente, studioId))
        const saved = cloneCliente(cliente)
        setBaselineCliente(saved)
        setCliente(saved)
      } else if (payload.kind === 'supplier' && fornitore && !fornitore.id.startsWith('draft-')) {
        await updateSupplier(fornitore.id, fornitoreToSupplierPayload(fornitore, studioId))
        const saved = cloneFornitore(fornitore)
        setBaselineFornitore(saved)
        setFornitore(saved)
      }
      onSaved?.()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [isDirty, onClose, onSaved, payload.kind, cliente, fornitore, studioId])

  const headerEntity = payload.kind === 'client' ? cliente : fornitore
  if (!headerEntity) return null

  return createPortal(
    <div className="clienti-dialog-overlay scheda-soggetto-overlay" role="presentation">
      <div className="clienti-dialog scheda-soggetto-modal" role="dialog" aria-modal="true" aria-labelledby="scheda-soggetto-title">
        <div className="clienti-dialog__titlebar">
          <span id="scheda-soggetto-title">{title}</span>
          <button type="button" className="clienti-icon-btn clienti-icon-btn--close" onClick={onClose} title="Chiudi">
            ✕
          </button>
        </div>

        <div className="scheda-soggetto-modal__header">
          <div className="clienti-field scheda-soggetto-modal__code">
            <label className="clienti-field__label">Codice</label>
            <input className="clienti-input" value={headerEntity.codice} readOnly />
          </div>
          <div className="clienti-field" style={{ flex: 1 }}>
            <label className="clienti-field__label">Cod. fiscale</label>
            <input
              className="clienti-input"
              value={headerEntity.codFiscale}
              onChange={e =>
                payload.kind === 'client' && cliente
                  ? setCliente({ ...cliente, codFiscale: e.target.value })
                  : fornitore
                    ? setFornitore({ ...fornitore, codFiscale: e.target.value })
                    : undefined
              }
            />
          </div>
          <label className="clienti-check">
            <input
              type="checkbox"
              checked={headerEntity.isCliente}
              onChange={e =>
                payload.kind === 'client' && cliente
                  ? setCliente({ ...cliente, isCliente: e.target.checked })
                  : fornitore
                    ? setFornitore({ ...fornitore, isCliente: e.target.checked })
                    : undefined
              }
            />
            Cliente
          </label>
          <label className="clienti-check">
            <input
              type="checkbox"
              checked={headerEntity.isFornitore}
              onChange={e =>
                payload.kind === 'client' && cliente
                  ? setCliente({ ...cliente, isFornitore: e.target.checked })
                  : fornitore
                    ? setFornitore({ ...fornitore, isFornitore: e.target.checked })
                    : undefined
              }
            />
            Fornitore
          </label>
          <div className="clienti-field" style={{ minWidth: 120 }}>
            <label className="clienti-field__label">Part. Iva</label>
            <input
              className="clienti-input"
              value={headerEntity.partitaIva}
              onChange={e =>
                payload.kind === 'client' && cliente
                  ? setCliente({ ...cliente, partitaIva: e.target.value })
                  : fornitore
                    ? setFornitore({ ...fornitore, partitaIva: e.target.value })
                    : undefined
              }
            />
          </div>
        </div>

        <div className="clienti-scheda__tabs scheda-soggetto-modal__tabs" role="tablist">
          {PAGAMENTI_SCHEDA_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`clienti-scheda__tab${activeTab === tab.id ? ' clienti-scheda__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="scheda-soggetto-modal__body" role="tabpanel">
          {payload.kind === 'client' && cliente ? (
            <>
              {activeTab === 'anagrafica' ? (
                <TabAnagraficaCliente
                  cliente={cliente}
                  onChange={setCliente}
                  onRicercaNazionale={() => setShowRicercaNaz(true)}
                  onSedeLegale={() => setShowSedeLegale(true)}
                  onSediAmmin={() => setShowSediAmmin(true)}
                  onSediExtra={() => setShowSediExtra(true)}
                  onAggiungiIndirizzo={() => setShowSediExtra(true)}
                  onContattiExtra={() => setShowContattiExtra(true)}
                  onAggiungiContatto={() => setShowContattiExtra(true)}
                />
              ) : null}
              {activeTab === 'rapporti' ? <TabRapportiCommercialiCliente cliente={cliente} onChange={setCliente} /> : null}
              {activeTab === 'varie' ? <TabVarieCliente cliente={cliente} onChange={setCliente} /> : null}
              {activeTab === 'anagrafica' ? (
                <div className="clienti-field" style={{ marginTop: 8 }}>
                  <label className="clienti-field__label">Note</label>
                  <textarea
                    className="clienti-textarea"
                    rows={4}
                    value={cliente.note}
                    onChange={e => setCliente({ ...cliente, note: e.target.value })}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {payload.kind === 'supplier' && fornitore ? (
            <>
              {activeTab === 'anagrafica' ? (
                <TabAnagraficaFornitore
                  fornitore={fornitore}
                  onChange={setFornitore}
                  onRicercaNazionale={() => setShowRicercaNaz(true)}
                  onSedeLegale={() => setShowSedeLegale(true)}
                  onSediAmmin={() => setShowSediAmmin(true)}
                  onSediExtra={() => setShowSediExtra(true)}
                  onAggiungiIndirizzo={() => setShowSediExtra(true)}
                  onContattiExtra={() => setShowContattiExtra(true)}
                  onAggiungiContatto={() => setShowContattiExtra(true)}
                />
              ) : null}
              {activeTab === 'rapporti' ? <TabRapportiCommercialiFornitore fornitore={fornitore} onChange={setFornitore} /> : null}
              {activeTab === 'varie' ? <TabVarieFornitore fornitore={fornitore} onChange={setFornitore} /> : null}
              {activeTab === 'anagrafica' ? (
                <div className="clienti-field" style={{ marginTop: 8 }}>
                  <label className="clienti-field__label">Note</label>
                  <textarea
                    className="clienti-textarea"
                    rows={4}
                    value={fornitore.note}
                    onChange={e => setFornitore({ ...fornitore, note: e.target.value })}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {saveError ? <p className="scheda-soggetto-modal__error">{saveError}</p> : null}

        <div className="clienti-dialog__footer scheda-soggetto-modal__footer">
          <button type="button" className="clienti-dialog__btn clienti-dialog__btn--primary" disabled={saving} onClick={() => void handleOk()}>
            {saving ? 'Salvataggio…' : 'OK'}
          </button>
        </div>
      </div>

      {showRicercaNaz && payload.kind === 'client' && cliente ? (
        <RicercaSoggettiNazionaleDialog
          initialQuery={cliente.codFiscale || cliente.partitaIva || cliente.sedeOperativa.denominazione}
          studioRecords={studioRecords}
          onClose={() => setShowRicercaNaz(false)}
          onSelect={result => setCliente(applySoggettoRicerca(cliente, result))}
        />
      ) : null}
      {showRicercaNaz && payload.kind === 'supplier' && fornitore ? (
        <RicercaSoggettiNazionaleDialog
          initialQuery={fornitore.codFiscale || fornitore.partitaIva || fornitore.sedeOperativa.denominazione}
          studioRecords={studioRecords}
          onClose={() => setShowRicercaNaz(false)}
          onSelect={result => setFornitore(applySoggettoRicerca(fornitore, result))}
        />
      ) : null}

      {showSedeLegale && payload.kind === 'client' && cliente ? (
        <SedeLegaleDialog
          sede={cliente.sedeLegale}
          onSave={s => {
            setCliente({ ...cliente, sedeLegale: s })
            setShowSedeLegale(false)
          }}
          onClose={() => setShowSedeLegale(false)}
        />
      ) : null}
      {showSedeLegale && payload.kind === 'supplier' && fornitore ? (
        <SedeLegaleFornitoreDialog
          sede={fornitore.sedeLegale}
          onSave={s => {
            setFornitore({ ...fornitore, sedeLegale: s })
            setShowSedeLegale(false)
          }}
          onClose={() => setShowSedeLegale(false)}
        />
      ) : null}

      {showSediAmmin && payload.kind === 'client' && cliente ? (
        <SediListaDialog
          title="Sedi amministrative"
          sedi={cliente.sediAmmin}
          onSave={s => {
            setCliente({ ...cliente, sediAmmin: s })
            setShowSediAmmin(false)
          }}
          onClose={() => setShowSediAmmin(false)}
        />
      ) : null}
      {showSediAmmin && payload.kind === 'supplier' && fornitore ? (
        <SediListaFornitoreDialog
          title="Sedi amministrative"
          sedi={fornitore.sediAmmin}
          onSave={s => {
            setFornitore({ ...fornitore, sediAmmin: s })
            setShowSediAmmin(false)
          }}
          onClose={() => setShowSediAmmin(false)}
        />
      ) : null}

      {showSediExtra && payload.kind === 'client' && cliente ? (
        <SediListaDialog
          title="Altri indirizzi"
          sedi={cliente.sediExtra}
          onSave={s => {
            setCliente({ ...cliente, sediExtra: s })
            setShowSediExtra(false)
          }}
          onClose={() => setShowSediExtra(false)}
        />
      ) : null}
      {showSediExtra && payload.kind === 'supplier' && fornitore ? (
        <SediListaFornitoreDialog
          title="Altri indirizzi"
          sedi={fornitore.sediExtra}
          onSave={s => {
            setFornitore({ ...fornitore, sediExtra: s })
            setShowSediExtra(false)
          }}
          onClose={() => setShowSediExtra(false)}
        />
      ) : null}

      {showContattiExtra && payload.kind === 'client' && cliente ? (
        <ContattiExtraDialog
          contatti={cliente.contattiExtra}
          onSave={c => {
            setCliente({ ...cliente, contattiExtra: c })
            setShowContattiExtra(false)
          }}
          onClose={() => setShowContattiExtra(false)}
        />
      ) : null}
      {showContattiExtra && payload.kind === 'supplier' && fornitore ? (
        <ContattiExtraFornitoreDialog
          contatti={fornitore.contattiExtra}
          onSave={c => {
            setFornitore({ ...fornitore, contattiExtra: c })
            setShowContattiExtra(false)
          }}
          onClose={() => setShowContattiExtra(false)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
