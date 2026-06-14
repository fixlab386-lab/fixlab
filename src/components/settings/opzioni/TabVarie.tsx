import type { ReactNode } from 'react'
import type { ApplicationOptions } from '../../../lib/applicationOptions'
import { OpzioniCheckRow, OpzioniFieldRow, OpzioniSection } from './OpzioniUi'

type Props = {
  value: ApplicationOptions['varie']
  onChange: (patch: Partial<ApplicationOptions['varie']>) => void
  extraSections?: ReactNode
}

const VALUTE = ['€', '$', '£', 'CHF']
const POSIZIONI = ['Sinistra', 'Destra'] as const
const BOLLI = ['Bolli in fattura', 'Marca da bollo', 'Esente']

export default function TabVarie({ value, onChange, extraSections }: Props) {
  return (
    <div className="opzioni-tab-panel">
      <OpzioniCheckRow
        label="Invia informazioni anonime di diagnosi e d'uso"
        checked={value.inviaDiagnostica}
        onChange={v => onChange({ inviaDiagnostica: v })}
        help="Statistiche anonime per migliorare FixLab."
      />

      <OpzioniSection label="Importi">
        <OpzioniFieldRow label="Simbolo valuta">
          <select className="opzioni-select opzioni-select--xs" value={value.simboloValuta} onChange={e => onChange({ simboloValuta: e.target.value })}>
            {VALUTE.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </OpzioniFieldRow>
        <OpzioniFieldRow label="Posizione">
          <select className="opzioni-select opzioni-select--xs" value={value.posizioneValuta} onChange={e => onChange({ posizioneValuta: e.target.value as 'Sinistra' | 'Destra' })}>
            {POSIZIONI.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </OpzioniFieldRow>
        <OpzioniCheckRow
          label={'Nascondi simbolo valuta nelle "righe centrali" delle stampe'}
          checked={value.nascondiSimboloRigheCentrali}
          onChange={v => onChange({ nascondiSimboloRigheCentrali: v })}
        />
      </OpzioniSection>

      <OpzioniSection label="Fisco">
        <OpzioniFieldRow label="Numeraz. acquisti in reverse-charge" help="Suffisso numerazione per reverse charge.">
          <input className="opzioni-input opzioni-input--sm" value={value.numerazReverseCharge} onChange={e => onChange({ numerazReverseCharge: e.target.value })} />
        </OpzioniFieldRow>
        <div className="opzioni-check-row opzioni-check-row--wrap">
          <label className="opzioni-check-row__main">
            <input type="checkbox" checked={value.chiediBolli} onChange={e => onChange({ chiediBolli: e.target.checked })} />
            <span>Chiedi di inserire</span>
          </label>
          <select className="opzioni-select opzioni-select--sm" value={value.bolliTipo} onChange={e => onChange({ bolliTipo: e.target.value })}>
            {BOLLI.map(b => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span>se gli importi senza Iva superano € {value.bolliSoglia.toFixed(2).replace('.', ',')}</span>
          <label className="opzioni-check-row__main">
            <input
              type="checkbox"
              checked={value.bolliAncheOrdiniPreventivi}
              onChange={e => onChange({ bolliAncheOrdiniPreventivi: e.target.checked })}
            />
            <span>Anche su ordini e preventivi</span>
          </label>
        </div>
        <OpzioniCheckRow
          label="Attiva regime dell'Iva per cassa (nelle nuove fatture)"
          checked={value.ivaPerCassa}
          onChange={v => onChange({ ivaPerCassa: v })}
        />
      </OpzioniSection>

      <OpzioniSection label="Configurazione invio posta elettronica">
        <div className="opzioni-btn-row">
          <button type="button" className="opzioni-btn" onClick={() => alert('Configurazione invio e-mail — in arrivo.')}>
            Invio e-mail…
          </button>
          <button type="button" className="opzioni-btn" onClick={() => alert('Configurazione PEC — in arrivo.')}>
            Invio PEC…
          </button>
        </div>
      </OpzioniSection>

      {extraSections}
    </div>
  )
}
