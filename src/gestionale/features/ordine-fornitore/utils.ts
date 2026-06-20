import type { DocRecord, DocumentRow, Supplier } from '../../../types'
import type { DocumentoOrdineCliente } from '../ordine-cliente/types'
import type { DocumentoOrdineFornitore, RigaOrdineFornitore } from './types'
import { buildSupplierDestinations } from './supplierDestinations'
import { buildFullNumber, documentYearFromDate } from '../documenti'
import { listinoToPriceList } from '../vendita-banco/utils'
import {
  calcRigaOrdine,
  documentRowToRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
  rigaOrdineToDocumentRow,
  applyProductToRigaOrdine,
  buildNotaRigaOrdine,
} from '../ordine-cliente/utils'
import { PROPRIETA_FATTURA_ELETTR_VUOTA } from '../shared/proprietaFatturaElettr'

export {
  calcRigaOrdine,
  emptyRigaOrdine,
  documentTotalsFromRigheOrdine,
  documentRowToRigaOrdine,
  rigaOrdineToDocumentRow,
  applyProductToRigaOrdine as applyProductToRigaOrdineFornitore,
  buildNotaRigaOrdine,
}

export function createInitialOrdineFornitore(): DocumentoOrdineFornitore {
  const today = new Date().toISOString().slice(0, 10)
  return {
    fornitore: { id: '', nome: '', codFiscale: '', partitaIva: '' },
    listino: 'Privati',
    data: today,
    numero: 1,
    numerazione: '',
    righe: [emptyRigaOrdine()],
    prezziIvati: false,
    tipoPagamento: '',
    coordinateBancarie: '',
    acconto: '',
    campiLiberi: ['', '', '', ''],
    noteFine: '',
    intestatario: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    destinazione: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    dataOraStampa: '',
    codLotteria: '',
    rinnovo: { attivo: false, mesi: 12 },
    speseTipo: '',
    speseIva: 22,
    speseImporto: 0,
    commentoInterno: '',
    stato: 'confirmed',
    dataPrevistaConclusione: '',
    trasporto: {
      causale: '',
      inizio: '',
      porto: '',
      incaricato: '',
      colli: '',
      peso: '',
      aspetto: '',
      codSpedizione: '',
    },
    totNetto: 0,
    totIva: 0,
    totaleDocumento: 0,
  }
}

