import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DOCUMENT_TYPE_LABELS,
  DEFAULT_PRINT_LAYOUT,
  type DocumentTemplateFields,
  type DocumentoTipoOptions,
} from '../../../lib/applicationOptions'
import type { ConfermaOrdineStudio } from '../../../lib/confermaOrdineTemplate'
import {
  PRINT_LAYOUT_OPTIONS,
  buildTemplatePreviewModel,
} from '../../../lib/printTemplates'
import {
  TEMPLATE_CANVAS_PRINT_CSS,
  buildCanvasPrintHtml,
  canvasElementsToTemplateFields,
  resolveCanvasElements,
  type TemplateCanvasElement,
} from '../../../lib/templateCanvas'
import { printHtmlInIframe } from '../../../lib/printDocument'
import TemplateCanvasEditor from './TemplateCanvasEditor'
import { OpzioniFieldRow } from './OpzioniUi'
import '../../../theme/template-editor.css'

type Props = {
  documentTypeId: string
  initialOptions: DocumentoTipoOptions
  studio: ConfermaOrdineStudio
  onApply: (next: DocumentoTipoOptions) => void
  onClose: () => void
  overlayZIndex?: number
}

const ZOOM_LEVELS = [0.5, 0.65, 0.8, 1, 1.2]

export default function DocumentTemplateEditorDialog({
  documentTypeId,
  initialOptions,
  studio,
  onApply,
  onClose,
  overlayZIndex,
}: Props) {
  const [draft, setDraft] = useState<DocumentoTipoOptions>(() => ({
    ...initialOptions,
    template: { ...initialOptions.template },
  }))
  const [elements, setElements] = useState<TemplateCanvasElement[]>(() =>
    resolveCanvasElements(documentTypeId, initialOptions.template),
  )
  const [zoomIdx, setZoomIdx] = useState(2)
  const zoom = ZOOM_LEVELS[zoomIdx] ?? 0.8

  const docLabel = DOCUMENT_TYPE_LABELS[documentTypeId] ?? documentTypeId

  const previewModel = useMemo(
    () => buildTemplatePreviewModel(documentTypeId, studio, draft),
    [documentTypeId, studio, draft],
  )

  const previewHtml = useMemo(() => buildCanvasPrintHtml(elements, previewModel), [elements, previewModel])

  const patchDraft = (patch: Partial<Omit<DocumentoTipoOptions, 'template'>> & { template?: Partial<DocumentTemplateFields> }) => {
    setDraft(prev => ({
      ...prev,
      ...patch,
      template: patch.template ? { ...prev.template, ...patch.template } : prev.template,
    }))
  }

  const handleElementsChange = (next: TemplateCanvasElement[]) => {
    setElements(next)
    const tplPatch = canvasElementsToTemplateFields(next)
    patchDraft({ template: tplPatch })
  }

  const handlePrint = () => {
    printHtmlInIframe(previewHtml, `${docLabel} — anteprima`, TEMPLATE_CANVAS_PRINT_CSS)
  }

  const handleApply = () => {
    onApply({
      ...draft,
      template: {
        ...draft.template,
        ...canvasElementsToTemplateFields(elements),
      },
    })
    onClose()
  }

  const resetLayout = () => {
    if (!window.confirm('Ripristinare il layout predefinito? Perderai le personalizzazioni sul canvas.')) return
    const fresh = resolveCanvasElements(documentTypeId, {
      ...draft.template,
      canvasElements: undefined,
    })
    handleElementsChange(fresh)
  }

  return createPortal(
    <div
      className="template-editor-backdrop gestionale-theme"
      style={overlayZIndex != null ? { zIndex: overlayZIndex } : undefined}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="template-editor template-editor--canvas"
        role="dialog"
        aria-labelledby="template-editor-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="template-editor__header template-editor__header--compact">
          <div>
            <h2 id="template-editor-title" className="template-editor__title">
              Personalizza modello di stampa — {docLabel}
            </h2>
            <p className="template-editor__subtitle">
              Modifica direttamente sul foglio: trascina, ridimensiona e scrivi come in Danea Easyfatt.
            </p>
          </div>
          <div className="template-editor__header-actions">
            <OpzioniFieldRow label="Modello" wideLabel>
              <select
                className="opzioni-select opzioni-select--compact"
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
            <button type="button" className="template-editor__close" onClick={onClose} aria-label="Chiudi">
              ×
            </button>
          </div>
        </header>

        <div className="template-editor__canvas-body">
          <TemplateCanvasEditor
            elements={elements}
            onChange={handleElementsChange}
            previewModel={previewModel}
            zoom={zoom}
          />
        </div>

        <footer className="template-editor__footer template-editor__footer--canvas">
          <button type="button" className="opzioni-btn" onClick={handlePrint} title="Anteprima stampa">
            🔍 Anteprima
          </button>
          <button type="button" className="opzioni-btn opzioni-btn--secondary" onClick={handleApply} title="Salva">
            💾 Salva
          </button>
          <button type="button" className="opzioni-btn" onClick={resetLayout}>
            Ripristina layout
          </button>
          <div className="template-editor__zoom template-editor__zoom--footer">
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
          <button type="button" className="opzioni-btn" onClick={onClose}>
            Chiudi
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
