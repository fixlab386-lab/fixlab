import type { DocRecord } from '../../types'
import type { DocumentoOrdineCliente } from '../features/ordine-cliente/types'
import type { DocumentoOrdineFornitore } from '../features/ordine-fornitore/types'
import { proprietaFatturaElettrDaFirestore } from '../features/shared/proprietaFatturaElettr'
import { createInitialOrdineFornitore } from '../features/ordine-fornitore/utils'
import {
  calcRigaOrdine,
  createInitialOrdineCliente,
  documentRowToRigaOrdine,
  emptyRigaOrdine,
} from '../features/ordine-cliente/utils'
import type { DocumentoClienteModalType, DocumentoClienteState } from '../features/documento-cliente/types'
import { isActiveDocumentoClienteModalType } from '../features/documento-cliente/constants'
import type { DocumentoFornitoreModalType, DocumentoFornitoreState } from '../features/documento-fornitore/types'
import { isActiveDocumentoFornitoreModalType } from '../features/documento-fornitore/constants'
import type { DocumentoVenditaBanco } from '../features/vendita-banco/types'
import { numerazioneFromDocRecord } from '../features/documenti/utils'
import { documentRowToRiga } from '../features/vendita-banco/utils'

function priceListToListino(priceList?: DocRecord['priceList']): string {
  switch (priceList) {
    case 'aziende':
      return 'Aziende'
    case 'convenzionati':
      return 'Convenzionati'
    case 'vip':
      return 'VIP'
    default:
      return 'Privati'
  }
}

function parseInternalNotes(notes?: string) {
  let body = notes || ''
  let codLotteria = ''
  let dataOraStampa = ''
  let rinnovo = { attivo: false, mesi: 12 }
  let commentoInterno = body

  const lotMatch = body.match(/^Cod\. lotteria: (.+)$/m)
  const renMatch = body.match(/^Rinnovo documento fra (\d+) mesi$/m)
  const printMatch = body.match(/^Data\/ora stampa: (.+)$/m)
  if (lotMatch) {
    codLotteria = lotMatch[1].trim()
    body = body.replace(/^Cod\. lotteria: .+\n?/m, '')
  }
  if (renMatch) {
    rinnovo = { attivo: true, mesi: parseInt(renMatch[1], 10) || 12 }
    body = body.replace(/^Rinnovo documento fra \d+ mesi\n?/m, '')
  }
  if (printMatch) {
    dataOraStampa = printMatch[1].trim()
    body = body.replace(/^Data\/ora stampa: .+\n?/m, '')
  }

  const noteFineMatch = body.match(/^Note a fine documento:\n([\s\S]*)$/m)
  let noteFine = ''
  if (noteFineMatch) {
    noteFine = noteFineMatch[1].trim()
    body = body.replace(/^Note a fine documento:\n[\s\S]*$/m, '').trim()
  }

  commentoInterno = body.trim()

  return { codLotteria, dataOraStampa, rinnovo, commentoInterno, noteFine }
}

function splitAddressLine(address?: string) {
  if (!address) return { indirizzo: '', cap: '', citta: '', prov: '' }
  const parts = address.split(',').map(s => s.trim())
  return {
    indirizzo: parts[0] || '',
    cap: parts[1] || '',
    citta: parts[2] || '',
    prov: parts[3] || '',
  }
}

function parseOrdineExtraNotes(notes?: string) {
  let body = notes || ''
  let dataPrevistaConclusione = ''
  const trasporto = {
    causale: '',
    inizio: '',
    porto: '',
    incaricato: '',
    colli: '',
    peso: '',
    aspetto: '',
    codSpedizione: '',
  }

  const prevMatch = body.match(/^Data prevista concl\.: (.+)$/m)
  if (prevMatch) {
    dataPrevistaConclusione = prevMatch[1].trim()
    body = body.replace(/^Data prevista concl\.: .+\n?/m, '')
  }

  const transportFields: [keyof typeof trasporto, RegExp][] = [
    ['causale', /^Causale trasporto: (.+)$/m],
    ['inizio', /^Inizio trasporto: (.+)$/m],
    ['incaricato', /^Incaricato trasporto: (.+)$/m],
    ['colli', /^N\. colli: (.+)$/m],
    ['peso', /^Peso: (.+)$/m],
    ['aspetto', /^Aspetto beni: (.+)$/m],
    ['codSpedizione', /^Cod\. spedizione: (.+)$/m],
  ]

  for (const [key, re] of transportFields) {
    const match = body.match(re)
    if (match) {
      trasporto[key] = match[1].trim()
      body = body.replace(re, '')
    }
  }

  const liberoFields: string[] = ['', '', '', '']
  for (let i = 0; i < 4; i++) {
    const re = new RegExp(`^Libero ${i + 1}: (.+)$`, 'm')
    const match = body.match(re)
    if (match) {
      liberoFields[i] = match[1].trim()
      body = body.replace(re, '')
    }
  }

  return { body: body.trim(), dataPrevistaConclusione, trasporto, liberoFields }
}

