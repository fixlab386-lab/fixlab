import { useState } from 'react'
import { callSendArubaInvoice } from '../../lib/arubaInvoicing'

type Props = {
  studioId: string
  documentId: string
  documentType: string
  documentStatus: string
  arubaStatus?: string
  uploadFileName?: string
  disabled?: boolean
  onSent?: () => void
}

export default function InviaArubaSdiButton({
  studioId,
  documentId,
  documentType,
  documentStatus,
  arubaStatus,
  uploadFileName,
  disabled,
  onSent,
}: Props) {
  const [busy, setBusy] = useState(false)

  if (documentType !== 'fattura') return null

  const alreadySent = arubaStatus === 'sent' && Boolean(uploadFileName)
  const canSend = ['confirmed', 'sent', 'completed'].includes(documentStatus) && !alreadySent

  if (!canSend && !alreadySent) return null

  const handleSend = async () => {
    if (
      !window.confirm(
        'Inviare questa fattura ad Aruba per la trasmissione allo SDI?\n\nVerifica che i dati cliente e azienda siano corretti.',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const result = await callSendArubaInvoice(studioId, documentId)
      alert(result.message || 'Fattura inviata ad Aruba.')
      onSent?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invio SDI non riuscito.')
    } finally {
      setBusy(false)
    }
  }

  if (alreadySent) {
    return (
      <span className="gestionale-badge gestionale-badge--ok" title={uploadFileName || undefined}>
        Inviata SDI{uploadFileName ? `: ${uploadFileName}` : ''}
      </span>
    )
  }

  return (
    <button type="button" className="gestionale-btn gestionale-btn--primary" disabled={disabled || busy} onClick={() => void handleSend()}>
      {busy ? 'Invio SDI…' : 'Invia a SDI via Aruba'}
    </button>
  )
}
