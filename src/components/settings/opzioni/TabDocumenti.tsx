import { useState } from 'react'
import {
  DOCUMENT_TYPES_FOR_OPTIONS,
  DOCUMENT_TYPE_LABELS,
  type ApplicationOptions,
  type DocumentoTipoOptions,
} from '../../../lib/applicationOptions'
import { OpzioniCheckRow, OpzioniFieldRow, OpzioniNumberedFields, OpzioniSection } from './OpzioniUi'

type Props = {
  value: ApplicationOptions['documenti']
  onChange: (patch: Partial<ApplicationOptions['documenti']>) => void
  disclaimer?: string
  onDisclaimerChange?: (v: string) => void
  rtModel?: string
  rtIp?: string
  onRtModelChange?: (v: string) => void
  onRtIpChange?: (v: string) => void
  rtModels?: { value: string; label: string }[]
}

const DEST_OPTIONS = ['Destinazione merce', 'Sede legale', 'Sede operativa', '(Nessuna)']
const QTA_DECIMALI = ['(auto)', '0', '1', '2', '3', '4']

export default function TabDocumenti({
  value,
  onChange,
  disclaimer,
  onDisclaimerChange,
  rtModel,
  rtIp,
  onRtModelChange,
  onRtIpChange,
  rtModels,
}: Props) {
  const [selectedType, setSelectedType] = useState<string>(DOCUMENT_TYPES_FOR_OPTIONS[0])
  const selected: DocumentoTipoOptions | undefined = value.tipi[selectedType]

  const patchTipo = (patch: Partial<DocumentoTipoOptions>) => {
    if (!selected) return
    onChange({
      tipi: { ...value.tipi, [selectedType]: { ...selected, ...patch } },
    })
  }

  return (
    <div className="opzioni-tab-panel opzioni-tab-panel--documenti">
      <div className="opzioni-documenti-split">
        <div className="opzioni-documenti-list">
          <table className="opzioni-grid-table">
            <thead>
              <tr>
                <th>Tipo documento</th>
                <th>Abilitato</th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENT_TYPES_FOR_OPTIONS.map(id => (
                <tr
                  key={id}
                  className={selectedType === id ? 'opzioni-grid-table__selected' : undefined}
                  onClick={() => setSelectedType(id)}
                >
                  <td>{DOCUMENT_TYPE_LABELS[id]}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={value.tipi[id]?.enabled ?? true}
                      onChange={e => {
                        e.stopPropagation()
                        onChange({
                          tipi: {
                            ...value.tipi,
                            [id]: { ...value.tipi[id], enabled: e.target.checked },
                          },
                        })
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="opzioni-documenti-detail">
          {selected ? (
            <>
              <OpzioniFieldRow label="Indirizzo di destinazione predefinito">
                <select className="opzioni-select" value={selected.destPredefinito} onChange={e => patchTipo({ destPredefinito: e.target.value })}>
                  {DEST_OPTIONS.map(o => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </OpzioniFieldRow>
              <OpzioniCheckRow label="Usa prezzi ivati" checked={selected.usaPrezziIvati} onChange={v => patchTipo({ usaPrezziIvati: v })} />
              <OpzioniCheckRow
                label="Blocca modifiche in riapertura documento"
                checked={selected.bloccaModifiche}
                onChange={v => patchTipo({ bloccaModifiche: v })}
              />
              <OpzioniCheckRow
                label="Numeraz. automatica"
                checked={selected.numerazAutomatica}
                onChange={v => patchTipo({ numerazAutomatica: v })}
              />
              <OpzioniFieldRow label="Titolo intestazione stampe">
                <input className="opzioni-input" value={selected.titoloStampa} onChange={e => patchTipo({ titoloStampa: e.target.value })} />
              </OpzioniFieldRow>
              <OpzioniFieldRow label="Note a fine documento">
                <textarea className="opzioni-textarea" rows={4} value={selected.noteFine} onChange={e => patchTipo({ noteFine: e.target.value })} />
              </OpzioniFieldRow>
            </>
          ) : null}
        </div>
      </div>

      <div className="opzioni-documenti-bottom">
        <OpzioniFieldRow label="N. decimali su Q.tà">
          <select className="opzioni-select opzioni-select--xs" value={value.decimaliQta} onChange={e => onChange({ decimaliQta: e.target.value })}>
            {QTA_DECIMALI.map(o => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </OpzioniFieldRow>

        <OpzioniSection label="Nomi campi aggiuntivi">
          <OpzioniNumberedFields values={value.campiAggiuntivi} onChange={campiAggiuntivi => onChange({ campiAggiuntivi })} />
        </OpzioniSection>

        {onDisclaimerChange ? (
          <OpzioniSection label="Disclaimer / testi stampa">
            <textarea className="opzioni-textarea" rows={4} value={disclaimer ?? ''} onChange={e => onDisclaimerChange(e.target.value)} />
          </OpzioniSection>
        ) : null}

        {onRtModelChange && rtModels ? (
          <OpzioniSection label="Registratore di cassa / RT">
            <OpzioniFieldRow label="Modello">
              <select className="opzioni-select" value={rtModel ?? ''} onChange={e => onRtModelChange(e.target.value)}>
                {rtModels.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </OpzioniFieldRow>
            {rtModel && rtModel !== 'none' ? (
              <OpzioniFieldRow label="Indirizzo IP">
                <input className="opzioni-input" value={rtIp ?? ''} onChange={e => onRtIpChange?.(e.target.value)} placeholder="192.168.1.100" />
              </OpzioniFieldRow>
            ) : null}
          </OpzioniSection>
        ) : null}
      </div>
    </div>
  )
}
