import { useEffect, useRef, useState } from 'react'
import { NUOVO_DOC_ITEMS, SCHEDA_TABS } from './constants'
import type { Cliente, SchedaTabId } from './types'
import TabAnagrafica from './tabs/TabAnagrafica'
import TabRapportiCommerciali from './tabs/TabRapportiCommerciali'
import TabRiparazioniCliente from './tabs/TabRiparazioniCliente'
import TabVarie from './tabs/TabVarie'
import { DaneaFormRow } from '../../components/DaneaFormRow'

function NuovoDocDropdown({ onPick, disabled }: { onPick: (tipo: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="clienti-dropdown" ref={ref}>
      <button type="button" className="clienti-scheda-footer__btn" disabled={disabled} onClick={() => setOpen(v => !v)}>
        Nuovo Doc. <span className="caret">▼</span>
      </button>
      {open ? (
        <div className="clienti-dropdown__menu clienti-dropdown__menu--up">
          {NUOVO_DOC_ITEMS.map(item => (
            <button
              key={item}
              type="button"
              className="clienti-dropdown__item"
              onClick={() => {
                onPick(item)
                setOpen(false)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type Props = {
  cliente: Cliente | null
  activeTab: SchedaTabId
  saving: boolean
  isDirty: boolean
  onTabChange: (tab: SchedaTabId) => void
  onChange: (c: Cliente) => void
  onSave: () => void
  onAnnulla: () => void
  onCloseScheda?: () => void
  onRicercaNazionale: () => void
  onProprietaComplete: () => void
  onSedeLegale: () => void
  onSediAmmin: () => void
  onSediExtra: () => void
  onAggiungiIndirizzo: () => void
  onContattiExtra: () => void
  onAggiungiContatto: () => void
  onNuovoDoc: (tipo: string) => void
  onDocumenti: () => void
  onPagamenti: () => void
  onImpegni: () => void
}

export default function ClientiScheda({
  cliente,
  activeTab,
  saving,
  isDirty,
  onTabChange,
  onChange,
  onSave,
  onAnnulla,
  onCloseScheda,
  onRicercaNazionale,
  onProprietaComplete,
  onSedeLegale,
  onSediAmmin,
  onSediExtra,
  onAggiungiIndirizzo,
  onContattiExtra,
  onAggiungiContatto,
  onNuovoDoc,
  onDocumenti,
  onPagamenti,
  onImpegni,
}: Props) {
  if (!cliente) {
    return (
      <div className="clienti-section__scheda">
        <div className="clienti-empty">Seleziona un cliente dall&apos;elenco oppure usa «Nuovo».</div>
      </div>
    )
  }

  return (
    <div className="clienti-section__scheda">
      <div className="danea-scheda-header">
        <div className="danea-scheda-header__field danea-scheda-header__field--cod">
          <span className="danea-scheda-header__label">Codice</span>
          <input className="clienti-input" value={cliente.codice} readOnly />
        </div>
        <div className="danea-scheda-header__field danea-scheda-header__field--cf">
          <span className="danea-scheda-header__label">Cod. fiscale</span>
          <input
            className="clienti-input"
            value={cliente.codFiscale}
            onChange={e => onChange({ ...cliente, codFiscale: e.target.value })}
          />
        </div>
        <label className="clienti-check">
          <input type="checkbox" checked={cliente.isCliente} onChange={e => onChange({ ...cliente, isCliente: e.target.checked })} />
          Cliente
        </label>
        <label className="clienti-check">
          <input type="checkbox" checked={cliente.isFornitore} onChange={e => onChange({ ...cliente, isFornitore: e.target.checked })} />
          Fornitore
        </label>
        <div className="danea-scheda-header__field danea-scheda-header__field--piva">
          <span className="danea-scheda-header__label">Part. Iva</span>
          <input
            className="clienti-input"
            value={cliente.partitaIva}
            onChange={e => onChange({ ...cliente, partitaIva: e.target.value })}
          />
        </div>
        <div className="danea-scheda-header__actions">
          <button type="button" className="clienti-link" onClick={onProprietaComplete}>
            Propr. compl.
          </button>
          {isDirty ? (
            <>
              <button type="button" className="clienti-scheda__save" onClick={onSave} disabled={saving}>
                Salva
              </button>
              <button type="button" className="clienti-scheda__save clienti-scheda__save--cancel" onClick={onAnnulla}>
                Annulla
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="clienti-scheda__tabs" role="tablist">
        {SCHEDA_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`clienti-scheda__tab${activeTab === tab.id ? ' clienti-scheda__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="clienti-scheda__body" role="tabpanel">
        {activeTab === 'anagrafica' ? (
          <TabAnagrafica
            cliente={cliente}
            onChange={onChange}
            onRicercaNazionale={onRicercaNazionale}
            onSedeLegale={onSedeLegale}
            onSediAmmin={onSediAmmin}
            onSediExtra={onSediExtra}
            onAggiungiIndirizzo={onAggiungiIndirizzo}
            onContattiExtra={onContattiExtra}
            onAggiungiContatto={onAggiungiContatto}
          />
        ) : null}
        {activeTab === 'rapporti' ? <TabRapportiCommerciali cliente={cliente} onChange={onChange} /> : null}
        {activeTab === 'riparazioni' ? <TabRiparazioniCliente cliente={cliente} /> : null}
        {activeTab === 'varie' ? <TabVarie cliente={cliente} onChange={onChange} /> : null}
        {activeTab === 'anagrafica' ? (
          <div className="danea-form__note">
            <DaneaFormRow label="Note">
              <textarea
                className="clienti-textarea"
                rows={4}
                value={cliente.note}
                onChange={e => onChange({ ...cliente, note: e.target.value })}
              />
            </DaneaFormRow>
          </div>
        ) : null}
      </div>

      <div className="clienti-scheda-footer">
        <button type="button" className="clienti-scheda-footer__btn" title="Allegati">
          Allegati…
        </button>
        <NuovoDocDropdown onPick={onNuovoDoc} />
        <button type="button" className="clienti-scheda-footer__btn" onClick={onDocumenti}>
          Documenti
        </button>
        <button type="button" className="clienti-scheda-footer__btn" onClick={onPagamenti} title="Pagamenti">
          Pagamenti
        </button>
        <button type="button" className="clienti-scheda-footer__btn" onClick={onImpegni} title="Impegni">
          Impegni
        </button>
      </div>
    </div>
  )
}
