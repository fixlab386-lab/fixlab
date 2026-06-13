import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStudio } from '../../../../hooks/useActiveStudio'
import { useAgentOptions } from '../../../hooks/useAgentOptions'
import { LISTINI, PAGAMENTI } from '../constants'
import type { Cliente } from '../types'

type Props = {
  cliente: Cliente
  disabled?: boolean
  onChange: (c: Cliente) => void
}

const ALIQUOTE_IVA = ['22%', '10%', '4%', 'N41: (N3.2) Cessioni UE', 'Esente'] as const
const TRASPORTO = ['Franco', 'Assegnato', 'Porto assegnato'] as const
const PORTO = ['Franco', 'Assegnato'] as const
const AVVISI = ['Sì', 'No', 'Solo se anomalie'] as const

export default function TabRapportiCommerciali({ cliente, disabled, onChange }: Props) {
  const navigate = useNavigate()
  const fidoRef = useRef<HTMLInputElement>(null)
  const coordRef = useRef<HTMLInputElement>(null)
  const { studioId } = useActiveStudio()
  const agenti = useAgentOptions(studioId)
  const patch = (patch: Partial<Cliente['rapportiCommerciali']>) =>
    onChange({ ...cliente, rapportiCommerciali: { ...cliente.rapportiCommerciali, ...patch } })
  const rc = cliente.rapportiCommerciali

  return (
    <div>
      <div className="clienti-row">
        <div className="clienti-field" style={{ width: 80 }}>
          <label className="clienti-field__label">Sconti</label>
          <input
            className="clienti-input"
            value={rc.sconto}
            disabled={disabled}
            placeholder="2%"
            onChange={e => patch({ sconto: e.target.value })}
          />
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Listino</label>
          <select className="clienti-select" value={rc.listino} disabled={disabled} onChange={e => patch({ listino: e.target.value })}>
            {LISTINI.map(l => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Fido</label>
        <div className="clienti-row">
          <input ref={fidoRef} className="clienti-input" style={{ flex: 1 }} value={rc.fido} disabled={disabled} onChange={e => patch({ fido: e.target.value })} />
          <button type="button" className="clienti-icon-btn" title="Cerca" onClick={() => fidoRef.current?.focus()}>
            🔍
          </button>
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Agente</label>
        <div className="clienti-row">
          <select className="clienti-select" style={{ flex: 1 }} value={rc.agente} disabled={disabled} onChange={e => patch({ agente: e.target.value })}>
            {agenti.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="clienti-icon-btn"
            title="Nuovo agente"
            onClick={() => navigate('/impostazioni?tab=moduli')}
          >
            +
          </button>
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Pagamento</label>
        <select className="clienti-select" value={rc.pagamento} disabled={disabled} onChange={e => patch({ pagamento: e.target.value })}>
          <option value="" />
          {PAGAMENTI.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Coord. banc.</label>
        <div className="clienti-row">
          <input
            ref={coordRef}
            className="clienti-input"
            style={{ flex: 1 }}
            value={rc.coordBancarie}
            disabled={disabled}
            onChange={e => patch({ coordBancarie: e.target.value })}
          />
          <button type="button" className="clienti-icon-btn" title="Modifica" onClick={() => coordRef.current?.focus()}>
            ✏
          </button>
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Ns. banca</label>
        <select className="clienti-select" value={rc.nsBanca} disabled={disabled} onChange={e => patch({ nsBanca: e.target.value })}>
          <option value="" />
          <option value="Banca principale">Banca principale</option>
        </select>
      </div>

      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Inc. trasporto</label>
          <select className="clienti-select" value={rc.incTrasporto} disabled={disabled} onChange={e => patch({ incTrasporto: e.target.value })}>
            <option value="" />
            {TRASPORTO.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Porto</label>
          <select className="clienti-select" value={rc.porto} disabled={disabled} onChange={e => patch({ porto: e.target.value })}>
            <option value="" />
            {PORTO.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Aliquota Iva</label>
        <select className="clienti-select" value={rc.aliquotaIva} disabled={disabled} onChange={e => patch({ aliquotaIva: e.target.value })}>
          {ALIQUOTE_IVA.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Dich. intento</label>
          <input className="clienti-input" value={rc.dichIntento} disabled={disabled} onChange={e => patch({ dichIntento: e.target.value })} />
        </div>
        <div className="clienti-field" style={{ width: 100 }}>
          <label className="clienti-field__label">del</label>
          <input
            className="clienti-input"
            type="date"
            value={rc.dichIntentoData}
            disabled={disabled}
            onChange={e => patch({ dichIntentoData: e.target.value })}
          />
        </div>
      </div>

      <label className="clienti-check" style={{ display: 'block', marginTop: 6 }}>
        <input type="checkbox" checked={rc.inviaDocEmail} disabled={disabled} onChange={e => patch({ inviaDocEmail: e.target.checked })} />
        Invia documenti tramite e-mail
      </label>
      <label className="clienti-check" style={{ display: 'block' }}>
        <input type="checkbox" checked={rc.fatturaRitenuta} disabled={disabled} onChange={e => patch({ fatturaRitenuta: e.target.checked })} />
        Fattura con Rit. d&apos;acconto
      </label>

      <div className="clienti-section-title" style={{ marginTop: 10 }}>
        In creazione documenti
      </div>
      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Mostra avviso</label>
          <select className="clienti-select" value={rc.mostraAvviso} disabled={disabled} onChange={e => patch({ mostraAvviso: e.target.value })}>
            {AVVISI.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Inserisci nota</label>
          <div className="clienti-row">
            <select className="clienti-select" style={{ flex: 1 }} value={rc.inserisciNota} disabled={disabled} onChange={e => patch({ inserisciNota: e.target.value })}>
              <option value="" />
              <option value="Nota standard">Nota standard</option>
            </select>
            <button
              type="button"
              className="clienti-icon-btn"
              onClick={() => {
                const nota = window.prompt('Testo nota da inserire nei documenti')
                if (nota?.trim()) patch({ inserisciNota: nota.trim() })
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
