import { NAZIONI } from '../constants'
import { openMapsForAddress } from '../../../../lib/maps'
import type { Cliente } from '../types'

type Props = {
  cliente: Cliente
  disabled?: boolean
  onChange: (c: Cliente) => void
  onRicercaNazionale: () => void
  onRicercaCap: () => void
  onSedeLegale: () => void
  onSediAmmin: () => void
  onSediExtra: () => void
  onAggiungiIndirizzo: () => void
  onContattiExtra: () => void
  onAggiungiContatto: () => void
}

export default function TabAnagrafica({
  cliente,
  disabled,
  onChange,
  onRicercaNazionale,
  onRicercaCap,
  onSedeLegale,
  onSediAmmin,
  onSediExtra,
  onAggiungiIndirizzo,
  onContattiExtra,
  onAggiungiContatto,
}: Props) {
  const patchSede = (patch: Partial<Cliente['sedeOperativa']>) =>
    onChange({ ...cliente, sedeOperativa: { ...cliente.sedeOperativa, ...patch } })
  const patchContatti = (patch: Partial<Cliente['contatti']>) =>
    onChange({ ...cliente, contatti: { ...cliente.contatti, ...patch } })
  const patchFe = (patch: Partial<Cliente['fatturaElettronica']>) =>
    onChange({ ...cliente, fatturaElettronica: { ...cliente.fatturaElettronica, ...patch } })

  return (
    <div>
      <div className="clienti-section-title">
        <span>🏠</span> Sede operativa
        <button type="button" className="clienti-icon-btn" title="Mappa / elenco nazionale" disabled={disabled} onClick={onRicercaNazionale}>
          🌍
        </button>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Denominazione</label>
        <input
          className="clienti-input"
          value={cliente.sedeOperativa.denominazione}
          disabled={disabled}
          onChange={e => patchSede({ denominazione: e.target.value })}
        />
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Indirizzo</label>
        <input
          className="clienti-input"
          value={cliente.sedeOperativa.indirizzo}
          disabled={disabled}
          onChange={e => patchSede({ indirizzo: e.target.value })}
        />
      </div>

      <div className="clienti-row--3">
        <div className="clienti-field">
          <label className="clienti-field__label">CAP</label>
          <input
            className="clienti-input clienti-input--short"
            value={cliente.sedeOperativa.cap}
            disabled={disabled}
            onChange={e => patchSede({ cap: e.target.value })}
            onBlur={onRicercaCap}
          />
        </div>
        <div className="clienti-field">
          <label className="clienti-field__label">Città</label>
          <input
            className="clienti-input"
            value={cliente.sedeOperativa.citta}
            disabled={disabled}
            onChange={e => patchSede({ citta: e.target.value })}
          />
        </div>
        <div className="clienti-field">
          <label className="clienti-field__label">Prov.</label>
          <input
            className="clienti-input clienti-input--prov"
            maxLength={2}
            value={cliente.sedeOperativa.prov}
            disabled={disabled}
            onChange={e => patchSede({ prov: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div className="clienti-field">
        <label className="clienti-field__label">Nazione</label>
        <div className="clienti-row">
          <select
            className="clienti-select"
            style={{ flex: 1 }}
            value={cliente.sedeOperativa.nazione}
            disabled={disabled}
            onChange={e => patchSede({ nazione: e.target.value })}
          >
            {NAZIONI.map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="clienti-icon-btn"
            title="Mappa"
            onClick={() => openMapsForAddress(cliente.sedeOperativa)}
          >
            🗺
          </button>
        </div>
      </div>

      <div className="clienti-row" style={{ marginBottom: 8 }}>
        <button type="button" className="clienti-link" onClick={onSedeLegale}>
          Sede legale{cliente.sedeLegale ? ' ✓' : ''}
        </button>
        <button type="button" className="clienti-link" onClick={onSediAmmin}>
          Sedi ammin. ({cliente.sediAmmin.length})
        </button>
        <button type="button" className="clienti-link" onClick={onSediExtra}>
          Altri indirizzi ({cliente.sediExtra.length})
        </button>
        <button type="button" className="clienti-dialog__btn" disabled={disabled} onClick={onAggiungiIndirizzo}>
          Aggiungi indirizzo…
        </button>
      </div>

      <div className="clienti-section-title">
        Fattura elettronica (?) <button type="button" className="clienti-icon-btn" title="Aiuto" onClick={() => window.open('https://fixlab.app/help', '_blank')}>?</button>
      </div>
      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Recapito</label>
          <select
            className="clienti-select"
            value={cliente.fatturaElettronica.recapito}
            disabled={disabled}
            onChange={e => patchFe({ recapito: e.target.value as 'CodDest' | 'PEC' })}
          >
            <option value="CodDest">Cod. Destinatario</option>
            <option value="PEC">PEC</option>
          </select>
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Valore</label>
          <input
            className="clienti-input"
            value={cliente.fatturaElettronica.valore}
            disabled={disabled}
            onChange={e => patchFe({ valore: e.target.value })}
          />
        </div>
        <div className="clienti-field" style={{ width: 100 }}>
          <label className="clienti-field__label">Rif. ammin.</label>
          <input
            className="clienti-input"
            value={cliente.fatturaElettronica.rifAmmin}
            disabled={disabled}
            onChange={e => patchFe({ rifAmmin: e.target.value })}
          />
        </div>
      </div>

      <div className="clienti-section-title">Contatti</div>
      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Telefono</label>
          <input className="clienti-input" value={cliente.contatti.telefono} disabled={disabled} onChange={e => patchContatti({ telefono: e.target.value })} />
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Fax</label>
          <input className="clienti-input" value={cliente.contatti.fax} disabled={disabled} onChange={e => patchContatti({ fax: e.target.value })} />
        </div>
      </div>
      <div className="clienti-row">
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Cellulare</label>
          <input className="clienti-input" value={cliente.contatti.cellulare} disabled={disabled} onChange={e => patchContatti({ cellulare: e.target.value })} />
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">E-mail</label>
          <input className="clienti-input" value={cliente.contatti.email} disabled={disabled} onChange={e => patchContatti({ email: e.target.value })} />
        </div>
      </div>
      <div className="clienti-field">
        <label className="clienti-field__label">Internet</label>
        <input className="clienti-input" value={cliente.contatti.internet} disabled={disabled} onChange={e => patchContatti({ internet: e.target.value })} />
      </div>
      <div className="clienti-row">
        <button type="button" className="clienti-link" onClick={onContattiExtra}>
          Altri contatti ({cliente.contattiExtra.length})…
        </button>
        <button type="button" className="clienti-dialog__btn" disabled={disabled} onClick={onAggiungiContatto}>
          Aggiungi contatto…
        </button>
      </div>

      <div className="clienti-row" style={{ marginTop: 10 }}>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Cod. fiscale</label>
          <input className="clienti-input" value={cliente.codFiscale} disabled={disabled} onChange={e => onChange({ ...cliente, codFiscale: e.target.value })} />
        </div>
        <div className="clienti-field" style={{ flex: 1 }}>
          <label className="clienti-field__label">Partita Iva</label>
          <input className="clienti-input" value={cliente.partitaIva} disabled={disabled} onChange={e => onChange({ ...cliente, partitaIva: e.target.value })} />
        </div>
      </div>
    </div>
  )
}
