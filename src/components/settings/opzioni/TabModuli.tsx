import type { ApplicationOptions } from '../../../lib/applicationOptions'
import { OpzioniCheckRow, OpzioniSection } from './OpzioniUi'

type Props = {
  value: ApplicationOptions['moduli']
  onChange: (patch: Partial<ApplicationOptions['moduli']>) => void
  onUtenti?: () => void
  onConfiguraVendita?: () => void
}

const ECO_TIPI = ['RAEE', 'Pile', 'Altro']
const TERMINALE_FORMATI = ['A6Q', 'A4', 'CSV', 'Custom']

export default function TabModuli({ value, onChange, onUtenti, onConfiguraVendita }: Props) {
  return (
    <div className="opzioni-tab-panel">
      <OpzioniSection label="Abilita supporto per:">
        <OpzioniCheckRow
          label="Controllo accessi"
          checked={value.controlloAccessi}
          onChange={v => onChange({ controlloAccessi: v })}
          help="Gestione utenti e permessi di accesso."
        >
          <button type="button" className="opzioni-inline-btn" disabled={!value.controlloAccessi} onClick={onUtenti}>
            Utenti…
          </button>
        </OpzioniCheckRow>
        <OpzioniCheckRow
          label="Ritenute e contributi previdenziali"
          checked={value.ritenutePrevidenziali}
          onChange={v => onChange({ ritenutePrevidenziali: v })}
        />
        <OpzioniCheckRow
          label="Pagamenti con TeamSystem Pay"
          checked={value.teamSystemPay}
          onChange={v => onChange({ teamSystemPay: v })}
        />
        <OpzioniCheckRow label="E-commerce" checked={value.ecommerce} onChange={v => onChange({ ecommerce: v })} />
        <OpzioniCheckRow label="Eco-contributo" checked={value.ecocontributo} onChange={v => onChange({ ecocontributo: v })}>
          <select
            className="opzioni-select opzioni-select--sm"
            value={value.ecocontributoTipo}
            disabled={!value.ecocontributo}
            onChange={e => onChange({ ecocontributoTipo: e.target.value })}
          >
            {ECO_TIPI.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </OpzioniCheckRow>
        <OpzioniCheckRow
          label="Semaforo eventi negativi…"
          checked={value.semaforoEventiNegativi}
          onChange={v => onChange({ semaforoEventiNegativi: v })}
          help="Segnala fallimenti, protesti, procedure concorsuali e pregiudizievoli."
        />
        <p className="opzioni-note">
          (segnala fallimenti, protesti, procedure concorsuali e pregiudizievoli; riferisce n. dipendenti, fatturato e
          margine operativo)
        </p>
      </OpzioniSection>

      <OpzioniSection label="Magazzino:">
        <OpzioniCheckRow
          label="Gestione magazzino"
          checked={value.magazzinoGestione}
          onChange={v => onChange({ magazzinoGestione: v })}
        />
        <div className="opzioni-indent">
          <OpzioniCheckRow
            label="Con più magazzini"
            checked={value.magazzinoMultiplo}
            disabled={!value.magazzinoGestione}
            onChange={v => onChange({ magazzinoMultiplo: v })}
          />
        </div>
        <OpzioniCheckRow
          label="Lotti, scadenze, seriali"
          checked={value.lottiScadenzeSeriali}
          onChange={v => onChange({ lottiScadenzeSeriali: v })}
        />
        <OpzioniCheckRow label="Taglie e colori" checked={value.taglieColori} onChange={v => onChange({ taglieColori: v })} />
        <OpzioniCheckRow
          label="Cod. a barre con prezzo/quantità variabile"
          checked={value.barcodePrezzoVariabile}
          onChange={v => onChange({ barcodePrezzoVariabile: v })}
        />
        <OpzioniCheckRow
          label="Terminali portatili bar-code"
          checked={value.terminaliPortatili}
          onChange={v => onChange({ terminaliPortatili: v })}
        >
          <span className="opzioni-inline-label">Formato file:</span>
          <select
            className="opzioni-select opzioni-select--sm"
            value={value.terminaleFormato}
            disabled={!value.terminaliPortatili}
            onChange={e => onChange({ terminaleFormato: e.target.value })}
          >
            {TERMINALE_FORMATI.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </OpzioniCheckRow>
      </OpzioniSection>

      <OpzioniSection label="Negozio:">
        <OpzioniCheckRow
          label="Registratore di cassa"
          checked={value.registratoreCassa}
          onChange={v => onChange({ registratoreCassa: v })}
        />
        <OpzioniCheckRow
          label="Vendita al banco con touchscreen"
          checked={value.venditaTouchscreen}
          onChange={v => onChange({ venditaTouchscreen: v })}
        >
          <button type="button" className="opzioni-inline-btn" onClick={onConfiguraVendita}>
            Configura…
          </button>
        </OpzioniCheckRow>
        <OpzioniCheckRow label="Carte fedeltà" checked={value.carteFedelta} onChange={v => onChange({ carteFedelta: v })} />
      </OpzioniSection>
    </div>
  )
}
