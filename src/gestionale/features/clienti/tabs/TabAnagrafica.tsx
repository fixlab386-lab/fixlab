import { NAZIONI } from '../constants'
import { openMapsForAddress } from '../../../../lib/maps'
import SedeCapFields from '../../shared/SedeCapFields'
import { VatNumberAssistField } from '../../../../components/anagrafica/assist'
import { DaneaFormGroupTitle, DaneaFormLinks, DaneaFormRow } from '../../../components/DaneaFormRow'
import type { Cliente } from '../types'

type Props = {
  cliente: Cliente
  disabled?: boolean
  onChange: (c: Cliente) => void
  onRicercaNazionale: () => void
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
    <div className="danea-form">
      <DaneaFormGroupTitle>
        <span>Sede operativa</span>
        <button type="button" className="danea-form__edit-btn" title="Ricerca su elenco nazionale" disabled={disabled} onClick={onRicercaNazionale}>
          i
        </button>
      </DaneaFormGroupTitle>

      <DaneaFormRow label="Denominaz.">
        <input
          className="clienti-input"
          value={cliente.sedeOperativa.denominazione}
          disabled={disabled}
          onChange={e => patchSede({ denominazione: e.target.value })}
        />
      </DaneaFormRow>

      <DaneaFormRow label="Indirizzo">
        <input
          className="clienti-input"
          value={cliente.sedeOperativa.indirizzo}
          disabled={disabled}
          onChange={e => patchSede({ indirizzo: e.target.value })}
        />
      </DaneaFormRow>

      <SedeCapFields
        cap={cliente.sedeOperativa.cap}
        citta={cliente.sedeOperativa.citta}
        prov={cliente.sedeOperativa.prov}
        disabled={disabled}
        onPatch={patch => patchSede(patch)}
      />

      <DaneaFormRow label="Nazione">
        <select
          className="clienti-select"
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
        <button type="button" className="danea-form__edit-btn" title="Mappa" onClick={() => openMapsForAddress(cliente.sedeOperativa)}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormLinks>
        <button type="button" className="clienti-link" onClick={onSedeLegale}>
          Sede legale{cliente.sedeLegale ? ' ✓' : ''}
        </button>
        <button type="button" className="clienti-link" onClick={onSediAmmin}>
          Sedi ammin. ({cliente.sediAmmin.length})
        </button>
        <button type="button" className="clienti-link" onClick={onSediExtra}>
          Altri indirizzi ({cliente.sediExtra.length})
        </button>
        <button type="button" className="clienti-link" disabled={disabled} onClick={onAggiungiIndirizzo}>
          Aggiungi indirizzo…
        </button>
      </DaneaFormLinks>

      <DaneaFormGroupTitle>Fattura elettronica</DaneaFormGroupTitle>

      <DaneaFormRow label="Recapito">
        <select
          className="clienti-select"
          value={cliente.fatturaElettronica.recapito}
          disabled={disabled}
          onChange={e => patchFe({ recapito: e.target.value as 'CodDest' | 'PEC' })}
        >
          <option value="CodDest">Cod. Destinatario</option>
          <option value="PEC">PEC</option>
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Valore">
        <input
          className="clienti-input"
          value={cliente.fatturaElettronica.valore}
          disabled={disabled}
          onChange={e => patchFe({ valore: e.target.value })}
        />
      </DaneaFormRow>

      <DaneaFormRow label="Rif. ammin.">
        <input
          className="clienti-input"
          value={cliente.fatturaElettronica.rifAmmin}
          disabled={disabled}
          onChange={e => patchFe({ rifAmmin: e.target.value })}
        />
      </DaneaFormRow>

      <DaneaFormGroupTitle>Contatti</DaneaFormGroupTitle>

      <DaneaFormRow label="Telefono">
        <input className="clienti-input" value={cliente.contatti.telefono} disabled={disabled} onChange={e => patchContatti({ telefono: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Fax">
        <input className="clienti-input" value={cliente.contatti.fax} disabled={disabled} onChange={e => patchContatti({ fax: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Cellulare">
        <input className="clienti-input" value={cliente.contatti.cellulare} disabled={disabled} onChange={e => patchContatti({ cellulare: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="E-mail">
        <input className="clienti-input" value={cliente.contatti.email} disabled={disabled} onChange={e => patchContatti({ email: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Internet">
        <input className="clienti-input" value={cliente.contatti.internet} disabled={disabled} onChange={e => patchContatti({ internet: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormLinks>
        <button type="button" className="clienti-link" onClick={onContattiExtra}>
          Altri contatti ({cliente.contattiExtra.length})…
        </button>
        <button type="button" className="clienti-link" disabled={disabled} onClick={onAggiungiContatto}>
          Aggiungi contatto…
        </button>
      </DaneaFormLinks>

      <DaneaFormRow label="Cod. fiscale">
        <input className="clienti-input" value={cliente.codFiscale} disabled={disabled} onChange={e => onChange({ ...cliente, codFiscale: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Partita Iva">
        <VatNumberAssistField
          value={cliente.partitaIva}
          disabled={disabled}
          inputClassName="clienti-input"
          onChange={v => onChange({ ...cliente, partitaIva: v })}
          onResolved={data =>
            onChange({
              ...cliente,
              sedeOperativa: {
                ...cliente.sedeOperativa,
                ...(data.name && !cliente.sedeOperativa.denominazione.trim() ? { denominazione: data.name } : {}),
                ...(data.address ? { indirizzo: data.address } : {}),
                ...(data.cap ? { cap: data.cap } : {}),
                ...(data.city ? { citta: data.city } : {}),
                ...(data.province ? { prov: data.province } : {}),
              },
            })
          }
        />
      </DaneaFormRow>
    </div>
  )
}
