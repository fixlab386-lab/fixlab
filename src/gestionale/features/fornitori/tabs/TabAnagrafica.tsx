import { NAZIONI } from '../constants'
import { openMapsForAddress } from '../../../../lib/maps'
import SedeCapFields from '../../shared/SedeCapFields'
import { DaneaFormGroupTitle, DaneaFormLinks, DaneaFormRow } from '../../../components/DaneaFormRow'
import type { Fornitore } from '../types'

type Props = {
  fornitore: Fornitore
  disabled?: boolean
  onChange: (c: Fornitore) => void
  onRicercaNazionale: () => void
  onSedeLegale: () => void
  onSediAmmin: () => void
  onSediExtra: () => void
  onAggiungiIndirizzo: () => void
  onContattiExtra: () => void
  onAggiungiContatto: () => void
}

export default function TabAnagrafica({
  fornitore,
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
  const patchSede = (patch: Partial<Fornitore['sedeOperativa']>) =>
    onChange({ ...fornitore, sedeOperativa: { ...fornitore.sedeOperativa, ...patch } })
  const patchContatti = (patch: Partial<Fornitore['contatti']>) =>
    onChange({ ...fornitore, contatti: { ...fornitore.contatti, ...patch } })

  return (
    <div className="danea-form">
      <DaneaFormGroupTitle>
        <span>Sede operativa</span>
        <button type="button" className="danea-form__edit-btn" title="Ricerca su elenco nazionale" disabled={disabled} onClick={onRicercaNazionale}>
          ℹ
        </button>
      </DaneaFormGroupTitle>

      <DaneaFormRow label="Denominaz.">
        <input
          className="clienti-input"
          value={fornitore.sedeOperativa.denominazione}
          disabled={disabled}
          onChange={e => patchSede({ denominazione: e.target.value })}
        />
        <button type="button" className="danea-form__edit-btn" title="Ricerca nazionale" disabled={disabled} onClick={onRicercaNazionale}>
          ▾
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Indirizzo">
        <input
          className="clienti-input"
          value={fornitore.sedeOperativa.indirizzo}
          disabled={disabled}
          onChange={e => patchSede({ indirizzo: e.target.value })}
        />
      </DaneaFormRow>

      <SedeCapFields
        cap={fornitore.sedeOperativa.cap}
        citta={fornitore.sedeOperativa.citta}
        prov={fornitore.sedeOperativa.prov}
        disabled={disabled}
        onPatch={patch => patchSede(patch)}
      />

      <DaneaFormRow label="Nazione">
        <select
          className="clienti-select"
          value={fornitore.sedeOperativa.nazione}
          disabled={disabled}
          onChange={e => patchSede({ nazione: e.target.value })}
        >
          {NAZIONI.map(n => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button type="button" className="danea-form__edit-btn" title="Mappa" onClick={() => openMapsForAddress(fornitore.sedeOperativa)}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormLinks>
        <button type="button" className="clienti-link" onClick={onSediExtra}>
          Altri indirizzi ({fornitore.sediExtra.length})
        </button>
        <button type="button" className="clienti-link" disabled={disabled} onClick={onAggiungiIndirizzo}>
          Aggiungi indirizzo…
        </button>
        <button type="button" className="clienti-link" onClick={onSedeLegale}>
          Sede legale{fornitore.sedeLegale ? ' ✓' : ''}
        </button>
        <button type="button" className="clienti-link" onClick={onSediAmmin}>
          Sedi ammin. ({fornitore.sediAmmin.length})
        </button>
      </DaneaFormLinks>

      <DaneaFormGroupTitle>Contatti</DaneaFormGroupTitle>

      <DaneaFormRow label="Referente">
        <input
          className="clienti-input"
          value={fornitore.contattiExtra[0]?.label ?? ''}
          disabled={disabled}
          onChange={e => {
            const label = e.target.value
            const extra = [...fornitore.contattiExtra]
            if (extra.length === 0) extra.push({ label: '', telefono: '', cellulare: '', email: '' })
            extra[0] = { ...extra[0], label }
            onChange({ ...fornitore, contattiExtra: extra })
          }}
        />
      </DaneaFormRow>

      <DaneaFormRow label="Fax">
        <input className="clienti-input" value={fornitore.contatti.fax} disabled={disabled} onChange={e => patchContatti({ fax: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Telefono">
        <input className="clienti-input" value={fornitore.contatti.telefono} disabled={disabled} onChange={e => patchContatti({ telefono: e.target.value })} />
        <button type="button" className="danea-form__edit-btn" title="Chiama" disabled={disabled}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="e-mail">
        <input className="clienti-input" value={fornitore.contatti.email} disabled={disabled} onChange={e => patchContatti({ email: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Pec">
        <input
          className="clienti-input"
          value={fornitore.fatturaElettronica.recapito === 'PEC' ? fornitore.fatturaElettronica.valore : ''}
          disabled={disabled}
          onChange={e =>
            onChange({
              ...fornitore,
              fatturaElettronica: { ...fornitore.fatturaElettronica, recapito: 'PEC', valore: e.target.value },
            })
          }
        />
      </DaneaFormRow>

      <DaneaFormLinks>
        <button type="button" className="clienti-link" onClick={onContattiExtra}>
          Altri contatti ({fornitore.contattiExtra.length})…
        </button>
        <button type="button" className="clienti-link" disabled={disabled} onClick={onAggiungiContatto}>
          Aggiungi contatto…
        </button>
      </DaneaFormLinks>
    </div>
  )
}
