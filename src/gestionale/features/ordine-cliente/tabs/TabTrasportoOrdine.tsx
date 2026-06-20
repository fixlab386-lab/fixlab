import { WinField, WinInput } from '../../vendita-banco/WinControls'
import type { DocumentoOrdineCliente } from '../types'

type Props = {
  doc: DocumentoOrdineCliente
  onChange: (patch: Partial<DocumentoOrdineCliente>) => void
}

export default function TabTrasportoOrdine({ doc, onChange }: Props) {
  const t = doc.trasporto
  const patchTrasporto = (patch: Partial<typeof t>) =>
    onChange({ trasporto: { ...t, ...patch } })

  return (
    <div className="vb-tab-panel vb-tab-stack">
      <WinField label="Causale" htmlFor="oc-tr-causale">
        <WinInput id="oc-tr-causale" value={t.causale} onChange={e => patchTrasporto({ causale: e.target.value })} />
      </WinField>
      <WinField label="Data e ora di inizio trasporto" htmlFor="oc-tr-inizio">
        <WinInput
          id="oc-tr-inizio"
          type="datetime-local"
          value={t.inizio}
          onChange={e => patchTrasporto({ inizio: e.target.value })}
        />
      </WinField>
      <WinField label="Porto" htmlFor="oc-tr-porto">
        <WinInput id="oc-tr-porto" value={t.porto} onChange={e => patchTrasporto({ porto: e.target.value })} />
      </WinField>
      <WinField label="Incaricato del trasporto" htmlFor="oc-tr-incaricato">
        <WinInput
          id="oc-tr-incaricato"
          value={t.incaricato}
          onChange={e => patchTrasporto({ incaricato: e.target.value })}
        />
      </WinField>
      <div className="oc-selezione-cliente__row2">
        <WinField label="N. colli" htmlFor="oc-tr-colli">
          <WinInput id="oc-tr-colli" value={t.colli} onChange={e => patchTrasporto({ colli: e.target.value })} />
        </WinField>
        <WinField label="Peso" htmlFor="oc-tr-peso">
          <WinInput id="oc-tr-peso" value={t.peso} onChange={e => patchTrasporto({ peso: e.target.value })} />
        </WinField>
      </div>
      <WinField label="Aspetto beni" htmlFor="oc-tr-aspetto">
        <WinInput id="oc-tr-aspetto" value={t.aspetto} onChange={e => patchTrasporto({ aspetto: e.target.value })} />
      </WinField>
      <WinField label="Cod. spedizione" htmlFor="oc-tr-cod">
        <WinInput
          id="oc-tr-cod"
          value={t.codSpedizione}
          onChange={e => patchTrasporto({ codSpedizione: e.target.value })}
        />
      </WinField>
    </div>
  )
}
