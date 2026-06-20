import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStudio } from '../../../../hooks/useActiveStudio'
import { useAgentOptions } from '../../../hooks/useAgentOptions'
import { LISTINI, PAGAMENTI } from '../constants'
import { DaneaFormGroupTitle, DaneaFormRow } from '../../../components/DaneaFormRow'
import type { Fornitore } from '../types'

type Props = {
  fornitore: Fornitore
  disabled?: boolean
  onChange: (c: Fornitore) => void
}

const ALIQUOTE_IVA = ['22%', '10%', '4%', 'N41: (N3.2) Cessioni UE', 'Esente'] as const
const TRASPORTO = ['Franco', 'Assegnato', 'Porto assegnato'] as const
const PORTO = ['Franco', 'Assegnato'] as const
const AVVISI = ['Sì', 'No', 'Solo se anomalie'] as const

export default function TabRapportiCommerciali({ fornitore, disabled, onChange }: Props) {
  const navigate = useNavigate()
  const fidoRef = useRef<HTMLInputElement>(null)
  const coordRef = useRef<HTMLInputElement>(null)
  const { studioId } = useActiveStudio()
  const agenti = useAgentOptions(studioId)
  const patch = (patch: Partial<Fornitore['rapportiCommerciali']>) =>
    onChange({ ...fornitore, rapportiCommerciali: { ...fornitore.rapportiCommerciali, ...patch } })
  const rc = fornitore.rapportiCommerciali

  return (
    <div className="danea-form">
      <DaneaFormRow label="Sconti">
        <input
          className="clienti-input"
          value={rc.sconto}
          disabled={disabled}
          placeholder="2%"
          onChange={e => patch({ sconto: e.target.value })}
        />
      </DaneaFormRow>

      <DaneaFormRow label="Fido">
        <input ref={fidoRef} className="clienti-input" value={rc.fido} disabled={disabled} onChange={e => patch({ fido: e.target.value })} />
        <button type="button" className="danea-form__edit-btn" title="Cerca" onClick={() => fidoRef.current?.focus()}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Pagamento">
        <select className="clienti-select" value={rc.pagamento} disabled={disabled} onChange={e => patch({ pagamento: e.target.value })}>
          <option value="" />
          {PAGAMENTI.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Coord. banc.">
        <input ref={coordRef} className="clienti-input" value={rc.coordBancarie} disabled={disabled} onChange={e => patch({ coordBancarie: e.target.value })} />
        <button type="button" className="danea-form__edit-btn" title="Modifica" onClick={() => coordRef.current?.focus()}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Ns. banca">
        <select className="clienti-select" value={rc.nsBanca} disabled={disabled} onChange={e => patch({ nsBanca: e.target.value })}>
          <option value="" />
          <option value="Banca principale">Banca principale</option>
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Inc. trasporto">
        <select className="clienti-select" value={rc.incTrasporto} disabled={disabled} onChange={e => patch({ incTrasporto: e.target.value })}>
          <option value="" />
          {TRASPORTO.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Aliquota Iva">
        <select className="clienti-select" value={rc.aliquotaIva} disabled={disabled} onChange={e => patch({ aliquotaIva: e.target.value })}>
          {ALIQUOTE_IVA.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Conto acq.">
        <select className="clienti-select" value={rc.listino} disabled={disabled} onChange={e => patch({ listino: e.target.value })}>
          {LISTINI.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Agente">
        <select className="clienti-select" value={rc.agente} disabled={disabled} onChange={e => patch({ agente: e.target.value })}>
          {agenti.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button type="button" className="danea-form__edit-btn" title="Nuovo agente" onClick={() => navigate('/impostazioni?tab=moduli')}>
          +
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Porto">
        <select className="clienti-select" value={rc.porto} disabled={disabled} onChange={e => patch({ porto: e.target.value })}>
          <option value="" />
          {PORTO.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <label className="clienti-check" style={{ display: 'block', marginTop: 4, paddingLeft: 94 }}>
        <input type="checkbox" checked={rc.inviaDocEmail} disabled={disabled} onChange={e => patch({ inviaDocEmail: e.target.checked })} />
        Invia documenti tramite e-mail
      </label>

      <DaneaFormGroupTitle>In creazione documenti</DaneaFormGroupTitle>

      <DaneaFormRow label="Mostra avviso">
        <select className="clienti-select" value={rc.mostraAvviso} disabled={disabled} onChange={e => patch({ mostraAvviso: e.target.value })}>
          {AVVISI.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Inserisci nota">
        <select className="clienti-select" value={rc.inserisciNota} disabled={disabled} onChange={e => patch({ inserisciNota: e.target.value })}>
          <option value="" />
          <option value="Nota standard">Nota standard</option>
        </select>
        <button
          type="button"
          className="danea-form__edit-btn"
          onClick={() => {
            const nota = window.prompt('Testo nota da inserire nei documenti')
            if (nota?.trim()) patch({ inserisciNota: nota.trim() })
          }}
        >
          +
        </button>
      </DaneaFormRow>
    </div>
  )
}
