import { WinField, WinInput, WinSelect } from '../../vendita-banco/WinControls'
import {
  PROPRIETA_FATTURA_ELETTR_VUOTA,
  RIFERIMENTO_FATTURA_ELETTR_OPTIONS,
  type ProprietaFatturaElettronica,
} from '../../shared/proprietaFatturaElettr'

type Props = {
  proprieta: ProprietaFatturaElettronica
  onChange: (patch: Partial<ProprietaFatturaElettronica>) => void
}

export default function TabProprietaFatturaElettr({ proprieta, onChange }: Props) {
  const p = proprieta ?? PROPRIETA_FATTURA_ELETTR_VUOTA

  return (
    <div className="vb-tab-panel vb-tab-proprieta-fe">
      <div className="vb-proprieta-fe__row">
        <WinField label="Riporta in fattura come" htmlFor="oc-fe-tipo" className="vb-proprieta-fe__tipo">
          <WinSelect
            id="oc-fe-tipo"
            value={p.tipo}
            onChange={e => onChange({ tipo: e.target.value as ProprietaFatturaElettronica['tipo'] })}
          >
            {RIFERIMENTO_FATTURA_ELETTR_OPTIONS.map(opt => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </WinSelect>
        </WinField>

        <WinField label="N." htmlFor="oc-fe-numero" className="vb-proprieta-fe__numero">
          <WinInput id="oc-fe-numero" value={p.numero} onChange={e => onChange({ numero: e.target.value })} />
        </WinField>

        <WinField label="del" htmlFor="oc-fe-data" className="vb-proprieta-fe__data">
          <WinInput id="oc-fe-data" type="date" value={p.data} onChange={e => onChange({ data: e.target.value })} />
        </WinField>

        <WinField label="CIG" htmlFor="oc-fe-cig" className="vb-proprieta-fe__cig">
          <WinInput id="oc-fe-cig" value={p.cig} onChange={e => onChange({ cig: e.target.value })} />
        </WinField>

        <WinField label="CUP" htmlFor="oc-fe-cup" className="vb-proprieta-fe__cup">
          <WinInput id="oc-fe-cup" value={p.cup} onChange={e => onChange({ cup: e.target.value })} />
        </WinField>

        <WinField label="Commessa / Convenz." htmlFor="oc-fe-commessa" className="vb-proprieta-fe__commessa">
          <WinInput
            id="oc-fe-commessa"
            value={p.commessaConvenzione}
            onChange={e => onChange({ commessaConvenzione: e.target.value })}
          />
        </WinField>
      </div>
    </div>
  )
}
