import { useState } from 'react'
import {
  DOCUMENT_TYPES_FOR_OPTIONS,
  DOCUMENT_TYPE_LABELS,
  DEFAULT_PRINT_LAYOUT,
  type DocumentTemplateFields,
  type ApplicationOptions,
  type DocumentoTipoOptions,
} from '../../../lib/applicationOptions'
import type { ConfermaOrdineStudio } from '../../../lib/confermaOrdineTemplate'
import { PRINT_LAYOUT_OPTIONS } from '../../../lib/printTemplates'
import { DEFAULT_DISCLAIMER } from '../../../lib/studioSettings'
import DocumentTemplateEditorDialog from './DocumentTemplateEditorDialog'
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
  studioPreview?: ConfermaOrdineStudio
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
  studioPreview,
}: Props) {
  const [selectedType, setSelectedType] = useState<string>(DOCUMENT_TYPES_FOR_OPTIONS[0])
  const [editorOpen, setEditorOpen] = useState(false)
  const selected: DocumentoTipoOptions | undefined = value.tipi[selectedType]

  const patchTipo = (patch: Partial<Omit<DocumentoTipoOptions, 'template'>> & { template?: Partial<DocumentTemplateFields> }) => {
    if (!selected) return
    onChange({
      tipi: {
        ...value.tipi,
        [selectedType]: {
          ...selected,
          ...patch,
          template: patch.template ? { ...selected.template, ...patch.template } : selected.template,
        },
      },
    })
  }

  const applyLayoutToAll = (layoutTemplate: DocumentoTipoOptions['layoutTemplate']) => {
    const tipi = { ...value.tipi }
    for (const id of DOCUMENT_TYPES_FOR_OPTIONS) {
      tipi[id] = { ...tipi[id], layoutTemplate }
    }
    onChange({ tipi })
  }

  const openEditor = () => {
    if (!studioPreview?.name?.trim()) {
      alert('Compila almeno la denominazione in «La mia azienda» prima di modificare il template.')
      return
    }
    setEditorOpen(true)
  }

  const selectedLayout = PRINT_LAYOUT_OPTIONS.find(o => o.id === selected?.layoutTemplate)

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
              {DOCUMENT_TYPES_FOR_OPTIONS.map(id => {
                const enabled = value.tipi[id]?.enabled ?? true
                return (
                  <tr
                    key={id}
                    className={`${selectedType === id ? 'opzioni-grid-table__selected' : ''}${enabled ? '' : ' opzioni-grid-table__disabled'}`}
                    onClick={() => setSelectedType(id)}
                  >
                    <td>{DOCUMENT_TYPE_LABELS[id]}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={enabled}
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
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="opzioni-documenti-detail">
          {selected ? (
            <>
              <OpzioniSection label="Template stampa">
                <OpzioniFieldRow label="Layout template" wideLabel>
                  <select
                    className="opzioni-select"
                    value={selected.layoutTemplate ?? DEFAULT_PRINT_LAYOUT}
                    onChange={e => patchTipo({ layoutTemplate: e.target.value as DocumentoTipoOptions['layoutTemplate'] })}
                  >
                    {PRINT_LAYOUT_OPTIONS.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </OpzioniFieldRow>
                {selectedLayout ? <p className="opzioni-template-hint">{selectedLayout.description}</p> : null}
                <div className="opzioni-template-actions">
                  <button type="button" className="opzioni-btn opzioni-btn--secondary" onClick={openEditor}>
                    Modifica template…
                  </button>
                  <button type="button" className="opzioni-link-btn" onClick={() => applyLayoutToAll(DEFAULT_PRINT_LAYOUT)}>
                    Applica layout standard a tutti
                  </button>
                </div>
              </OpzioniSection>

              <OpzioniFieldRow label="Indirizzo di destinazione predefinito" wideLabel>
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
              <OpzioniFieldRow label="Titolo intestazione stampe" wideLabel>
                <input className="opzioni-input" value={selected.titoloStampa} onChange={e => patchTipo({ titoloStampa: e.target.value })} />
              </OpzioniFieldRow>
              <OpzioniFieldRow label="Note a fine documento" wideLabel>
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
          <OpzioniSection label="Disclaimer predefinito (Conferma d'ordine e layout standard)">
            <textarea className="opzioni-textarea" rows={4} value={disclaimer ?? ''} onChange={e => onDisclaimerChange(e.target.value)} />
            <div className="opzioni-template-actions">
              <button type="button" className="opzioni-link-btn" onClick={() => onDisclaimerChange(DEFAULT_DISCLAIMER)}>
                Ripristina testo predefinito
              </button>
            </div>
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

      {editorOpen && selected && studioPreview ? (
        <DocumentTemplateEditorDialog
          documentTypeId={selectedType}
          initialOptions={selected}
          studio={{ ...studioPreview, disclaimer: disclaimer ?? DEFAULT_DISCLAIMER }}
          onApply={next => onChange({ tipi: { ...value.tipi, [selectedType]: next } })}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  )
}