export function supplierToOrdineFornitore(
  s: Supplier,
  destinazioneMerceId = 'sede',
): Partial<DocumentoOrdineFornitore> {
  const destinations = buildSupplierDestinations(s)
  const sede = destinations.find(d => d.id === 'sede') || destinations[0]
  const ship = destinations.find(d => d.id === destinazioneMerceId) || sede
  const shipIsSede = ship.id === 'sede'

  return {
    fornitore: {
      id: s.id,
      nome: s.name,
      codFiscale: s.fiscalCode || '',
      partitaIva: s.vatNumber || '',
    },
    intestatario: {
      indirizzo: sede.indirizzo,
      cap: sede.cap,
      citta: sede.citta,
      prov: sede.prov,
      nazione: sede.nazione,
    },
    destinazione: shipIsSede
      ? { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' }
      : {
          indirizzo: ship.indirizzo,
          cap: ship.cap,
          citta: ship.citta,
          prov: ship.prov,
          nazione: ship.nazione,
        },
    listino:
      s.priceList === 'aziende'
        ? 'Aziende'
        : s.priceList === 'convenzionati'
          ? 'Convenzionati'
          : s.priceList === 'vip'
            ? 'VIP'
            : 'Privati',
    tipoPagamento: s.paymentMethod || s.paymentTerms || '',
  }
}

export function ordineFornitoreToClienteShape(doc: DocumentoOrdineFornitore): DocumentoOrdineCliente {
  return {
    cliente: doc.fornitore,
    agente: '(Nessuno)',
    listino: doc.listino,
    data: doc.data,
    numero: doc.numero,
    numerazione: doc.numerazione,
    righe: doc.righe,
    prezziIvati: doc.prezziIvati,
    tipoPagamento: doc.tipoPagamento,
    coordinateBancarie: doc.coordinateBancarie,
    acconto: doc.acconto,
    campiLiberi: doc.campiLiberi,
    noteFine: doc.noteFine,
    intestatario: doc.intestatario,
    destinazione: doc.destinazione,
    dataOraStampa: doc.dataOraStampa,
    codLotteria: doc.codLotteria,
    rinnovo: doc.rinnovo,
    speseTipo: doc.speseTipo,
    speseIva: doc.speseIva,
    speseImporto: doc.speseImporto,
    commentoInterno: doc.commentoInterno,
    deviceImei: '',
    deviceLockCode: '',
    deviceAccount: '',
    deviceNotes: '',
    stato: doc.stato,
    dataPrevistaConclusione: doc.dataPrevistaConclusione,
    trasporto: doc.trasporto,
    proprietaFatturaElettr: { ...PROPRIETA_FATTURA_ELETTR_VUOTA },
    totNetto: doc.totNetto,
    totIva: doc.totIva,
    totaleDocumento: doc.totaleDocumento,
  }
}

export function patchFromClienteShape(
  patch: Partial<DocumentoOrdineCliente>,
): Partial<DocumentoOrdineFornitore> {
  const { cliente, ...rest } = patch
  const result: Partial<DocumentoOrdineFornitore> = { ...rest }
  if (cliente) result.fornitore = cliente
  return result
}

export function buildOrdineFornitorePayload(
  doc: DocumentoOrdineFornitore,
  studioId: string,
  activeRighe: RigaOrdineFornitore[],
  totals: ReturnType<typeof documentTotalsFromRigheOrdine>,
  saveStatus: DocRecord['status'],
): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const documentYear = documentYearFromDate(doc.data)
  const fullNumber = buildFullNumber(doc.numero, documentYear, doc.numerazione)
  const t = doc.trasporto

  const internalNotes = [
    doc.commentoInterno,
    doc.dataPrevistaConclusione ? `Data prevista concl.: ${doc.dataPrevistaConclusione}` : '',
    t.causale ? `Causale trasporto: ${t.causale}` : '',
    t.inizio ? `Inizio trasporto: ${t.inizio}` : '',
    t.incaricato ? `Incaricato trasporto: ${t.incaricato}` : '',
    t.colli ? `N. colli: ${t.colli}` : '',
    t.peso ? `Peso: ${t.peso}` : '',
    t.aspetto ? `Aspetto beni: ${t.aspetto}` : '',
    t.codSpedizione ? `Cod. spedizione: ${t.codSpedizione}` : '',
    doc.campiLiberi[0] ? `Libero 1: ${doc.campiLiberi[0]}` : '',
    doc.campiLiberi[1] ? `Libero 2: ${doc.campiLiberi[1]}` : '',
    doc.campiLiberi[2] ? `Libero 3: ${doc.campiLiberi[2]}` : '',
    doc.campiLiberi[3] ? `Libero 4: ${doc.campiLiberi[3]}` : '',
    doc.noteFine ? `Note a fine documento:\n${doc.noteFine}` : '',
    doc.rinnovo.attivo ? `Rinnovo documento fra ${doc.rinnovo.mesi} mesi` : '',
    doc.dataOraStampa ? `Data/ora stampa: ${doc.dataOraStampa}` : '',
    doc.codLotteria ? `Cod. lotteria: ${doc.codLotteria}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    studioId,
    type: 'ordine_fornitore',
    number: doc.numero,
    numbering: doc.numerazione || undefined,
    fullNumber,
    date: doc.data,
    documentYear,
    subjectType: 'supplier',
    subjectId: doc.fornitore.id || undefined,
    subjectName: doc.fornitore.nome,
    subjectVat: doc.fornitore.codFiscale || doc.fornitore.partitaIva || undefined,
    subjectAddress: doc.intestatario.indirizzo
      ? [doc.intestatario.indirizzo, doc.intestatario.cap, doc.intestatario.citta, doc.intestatario.prov]
          .filter(Boolean)
          .join(', ')
      : undefined,
    rows: activeRighe.map(rigaOrdineToDocumentRow),
    totalNet: totals.totNetto,
    totalVat: totals.totIva,
    totalDocument: totals.totaleDocumento,
    shippingCost: doc.speseImporto > 0 ? doc.speseImporto : undefined,
    shippingVatRate: doc.speseImporto > 0 ? doc.speseIva : undefined,
    shippingDescription: doc.speseTipo || undefined,
    priceList: listinoToPriceList(doc.listino),
    pricesVatIncluded: doc.prezziIvati ?? false,
    internalNotes: internalNotes || undefined,
    paymentMethod: doc.tipoPagamento || undefined,
    paymentTerms: doc.acconto || undefined,
    bankName: doc.coordinateBancarie || undefined,
    deliveryAddress: doc.destinazione.indirizzo || undefined,
    deliveryCity: doc.destinazione.citta || undefined,
    deliveryProvince: doc.destinazione.prov || undefined,
    deliveryCap: doc.destinazione.cap || undefined,
    status: saveStatus,
  }
}

export function buildOrdineFornitoreLabel(doc: DocumentoOrdineFornitore): string {
  const dataIt = doc.data.split('-').reverse().join('/')
  return `Ordine fornitore ${doc.numero} del ${dataIt}`
}

export function buildArrivoMercePayloadFromOrdine(
  doc: DocumentoOrdineFornitore,
  studioId: string,
  activeRighe: RigaOrdineFornitore[],
  totals: ReturnType<typeof documentTotalsFromRigheOrdine>,
  mettiQtaZero: boolean,
  ordineDocumentId?: string,
): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const today = new Date().toISOString().slice(0, 10)
  const documentYear = documentYearFromDate(today)
  const ordineLabel = buildOrdineFornitoreLabel(doc)

  const rows: DocumentRow[] = activeRighe.map(r => {
    const row = rigaOrdineToDocumentRow(r)
    return {
      ...row,
      id: crypto.randomUUID(),
      quantity: mettiQtaZero ? 0 : row.quantity,
    }
  })

  return {
    studioId,
    type: 'arrivo_merce',
    number: 1,
    fullNumber: '',
    date: today,
    documentYear,
    subjectType: 'supplier',
    subjectId: doc.fornitore.id || undefined,
    subjectName: doc.fornitore.nome,
    subjectVat: doc.fornitore.codFiscale || doc.fornitore.partitaIva || undefined,
    subjectAddress: doc.intestatario.indirizzo
      ? [doc.intestatario.indirizzo, doc.intestatario.cap, doc.intestatario.citta, doc.intestatario.prov]
          .filter(Boolean)
          .join(', ')
      : undefined,
    rows,
    totalNet: totals.totNetto,
    totalVat: totals.totIva,
    totalDocument: totals.totaleDocumento,
    priceList: listinoToPriceList(doc.listino),
    internalNotes: `Generato da ${ordineLabel}`,
    paymentMethod: doc.tipoPagamento || undefined,
    paymentTerms: doc.acconto || undefined,
    deliveryAddress: doc.destinazione.indirizzo || undefined,
    deliveryCity: doc.destinazione.citta || undefined,
    deliveryProvince: doc.destinazione.prov || undefined,
    deliveryCap: doc.destinazione.cap || undefined,
    status: 'draft',
    linkedDocumentId: ordineDocumentId,
    linkedDocumentType: 'ordine_fornitore',
  }
}
