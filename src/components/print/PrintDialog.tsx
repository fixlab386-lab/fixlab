import { useEffect, useMemo, useState } from 'react'
import {
  buildPrintFilename,
  downloadHtmlAsPdf,
  PRINT_DOCUMENT_CSS,
  printHtmlDocument,
  type PrintModel,
} from '../../lib/printDocument'
import '../../theme/gestionale-dialog.css'
import '../../theme/print-dialog.css'

type PrintDialogProps<TContext> = {
  title?: string
  filenamePrefix: string
  archiveName: string
  models: PrintModel<TContext>[]
  context: TContext
  buildDocument: (modelId: string, context: TContext) => string
  onClose: () => void
}

export default function PrintDialog<TContext>({
  title = 'Stampa',
  filenamePrefix,
  archiveName,
  models,
  context,
  buildDocument,
  onClose,
}: PrintDialogProps<TContext>) {
  const [modelId, setModelId] = useState(models[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const current = models.find(m => m.id === modelId)
    if (current && !(current.isDisabled?.(context) ?? false)) return
    const first = models.find(m => !(m.isDisabled?.(context) ?? false))
    if (first) setModelId(first.id)
  }, [models, modelId, context])

  const activeModel = useMemo(
    () => models.find(m => m.id === modelId) ?? models[0],
    [models, modelId],
  )

  const modelDisabled = activeModel?.isDisabled?.(context) ?? false

  const previewHtml = useMemo(() => {
    if (!activeModel || modelDisabled) {
      return '<div class="print-doc"><p style="padding:24px;color:#666;">Seleziona un cliente dall’elenco per usare questo modello.</p></div>'
    }
    return buildDocument(activeModel.id, context)
  }, [activeModel, buildDocument, context, modelDisabled])

  const documentTitle = useMemo(() => {
    if (!activeModel) return title
    return `${title} — ${activeModel.label}`
  }, [activeModel, title])

  const handlePrint = () => {
    if (!activeModel || modelDisabled) return
    printHtmlDocument(previewHtml, documentTitle)
  }

  const handlePdf = async () => {
    if (!activeModel || modelDisabled) return
    setBusy(true)
    try {
      const filename = buildPrintFilename(filenamePrefix, activeModel.label, archiveName)
      await downloadHtmlAsPdf(previewHtml, filename)
    } catch {
      alert('Generazione PDF non riuscita. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gestionale-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="print-dialog-title">
      <div className="gestionale-dialog-card gestionale-dialog-card--print">
        <div className="gestionale-dialog-card__header">
          <h2 id="print-dialog-title" className="gestionale-dialog-card__title">
            {title}
          </h2>
        </div>

        <div className="gestionale-dialog-card__body print-dialog__body">
          <label className="print-dialog__label" htmlFor="print-model-select">
            Modello di stampa
          </label>
          <select
            id="print-model-select"
            className="print-dialog__select"
            value={modelId}
            onChange={e => setModelId(e.target.value)}
          >
            {models.map(model => {
              const disabled = model.isDisabled?.(context) ?? false
              return (
                <option key={model.id} value={model.id} disabled={disabled}>
                  {model.label}
                  {disabled && model.disabledHint ? ` (${model.disabledHint})` : ''}
                </option>
              )
            })}
          </select>

          {modelDisabled && activeModel?.disabledHint ? (
            <p className="print-dialog__hint">{activeModel.disabledHint}</p>
          ) : null}

          <div className="print-dialog__preview-label">Anteprima</div>
          <div className="print-dialog__preview">
            <style>{PRINT_DOCUMENT_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>

        <div className="gestionale-dialog-card__footer">
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Chiudi
          </button>
          <button
            type="button"
            className="gestionale-dialog-btn gestionale-dialog-btn--primary"
            onClick={handlePrint}
            disabled={modelDisabled || busy}
          >
            Stampa
          </button>
          <button
            type="button"
            className="gestionale-dialog-btn gestionale-dialog-btn--primary"
            onClick={() => void handlePdf()}
            disabled={modelDisabled || busy}
          >
            {busy ? 'PDF…' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
