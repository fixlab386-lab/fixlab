import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadHtmlAsPdf, printHtmlInIframe } from '../../../../lib/printDocument'
import { VENDITA_BANCO_PRINT_CSS } from '../../../../lib/venditaBancoPrint'
import { formatEuro } from '../utils'

export type AnteprimaStampaMeta = {
  title: string
  filename: string
  fullNumber: string
  docDate: string
  clienteNome: string
  totalDocument: number
  studioName: string
}

type Props = {
  innerHtml: string
  meta: AnteprimaStampaMeta
  initialCopie?: number
  onClose: () => void
}

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5]

export default function AnteprimaStampaDialog({ innerHtml, meta, initialCopie = 1, onClose }: Props) {
  const [copie, setCopie] = useState(Math.max(1, initialCopie))
  const [zoomIdx, setZoomIdx] = useState(3)
  const [busy, setBusy] = useState(false)
  const zoom = ZOOM_LEVELS[zoomIdx] ?? 1

  const handlePrint = useCallback(() => {
    for (let i = 0; i < copie; i++) {
      printHtmlInIframe(innerHtml, meta.title, VENDITA_BANCO_PRINT_CSS)
    }
  }, [copie, innerHtml, meta.title])

  const handlePdf = useCallback(async () => {
    setBusy(true)
    try {
      await downloadHtmlAsPdf(innerHtml, meta.filename, VENDITA_BANCO_PRINT_CSS)
    } catch {
      alert('Generazione PDF non riuscita.')
    } finally {
      setBusy(false)
    }
  }, [innerHtml, meta.filename])

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(`Vendita al banco ${meta.fullNumber}`)
    const body = encodeURIComponent(
      [
        `Vendita al banco n. ${meta.fullNumber} del ${meta.docDate}`,
        `Cliente: ${meta.clienteNome}`,
        `Totale documento: ${formatEuro(meta.totalDocument)}`,
        '',
        meta.studioName,
      ].join('\n'),
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }, [meta])

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(
      `Vendita al banco n. ${meta.fullNumber} del ${meta.docDate}\nCliente: ${meta.clienteNome}\nTotale: ${formatEuro(meta.totalDocument)}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [meta])

  return createPortal(
    <div className="vb-anteprima" role="dialog" aria-modal="true" aria-label="Anteprima di Stampa">
      <div className="vb-anteprima__window">
        <div className="vb-anteprima__titlebar">
          <span>Anteprima di Stampa</span>
        </div>

        <div className="vb-anteprima__canvas">
          <div className="vb-anteprima__scroll">
            <div className="vb-anteprima__paper-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <div className="vb-anteprima__paper">
                <style>{VENDITA_BANCO_PRINT_CSS}</style>
                <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
              </div>
            </div>
          </div>
        </div>

        <div className="vb-anteprima__toolbar">
          <div className="vb-anteprima__toolbar-group">
            <button type="button" className="vb-anteprima__btn" onClick={handlePrint} disabled={busy}>
              <span className="vb-anteprima__icon">🖨</span> Stampa
            </button>
            <label className="vb-anteprima__copie">
              <input
                type="number"
                min={1}
                max={99}
                value={copie}
                onChange={e => setCopie(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span>copie</span>
            </label>
            <button type="button" className="vb-anteprima__btn" onClick={handleEmail} disabled={busy}>
              <span className="vb-anteprima__icon">✉</span> e-mail
            </button>
            <button type="button" className="vb-anteprima__btn" onClick={handleWhatsApp} disabled={busy}>
              <span className="vb-anteprima__icon vb-anteprima__icon--wa">W</span> WhatsApp
            </button>
            <button type="button" className="vb-anteprima__btn" onClick={() => void handlePdf()} disabled={busy}>
              <span className="vb-anteprima__icon vb-anteprima__icon--pdf">PDF</span> Pdf
            </button>
          </div>

          <div className="vb-anteprima__toolbar-group vb-anteprima__toolbar-group--center">
            <button type="button" className="vb-anteprima__nav" disabled title="Prima pagina">
              «
            </button>
            <button type="button" className="vb-anteprima__nav" disabled title="Pagina precedente">
              ‹
            </button>
            <span className="vb-anteprima__page-info">Pag. 1 di 1</span>
            <button type="button" className="vb-anteprima__nav" disabled title="Pagina successiva">
              ›
            </button>
            <button type="button" className="vb-anteprima__nav" disabled title="Ultima pagina">
              »
            </button>
            <button
              type="button"
              className="vb-anteprima__nav"
              title="Riduci"
              onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
              disabled={zoomIdx <= 0}
            >
              −
            </button>
            <button
              type="button"
              className="vb-anteprima__nav"
              title="Ingrandisci"
              onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
            >
              +
            </button>
          </div>

          <div className="vb-anteprima__toolbar-group">
            <button type="button" className="vb-anteprima__btn" onClick={() => alert('Anteprima di stampa — documento vendita al banco.')}>
              ?
            </button>
            <button type="button" className="vb-anteprima__btn" onClick={onClose}>
              <span className="vb-anteprima__icon">✕</span> Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