export function docRecordToOrdineCliente(d: DocRecord): DocumentoOrdineCliente {
  const base = createInitialOrdineCliente()
  const parsed = parseInternalNotes(d.internalNotes)
  const extra = parseOrdineExtraNotes(parsed.commentoInterno)
  parsed.commentoInterno = extra.body
  const intestatario = splitAddressLine(d.subjectAddress)
  const righe =
    d.rows?.length > 0
      ? d.rows.map(r => calcRigaOrdine(documentRowToRigaOrdine(r)))
      : [emptyRigaOrdine()]

  return {
    ...base,
    cliente: {
      id: d.subjectId || '',
      nome: d.subjectName,
      codFiscale: d.subjectVat || '',
      partitaIva: d.subjectVat || '',
    },
    agente: d.agentName || '(Nessuno)',
    listino: priceListToListino(d.priceList),
    data: d.date,
    numero: d.number,
    numerazione: numerazioneFromDocRecord(d),
    righe,
    prezziIvati: d.pricesVatIncluded ?? false,
    tipoPagamento: d.paymentMethod || '',
    coordinateBancarie: d.bankName || '',
    acconto: d.paymentTerms || '',
    campiLiberi: extra.liberoFields as DocumentoOrdineCliente['campiLiberi'],
    noteFine: parsed.noteFine,
    intestatario: {
      indirizzo: intestatario.indirizzo,
      cap: intestatario.cap,
      citta: intestatario.citta,
      prov: intestatario.prov,
      nazione: 'Italia',
    },
    destinazione: {
      indirizzo: d.deliveryAddress || '',
      cap: d.deliveryCap || '',
      citta: d.deliveryCity || '',
      prov: d.deliveryProvince || '',
      nazione: 'Italia',
    },
    dataOraStampa: parsed.dataOraStampa,
    codLotteria: parsed.codLotteria,
    rinnovo: parsed.rinnovo,
    speseTipo: d.shippingDescription || '',
    speseIva: d.shippingVatRate ?? 22,
    speseImporto: d.shippingCost || 0,
    commentoInterno: parsed.commentoInterno,
    deviceImei: d.deviceImei || '',
    deviceLockCode: d.deviceLockCode || '',
    deviceAccount: d.deviceAccount || '',
    deviceNotes: d.deviceNotes || '',
    stato: d.status,
    dataPrevistaConclusione: extra.dataPrevistaConclusione,
    trasporto: extra.trasporto,
    proprietaFatturaElettr: proprietaFatturaElettrDaFirestore(d.electronicInvoiceRef),
    totNetto: d.totalNet,
    totIva: d.totalVat,
    totaleDocumento: d.totalDocument,
  }
}

