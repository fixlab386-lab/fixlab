import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DOCUMENT_TYPE_LABELS,
  DEFAULT_PRINT_LAYOUT,
  type DocumentTemplateFields,
  type DocumentoTipoOptions,
} from '../../../lib/applicationOptions'
import { CONFERMA_ORDINE_PRINT_CSS } from '../../../lib/confermaOrdineTemplate'
import type { ConfermaOrdineStudio } from '../../../lib/confermaOrdineTemplate'
import { PRINT_LAYOUT_OPTIONS, buildTemplatePreviewHtml } from '../../../lib/printTemplates'
import { printHtmlInIframe } from '../../../lib/printDocument'
import { OpzioniCheckRow, OpzioniFieldRow } from './OpzioniUi'
import '../../../theme/template-editor.css'

type Props = {
  documentTypeId: string
  initialOptions: DocumentoTipoOptions
  studio: ConfermaOrdineStudio
  onApply: (next: DocumentoTipoOptions) => void
  onClose: () => void
}

const ZOOM_LEVELS = [0.55, 0.7, 0.85, 1, 1.15]

export default function DocumentTemplateEditorDialog({
  documentTypeId,
  initialOptions,
  studio,
  onApply,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<DocumentoTipoOptions>(() => ({
    ...initialOptions,
    template: { ...initialOptions.template },
  }))
  const [zoomIdx, setZoomIdx] = useState(2)
  const zoom = ZOOM_LEVELS[zoomIdx] ?? 0.85

  const docLabel = DOCUMENT_TYPE_LABELS[documentTypeId] ?? documentTypeId
  const previewHtml = useMemo(
    () => buildTemplatePreviewHtml(documentTypeId, studio, draft),
    [documentTypeId, studio, draft],
  )

  const patchDraft = (patch: Partial<Omit<DocumentoTipoOptions, 'template'>> & { template?: Partial<DocumentTemplateFields> }) => {
    setDraft(prev => ({
      ...prev,
      ...patch,
      template: patch.template ? { ...prev.template, ...patch.template } : prev.template,
    }))
  }

  const handlePrint = () => {
    printHtmlInIframe(previewHtml, `${docLabel} — anteprima`, CONFERMA_ORDINE_PRINT_CSS)
  }

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  return createPortal(
    <div className="template-editor-backdrop gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="template-editor" role="dialog" aria-labelledby="template-editor-title" onClick={e => e.stopPropagation()}>
        <header className="template-editor__header">
          <div>
            <h2 id="template-editor-title" className="template-editor__title">
              Modifica template — {docLabel}
            </h2>
            <p className="template-editor__subtitle">Personalizza intestazione, riquadri e testi di stampa. L&apos;anteprima si aggiorna in tempo reale.</p>
          </div>
          <button type="button" className="template-editor__close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </header>

        <div className="template-editor__body">
          <aside className="template-editor__form">
            <section className="template-editor__section">
              <h3>Layout</h3>
              <OpzioniFieldRow label="Modello stampa" wideLabel>
                <select
                  className="opzioni-select"
                  value={draft.layoutTemplate ?? DEFAULT_PRINT_LAYOUT}
                  onChange={e => patchDraft({ layoutTemplate: e.target.value as DocumentoTipoOptions['layoutTemplate'] })}
                >
                  {PRINT_LAYOUT_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </OpzioniFieldRow>
            </section>

            <section className="template-editor__section">
              <h3>Intestazione documento</h3>
              <OpzioniFieldRow label="Titolo in stampa" wideLabel>
                <input
                  className="opzioni-input"
                  value={draft.titoloStampa}
                  onChange={e => patchDraft({ titoloStampa: e.target.value })}
                  placeholder="Es. Preventivo"
                />
              </OpzioniFieldRow>
            </section>

            <section className="template-editor__section">
              <h3>Riquadri</h3>
              <OpzioniFieldRow label="Titolo riquadro cliente" wideLabel>
                <input
                  className="opzioni-input"
                  value={draft.template.clientBoxTitle}
                  onChange={e => patchDraft({ template: { clientBoxTitle: e.target.value } })}
                />
              </OpzioniFieldRow>
              <OpzioniCheckRow
                label="Mostra secondo riquadro"
                checked={draft.template.showSecondBox}
                onChange={v => patchDraft({ template: { showSecondBox: v } })}
              />
              {draft.template.showSecondBox ? (
                <OpzioniFieldRow label="Titolo secondo riquadro" wideLabel>
                  <input
                    className="opzioni-input"
                    value={draft.template.secondBoxTitle}
                    onChange={e => patchDraft({ template: { secondBoxTitle: e.target.value } })}
                    placeholder={documentTypeId === 'conferma_ordine' ? 'Informazioni dispositivo' : 'Note'}
                  />
                </OpzioniFieldRow>
              ) : null}
            </section>

            <section className="template-editor__section">
              <h3>Piede documento</h3>
              <OpzioniFieldRow label="Etichetta firma" wideLabel>
                <input
                  className="opzioni-input"
                  value={draft.template.signatureLabel}
                  onChange={e => patchDraft({ template: { signatureLabel: e.target.value } })}
                />
              </OpzioniFieldRow>
              <OpzioniFieldRow label="Etichetta totale" wideLabel>
                <input
                  className="opzioni-input"
                  value={draft.template.totalLabel}
                  onChange={e => patchDraft({ template: { totalLabel: e.target.value } })}
                />
              </OpzioniFieldRow>
              <OpzioniFieldRow label="Note / disclaimer" wideLabel>
                <textarea
                  className="opzioni-textarea"
                  rows={5}
                  value={draft.noteFine}
                  onChange={e => patchDraft({ noteFine: e.target.value })}
                  placeholder="Testo a fine documento. Se vuoto, usa il disclaimer predefinito dello studio."
                />
              </OpzioniFieldRow>
            </section>
          </aside>

          <div className="template-editor__preview">
            <div className="template-editor__preview-toolbar">
              <span>Anteprima live</span>
              <div className="template-editor__zoom">
                <button type="button" onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx <= 0}>
                  −
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
                  disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
                >
                  +
                </button>
              </div>
            </div>
            <div className="template-editor__preview-scroll">
              <div className="template-editor__paper-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                <div className="template-editor__paper">
                  <style>{CONFERMA_ORDINE_PRINT_CSS}</style>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="template-editor__footer">
          <button type="button" className="opzioni-btn" onClick={handlePrint}>
            Stampa anteprima
          </button>
          <button type="button" className="opzioni-btn opzioni-btn--secondary" onClick={handleApply}>
            Applica modifiche
          </button>
          <button type="button" className="opzioni-btn" onClick={onClose}>
            Chiudi
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
