import type { ApplicationOptions } from '../../../lib/applicationOptions'
import { OpzioniCheckRow, OpzioniFieldRow, OpzioniNumberedFields, OpzioniSection } from './OpzioniUi'

type Props = {
  value: ApplicationOptions['clienti']
  onChange: (patch: Partial<ApplicationOptions['clienti']>) => void
}

export default function TabClientiFornitori({ value, onChange }: Props) {
  return (
    <div className="opzioni-tab-panel">
      <OpzioniSection label="Assegna ai nuovi clienti/fornitori">
        <OpzioniCheckRow
          label="Codice automatico"
          checked={value.codiceAutomatico}
          onChange={v => onChange({ codiceAutomatico: v })}
        />
        <OpzioniFieldRow label="Prossimo codice">
          <input
            className="opzioni-input opzioni-input--sm"
            value={value.prossimoCodice}
            disabled={!value.codiceAutomatico}
            onChange={e => onChange({ prossimoCodice: e.target.value })}
          />
        </OpzioniFieldRow>
        <OpzioniCheckRow
          label="Indirizzo tramite autocompletamento"
          checked={value.autocompletamentoIndirizzo}
          onChange={v => onChange({ autocompletamentoIndirizzo: v })}
          help="Suggerisce CAP, città e provincia durante l'inserimento anagrafica."
        />
      </OpzioniSection>

      <OpzioniSection label="Nomi campi aggiuntivi">
        <OpzioniNumberedFields
          values={value.campiAggiuntivi}
          onChange={campiAggiuntivi => onChange({ campiAggiuntivi })}
        />
      </OpzioniSection>
    </div>
  )
}
