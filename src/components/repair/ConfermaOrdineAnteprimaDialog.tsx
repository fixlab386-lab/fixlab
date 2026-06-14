import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { CONFERMA_ORDINE_PRINT_CSS } from '../../lib/confermaOrdineTemplate'
import { printHtmlInIframe } from '../../lib/printDocument'

export type ConfermaOrdineAnteprimaMeta = {
  title: string
  filename: string
  onPdf: () => void | Promise<void>
}

type Props = {
  innerHtml: string
  meta: ConfermaOrdineAnteprimaMeta
  initialCopie?: number
  onClose: () => void
}

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5]

export default function ConfermaOrdineAnteprimaDialog({ innerHtml, meta, initialCopie = 1, onClose }: Props) {
  const [copie, setCopie] = useState(Math.max(1, initialCopie))
  const [zoomIdx, setZoomIdx] = useState(3)
  const [busy, setBusy] = useState(false)
  const zoom = ZOOM_LEVELS[zoomIdx] ?? 1

  const handlePrint = useCallback(() => {
    for (let i = 0; i < copie; i++) {
      printHtmlInIframe(innerHtml, meta.title, CONFERMA_ORDINE_PRINT_CSS)
    }
  }, [copie, innerHtml, meta.title])

  const handlePdf = useCallback(async () => {
    setBusy(true)
    try {
      await meta.onPdf()
    } catch {
      alert('Generazione PDF non riuscita.')
    } finally {
      setBusy(false)
    }
  }, [meta])

  return createPortal(
    <div className="clienti-anteprima" role="dialog" aria-modal="true" aria-label="Anteprima di Stampa">
      <div className="clienti-anteprima__window">
        <div className="clienti-anteprima__titlebar">
          <span>Anteprima di Stampa — Conferma d&apos;ordine</span>
        </div>
        <div className="clienti-anteprima__canvas">
          <div className="clienti-anteprima__scroll">
            <div className="clienti-anteprima__paper-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <div className="clienti-anteprima__paper">
                <style>{CONFERMA_ORDINE_PRINT_CSS}</style>
                <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
              </div>
            </div>
          </div>
        </div>
        <div className="clienti-anteprima__toolbar">
          <div className="clienti-anteprima__toolbar-group">
            <button type="button" className="clienti-anteprima__btn" onClick={handlePrint} disabled={busy}>
              🖨 Stampa
            </button>
            <label className="clienti-anteprima__copie">
              <input
                type="number"
                min={1}
                max={99}
                value={copie}
                onChange={e => setCopie(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span>copie</span>
            </label>
            <button type="button" className="clienti-anteprima__btn" onClick={() => void handlePdf()} disabled={busy}>
              📄 Pdf
            </button>
          </div>
          <div className="clienti-anteprima__toolbar-group clienti-anteprima__toolbar-group--center">
            <span className="clienti-anteprima__page-info">Pag. 1 di 1</span>
            <button type="button" className="clienti-anteprima__nav" onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx <= 0}>
              −
            </button>
            <button
              type="button"
              className="clienti-anteprima__nav"
              onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            >
              +
            </button>
          </div>
          <div className="clienti-anteprima__toolbar-group">
            <button type="button" className="clienti-anteprima__btn" onClick={onClose}>
              ✕ Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
