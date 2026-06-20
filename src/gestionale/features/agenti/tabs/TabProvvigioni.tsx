import type { Agent } from '../../../../types'
import { calcProvvigioneDocumento, findAgentByName } from '../agentCommissions'

type Props = {
  agente: string
  listino: string
  totNetto: number
  agents: Agent[]
}

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

export default function TabProvvigioni({ agente, listino, totNetto, agents }: Props) {
  const agent = findAgentByName(agents, agente)
  const { totVenduto, provvigioneDovuta, percentuale } = calcProvvigioneDocumento(agent, listino, totNetto)

  return (
    <div className="vb-tab-panel vb-tab-provvigioni">
      <p className="vb-tab-provvigioni__intro">
        La provvigione è la percentuale spettante all&apos;agente di vendita sul totale imponibile del documento,
        in base al listino cliente e alle percentuali configurate in <strong>Elenco agenti</strong>.
      </p>

      {!agent ? (
        <p className="vb-tab-provvigioni__hint">Seleziona un agente nell&apos;intestazione del documento per calcolare la provvigione.</p>
      ) : (
        <div className="vb-tab-provvigioni__agent">
          Agente: <strong>{agent.name}</strong>
          {agent.isActive === false ? <span className="vb-tab-provvigioni__muted"> (nascosto)</span> : null}
        </div>
      )}

      <div className="vb-tab-provvigioni__grid">
        <div className="vb-tab-provvigioni__row">
          <span className="vb-tab-provvigioni__label">Tot. venduto (imponibile)</span>
          <strong className="vb-tab-provvigioni__value">{formatEuro(totVenduto)}</strong>
        </div>
        <div className="vb-tab-provvigioni__row">
          <span className="vb-tab-provvigioni__label">
            Aliquota provvigione{agent ? ` (${percentuale.toFixed(2).replace('.', ',')} %)` : ''}
          </span>
          <span className="vb-tab-provvigioni__value vb-tab-provvigioni__value--muted">
            {agent ? `${percentuale.toFixed(2).replace('.', ',')} %` : '—'}
          </span>
        </div>
        <div className="vb-tab-provvigioni__row vb-tab-provvigioni__row--total">
          <span className="vb-tab-provvigioni__label">Provvigione dovuta</span>
          <strong className="vb-tab-provvigioni__value vb-tab-provvigioni__value--accent">
            {formatEuro(provvigioneDovuta)}
          </strong>
        </div>
      </div>
    </div>
  )
}
