/**
 * Logica condivisa per invio scontrino a RT in LAN (Epson ePOS / fpmate.cgi o JSON generico).
 * Nota: da sito HTTPS il browser può bloccare richieste HTTP verso IP locali (mixed content / CORS).
 */

export type RtReceiptItem = {
  description: string
  quantity: number
  /** Prezzo unitario netto in euro */
  unitPrice: number
  vatRate?: number
  discount?: number
}

export type RtReceiptConfig = {
  rtIp?: string | null
  rtModel?: string | null
  /** Etichetta pagamento su RT (es. CONTANTI, BANCOMAT) */
  paymentLabel?: string
}

export type RtReceiptResult = {
  ok: boolean
  msg: string
  skipped?: boolean
}

/** URL tipico stampanti Epson / bridge che espongono ePOS-Print XML. */
export function rtFpmateUrl(rtIp: string): string {
  return `http://${rtIp.trim()}/cgi-bin/fpmate.cgi`
}

/**
 * True se in Impostazioni è stato scelto un modello che oggi trattiamo con XML tipo Epson (fpmate).
 * Allineato ai value in Impostazioni.tsx (epson_fp90, custom_rt, …).
 */
export function rtUsesEpsonFpmateXml(rtModel: string | undefined | null): boolean {
  const m = (rtModel || '').trim()
  if (!m || m === 'none') return false
  if (m === 'epson' || m === 'custom') return true
  return m.startsWith('epson_') || m.startsWith('custom_')
}

export function rtShouldSkipLanPrint(rtModel: string | undefined | null): boolean {
  const m = (rtModel || '').trim()
  return !m || m === 'none'
}

/** Etichetta pagamento compatibile con RT fiscale (max 16 caratteri). */
export function normalizeRtPaymentLabel(raw: string | undefined | null): string {
  const value = (raw || 'CONTANTI').trim().toLowerCase()
  if (!value) return 'CONTANTI'
  if (value.includes('bancomat') || value.includes('pos') || value.includes('carta')) return 'BANCOMAT'
  if (value.includes('contant')) return 'CONTANTI'
  if (value.includes('assegno')) return 'ASSEGNO'
  if (value.includes('bonifico')) return 'BONIFICO'
  if (value.includes('riba')) return 'RIBA'
  if (value.includes('paypal')) return 'PAYPAL'
  return raw!.trim().substring(0, 16).toUpperCase()
}

/** Codice paymentType Epson ePOS-Print: 0 contanti, 2 elettronico/carta. */
export function rtEpsonPaymentTypeCode(label: string): string {
  const normalized = normalizeRtPaymentLabel(label)
  if (normalized === 'BANCOMAT' || normalized === 'PAYPAL') return '2'
  return '0'
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function lineGrossTotal(item: RtReceiptItem): number {
  const net = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
  const vat = item.vatRate ?? 22
  return Math.round(net * (1 + vat / 100) * 100) / 100
}

/** Invia scontrino fiscale al registratore telematico configurato in Impostazioni. */
export async function sendFiscalReceiptToRt(
  items: RtReceiptItem[],
  totalGross: number,
  config: RtReceiptConfig,
): Promise<RtReceiptResult> {
  const rtIp = (config.rtIp || '').trim()
  const rtModel = config.rtModel

  if (!rtIp) {
    return {
      ok: false,
      msg: 'IP RT non configurato. Vai in Impostazioni → Registratore telematico e inserisci l\'indirizzo IP.',
    }
  }

  if (rtShouldSkipLanPrint(rtModel)) {
    return {
      ok: true,
      skipped: true,
      msg: 'RT impostato su «Nessuno / non stampare» — nessun invio in rete.',
    }
  }

  if (items.length === 0) {
    return { ok: false, msg: 'Nessuna riga da stampare sullo scontrino.' }
  }

  const paymentLabel = normalizeRtPaymentLabel(config.paymentLabel)
  const paymentTypeCode = rtEpsonPaymentTypeCode(paymentLabel)

  try {
    let body = ''
    const useXml = rtUsesEpsonFpmateXml(rtModel)

    if (useXml) {
      const itemsXml = items
        .map(item => {
          const desc = escapeXmlAttr(item.description.substring(0, 32).padEnd(32))
          const qty = Math.round(item.quantity * 1000)
          const unitCents = Math.round(item.unitPrice * 100)
          return `<printRecItem description="${desc}" quantity="${qty}" unitPrice="${unitCents}" department="1" justification="1"/>`
        })
        .join('\n  ')

      body = `<?xml version="1.0" encoding="utf-8"?>
<printerFiscalReceipt>
  <beginFiscalReceipt operator="1"/>
  ${itemsXml}
  <printRecTotal description="${escapeXmlAttr(paymentLabel)}" payment="0" paymentType="${paymentTypeCode}" index="1"/>
  <endFiscalReceipt operator="1"/>
</printerFiscalReceipt>`
    } else {
      body = JSON.stringify({
        command: 'fiscal_receipt',
        items: items.map(item => ({
          description: item.description.substring(0, 32),
          quantity: item.quantity,
          price: item.unitPrice,
          vatRate: item.vatRate ?? 22,
          discount: item.discount ?? 0,
        })),
        payments: [{ type: paymentLabel.toLowerCase(), amount: totalGross }],
        total: totalGross,
      })
    }

    const res = await fetch(rtFpmateUrl(rtIp), {
      method: 'POST',
      headers: { 'Content-Type': useXml ? 'application/xml' : 'application/json' },
      body,
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      return { ok: true, msg: `Scontrino inviato a ${rtIp} (risposta OK dalla stampante).` }
    }

    return {
      ok: false,
      msg: `Errore stampante (${res.status}). Da browser HTTPS spesso serve bridge locale o stesso protocollo.`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      msg: `Stampante non raggiungibile (${rtIp}): ${msg}. Verifica IP in Impostazioni e che il PC sia sulla stessa rete.`,
    }
  }
}

/** Converte righe documento in voci scontrino RT. */
export function documentRowsToRtItems(rows: { description: string; quantity: number; unitPrice: number; discount?: number; vatRate: number }[]): RtReceiptItem[] {
  return rows
    .filter(r => r.description?.trim())
    .map(r => ({
      description: r.description.trim(),
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      discount: r.discount,
      vatRate: r.vatRate,
    }))
}

export function rtItemsGrossTotal(items: RtReceiptItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + lineGrossTotal(item), 0) * 100) / 100
}