export function docRecordToOrdineFornitore(d: DocRecord): DocumentoOrdineFornitore {
  const base = createInitialOrdineFornitore()
  const parsed = parseInternalNotes(d.internalNotes)
  const extra = parseOrdineExtraNotes(parsed.commentoInterno)
  parsed.commentoInterno = extra.body
  const intestatario = splitAddressLine(d.subjectAddress)
  const righe =
    d.rows?.length > 0
      ? d.rows.map(r => calcRigaOrdine(documentRowToRigaOrdine(r)))
      : [emptyRigaOrdine()]

  return {
    ...base,
    fornitore: {
      id: d.subjectId || '',
      nome: d.subjectName,
      codFiscale: d.subjectVat || '',
      partitaIva: d.subjectVat || '',
    },
    listino: priceListToListino(d.priceList),
    data: d.date,
    numero: d.number,
    numerazione: numerazioneFromDocRecord(d),
    righe,
    prezziIvati: d.pricesVatIncluded ?? false,
    tipoPagamento: d.paymentMethod || '',
    coordinateBancarie: d.bankName || '',
    acconto: d.paymentTerms || '',
    campiLiberi: extra.liberoFields as DocumentoOrdineFornitore['campiLiberi'],
    noteFine: parsed.noteFine,
    intestatario: {
      indirizzo: intestatario.indirizzo,
      cap: intestatario.cap,
      citta: intestatario.citta,
      prov: intestatario.prov,
      nazione: 'Italia',
    },
    destinazione: {
      indirizzo: d.deliveryAddress || '',
      cap: d.deliveryCap || '',
      citta: d.deliveryCity || '',
      prov: d.deliveryProvince || '',
      nazione: 'Italia',
    },
    dataOraStampa: parsed.dataOraStampa,
    codLotteria: parsed.codLotteria,
    rinnovo: parsed.rinnovo,
    speseTipo: d.shippingDescription || '',
    speseIva: d.shippingVatRate ?? 22,
    speseImporto: d.shippingCost || 0,
    commentoInterno: parsed.commentoInterno,
    stato: d.status,
    dataPrevistaConclusione: extra.dataPrevistaConclusione,
    trasporto: extra.trasporto,
    totNetto: d.totalNet,
    totIva: d.totalVat,
    totaleDocumento: d.totalDocument,
  }
}

export function docRecordToDocumentoClienteState(d: DocRecord): DocumentoClienteState | null {
  if (!isActiveDocumentoClienteModalType(d.type)) return null
  const ordine = docRecordToOrdineCliente(d)
  return {
    ...ordine,
    documentType: d.type as DocumentoClienteModalType,
    ordineRif: '',
    seguiraDocVendita: Boolean(d.followUpDoc),
  }
}

export function docRecordToDocumentoFornitoreState(d: DocRecord): DocumentoFornitoreState | null {
  if (!isActiveDocumentoFornitoreModalType(d.type)) return null
  const ordine = docRecordToOrdineFornitore(d)
  let ordineRif = ''
  const genMatch = d.internalNotes?.match(/^Generato da: (.+)$/m)
  if (genMatch) ordineRif = genMatch[1].trim()
  const causaleMatch = d.internalNotes?.match(/^Causale carico: (.+)$/m)
  const aggiornaPrezzo = /Aggiorna prezzo fornitore: sì/m.test(d.internalNotes || '')
  return {
    ...ordine,
    documentType: d.type as DocumentoFornitoreModalType,
    ordineRif,
    linkedDocumentId: d.linkedDocumentId,
    linkedDocumentType: d.linkedDocumentType,
    causaleCarico: causaleMatch?.[1]?.trim() || '',
    aggiornaPrezzoFornitore: aggiornaPrezzo,
    seguiraRegFattura: d.type === 'arrivo_merce' ? d.followUpDoc !== false : undefined,
  }
}

export function docRecordToVenditaBancoState(d: DocRecord): DocumentoVenditaBanco {
  const ordine = docRecordToOrdineCliente(d)
  const righe = d.rows?.length ? d.rows.map(documentRowToRiga) : []
  return {
    cliente: ordine.cliente,
    agente: d.agentName || '(Nessuno)',
    listino: ordine.listino,
    data: ordine.data,
    numero: ordine.numero,
    numerazione: ordine.numerazione,
    seguiraDocVendita: Boolean(d.followUpDoc),
    righe,
    prezziIvati: d.pricesVatIncluded ?? true,
    tipoPagamento: ordine.tipoPagamento,
    campiLiberi: ordine.campiLiberi,
    noteFine: ordine.noteFine,
    intestatario: ordine.intestatario,
    destinazione: ordine.destinazione,
    dataOraStampa: ordine.dataOraStampa,
    codLotteria: ordine.codLotteria,
    rinnovo: ordine.rinnovo,
    speseTipo: ordine.speseTipo,
    speseIva: ordine.speseIva,
    speseImporto: ordine.speseImporto,
    commentoInterno: ordine.commentoInterno,
    totNetto: ordine.totNetto,
    totIva: ordine.totIva,
    totaleDocumento: ordine.totaleDocumento,
    protetto: false,
  }
}
