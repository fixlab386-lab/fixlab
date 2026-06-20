import { RINNOVO_MESI } from '../constants'
import { WinField, WinInput, WinSelect } from '../WinControls'
import type { DocumentoVenditaBanco } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  /** Mostra solo "Data e ora di stampa" (layout Ordine cliente Danea). */
  soloStampa?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

export default function TabOpzioni({ doc, protetto, soloStampa, onChange }: Props) {
  if (soloStampa) {
    return (
      <div className="vb-tab-panel vb-tab-stack" style={{ maxWidth: 480 }}>
        <WinField label="Data e ora di stampa" htmlFor="vb-data-stampa">
          <WinInput id="vb-data-stampa" value={doc.dataOraStampa} readOnly placeholder="Valorizzato al momento della stampa" />
        </WinField>
      </div>
    )
  }

  return (
    <div className="vb-tab-panel vb-tab-stack" style={{ maxWidth: 480 }}>
      <WinField label="Data e ora di stampa" htmlFor="vb-data-stampa">
        <WinInput id="vb-data-stampa" value={doc.dataOraStampa} readOnly placeholder="Valorizzato al momento della stampa" />
      </WinField>

      <WinField label="Cod. lotteria" htmlFor="vb-lotteria">
        <WinInput id="vb-lotteria" value={doc.codLotteria} disabled={protetto} onChange={e => onChange({ codLotteria: e.target.value })} />
      </WinField>

      <label className="vb-check-label" style={{ flexWrap: 'wrap' }}>
        <input
          type="checkbox"
          checked={doc.rinnovo.attivo}
          disabled={protetto}
          onChange={e => onChange({ rinnovo: { ...doc.rinnovo, attivo: e.target.checked } })}
        />
        Ricorda di rinnovare questo documento fra
        <WinSelect
          style={{ width: 100, display: 'inline-block' }}
          value={doc.rinnovo.mesi}
          onChange={e => onChange({ rinnovo: { ...doc.rinnovo, mesi: parseInt(e.target.value, 10) } })}
        >
          {RINNOVO_MESI.map(m => (
            <option key={m} value={m}>
              {m} mesi
            </option>
          ))}
        </WinSelect>
      </label>
    </div>
  )
}
