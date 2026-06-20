import type { Client, DocumentRow, DocRecord } from '../../../types'
import type { Product } from '../../../types'
import {
  PROPRIETA_FATTURA_ELETTR_VUOTA,
  proprietaFatturaElettrPerFirestore,
} from '../shared/proprietaFatturaElettr'
import type { DocumentoOrdineCliente, RigaOrdineCliente } from './types'
import type { RigaDocumento } from '../vendita-banco/types'
import { buildClientDestinations } from './clientDestinations'
import { buildFullNumber, documentYearFromDate } from '../documenti'
import {
  grossFromNet,
  listinoToPriceList,
  netFromGross,
  parseScontoExpr,
  productListGrossPrice,
  calcRiga,
  emptyRiga,
  buildNotaRiga,
} from '../vendita-banco/utils'

export { parseScontoExpr }

/** `prezzoNetto` nel modello ordine = prezzo unitario ivato (come Danea / catalogo FIXLab). */
export function calcRigaOrdine(riga: RigaOrdineCliente): RigaOrdineCliente {
  const importo = Math.round(riga.qta * riga.prezzoNetto * (1 - (riga.sconto || 0) / 100) * 100) / 100
  return { ...riga, importo }
}

export function emptyRigaOrdine(): RigaOrdineCliente {
  return calcRigaOrdine({
    id: crypto.randomUUID(),
    cod: '',
    descrizione: '',
    tagliaColore: '',
    qta: 1,
    um: 'pz',
    prezzoNetto: 0,
    sconto: 0,
    iva: 22,
    impegnaMagazzino: true,
    importo: 0,
    tipoRiga: 'normale',
  })
}

export function documentTotalsFromRigheOrdine(
  righe: RigaOrdineCliente[],
  speseImporto = 0,
  speseIva = 22,
): { totNetto: number; totIva: number; totaleDocumento: number } {
  const active = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
  let netSum = 0
  let vatSum = 0
  for (const raw of active) {
    const r = calcRigaOrdine(raw)
    const lineGross = r.importo
    const lineNet = lineGross / (1 + (r.iva || 0) / 100)
    const lineVat = lineGross - lineNet
    netSum += lineNet
    vatSum += lineVat
  }
  if (speseImporto > 0) {
    const shipNet = speseImporto / (1 + speseIva / 100)
    netSum += shipNet
    vatSum += speseImporto - shipNet
  }
  return {
    totNetto: Math.round(netSum * 100) / 100,
    totIva: Math.round(vatSum * 100) / 100,
    totaleDocumento: Math.round((netSum + vatSum) * 100) / 100,
  }
}

export function createInitialOrdineCliente(): DocumentoOrdineCliente {
  const today = new Date().toISOString().slice(0, 10)
  return {
    cliente: { id: '', nome: '', codFiscale: '', partitaIva: '' },
    agente: '(Nessuno)',
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
    deviceImei: '',
    deviceLockCode: '',
    deviceAccount: '',
    deviceNotes: '',
    stato: 'confirmed',
    dataPrevistaConclusione: '',
    proprietaFatturaElettr: { ...PROPRIETA_FATTURA_ELETTR_VUOTA },
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

export function clientToOrdineCliente(c: Client, destinazioneMerceId = 'sede'): Partial<DocumentoOrdineCliente> {
  const destinations = buildClientDestinations(c)
  const sede = destinations.find(d => d.id === 'sede') || destinations[0]
  const ship = destinations.find(d => d.id === destinazioneMerceId) || sede
  const shipIsSede = ship.id === 'sede'

  return {
    cliente: {
      id: c.id,
      nome: c.name,
      codFiscale: c.fiscalCode || '',
      partitaIva: c.vatNumber || '',
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
      c.priceList === 'aziende'
        ? 'Aziende'
        : c.priceList === 'convenzionati'
          ? 'Convenzionati'
          : c.priceList === 'vip'
            ? 'VIP'
            : 'Privati',
    tipoPagamento: c.paymentMethod || '',
  }
}

export function applyProductToRigaOrdine(p: Product, listino: string, row?: RigaOrdineCliente): RigaOrdineCliente {
  return calcRigaOrdine({
    ...(row || emptyRigaOrdine()),
    productId: p.id,
    cod: p.code || '',
    codProdFornitore: p.barcode || '',
    descrizione: p.name,
    um: p.unitOfMeasure || 'pz',
    prezzoNetto: productListGrossPrice(p, listino),
    qta: row?.qta || 1,
    iva: 22,
    impegnaMagazzino: p.typology === 'with_stock',
  })
}

export function buildNotaRigaOrdine(descrizione = ''): RigaOrdineCliente {
  return calcRigaOrdine({
    ...emptyRigaOrdine(),
    descrizione,
    tipoRiga: 'nota',
    qta: 0,
    prezzoNetto: 0,
    um: '',
    iva: 0,
    impegnaMagazzino: false,
  })
}

export function rigaDocumentoToRigaOrdine(row: RigaDocumento): RigaOrdineCliente {
  return calcRigaOrdine({
    ...emptyRigaOrdine(),
    id: row.id,
    productId: row.productId,
    cod: row.cod,
    descrizione: row.descrizione,
    tagliaColore: row.tagliaColore,
    qta: row.qta,
    um: row.um,
    prezzoNetto: row.prezzoIvato,
    sconto: row.sconto,
    iva: row.iva,
    impegnaMagazzino: row.scaricaMagazzino,
    tipoRiga: row.tipoRiga,
    campoFE: row.campoFE,
  })
}

export function documentRowToRigaOrdine(r: DocumentRow): RigaOrdineCliente {
  return calcRigaOrdine({
    id: r.id,
    productId: r.productId,
    cod: r.productCode || '',
    descrizione: r.description,
    tagliaColore: r.tagliaColore || '',
    qta: r.quantity,
    um: r.unitOfMeasure || 'pz',
    prezzoNetto: grossFromNet(r.unitPrice, r.vatRate ?? 22),
    sconto: r.discount ?? 0,
    scontoExpr: r.discountExpr,
    iva: r.vatRate ?? 22,
    impegnaMagazzino: true,
    importo: r.total ?? 0,
    tipoRiga: 'normale',
  })
}

export function rigaOrdineToDocumentRow(r: RigaOrdineCliente): DocumentRow {
  const rCalc = calcRigaOrdine(r)
  const lineNet = rCalc.qta * netFromGross(rCalc.prezzoNetto, rCalc.iva) * (1 - (rCalc.sconto || 0) / 100)
  return {
    id: rCalc.id,
    productId: rCalc.productId,
    productCode: rCalc.cod,
    description: rCalc.descrizione,
    ...(rCalc.tagliaColore ? { tagliaColore: rCalc.tagliaColore } : {}),
    quantity: rCalc.qta,
    unitOfMeasure: rCalc.um,
    unitPrice: netFromGross(rCalc.prezzoNetto, rCalc.iva),
    discount: rCalc.sconto,
    ...(rCalc.scontoExpr ? { discountExpr: rCalc.scontoExpr } : {}),
    vatRate: rCalc.iva,
    totalNet: Math.round(lineNet * 100) / 100,
    total: rCalc.importo,
  }
}

export function buildOrdinePayload(
  doc: DocumentoOrdineCliente,
  studioId: string,
  activeRighe: RigaOrdineCliente[],
  totals: ReturnType<typeof documentTotalsFromRigheOrdine>,
  saveStatus: DocRecord['status'],
  repairId?: string,
): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const documentYear = documentYearFromDate(doc.data)
  const fullNumber = buildFullNumber(doc.numero, documentYear, doc.numerazione)

  const internalNotes = [
    doc.commentoInterno,
    doc.dataPrevistaConclusione ? `Data prevista concl.: ${doc.dataPrevistaConclusione}` : '',
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
    type: 'ordine_cliente',
    number: doc.numero,
    numbering: doc.numerazione || undefined,
    fullNumber,
    date: doc.data,
    documentYear,
    subjectType: 'client',
    subjectId: doc.cliente.id || undefined,
    subjectName: doc.cliente.nome,
    subjectVat: doc.cliente.codFiscale || doc.cliente.partitaIva || undefined,
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
    deviceImei: doc.deviceImei?.trim() || undefined,
    deviceLockCode: doc.deviceLockCode?.trim() || undefined,
    deviceAccount: doc.deviceAccount?.trim() || undefined,
    deviceNotes: doc.deviceNotes?.trim() || undefined,
    paymentMethod: doc.tipoPagamento || undefined,
    paymentTerms: doc.acconto || undefined,
    bankName: doc.coordinateBancarie || undefined,
    agentName: doc.agente && doc.agente !== '(Nessuno)' ? doc.agente : undefined,
    deliveryAddress: doc.destinazione.indirizzo || undefined,
    deliveryCity: doc.destinazione.citta || undefined,
    deliveryProvince: doc.destinazione.prov || undefined,
    deliveryCap: doc.destinazione.cap || undefined,
    status: saveStatus,
    electronicInvoiceRef: proprietaFatturaElettrPerFirestore(doc.proprietaFatturaElettr),
    ...(repairId ? { repairId } : {}),
  }
}

export function ordineRigheToVenditaRighe(
  righe: RigaOrdineCliente[],
  ordineLabel: string,
  mettiQtaZero: boolean,
): RigaDocumento[] {
  const ref = buildNotaRiga(`** Rif. ${ordineLabel}`)
  const converted = righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .map(r => {
      return calcRiga({
        ...emptyRiga(),
        productId: r.productId,
        cod: r.cod,
        descrizione: r.descrizione,
        tagliaColore: r.tagliaColore,
        qta: mettiQtaZero ? 0 : r.qta,
        um: r.um,
        prezzoIvato: r.prezzoNetto,
        sconto: r.sconto,
        iva: r.iva,
        scaricaMagazzino: r.impegnaMagazzino,
      })
    })
  return [ref, ...converted, emptyRiga()]
}

export function buildOrdineLabel(doc: DocumentoOrdineCliente): string {
  const dataIt = doc.data.split('-').reverse().join('/')
  return `Ordine cliente ${doc.numero} del ${dataIt}`
}

export function buildVenditaBancoSeedFromOrdine(
  doc: DocumentoOrdineCliente,
  mettiQtaZero: boolean,
) {
  const ordineLabel = buildOrdineLabel(doc)
  return {
    cliente: doc.cliente,
    listino: doc.listino,
    data: doc.data,
    intestatario: doc.intestatario,
    destinazione: doc.destinazione,
    tipoPagamento: doc.tipoPagamento,
    commentoInterno: doc.commentoInterno,
    righe: ordineRigheToVenditaRighe(doc.righe, ordineLabel, mettiQtaZero),
  }
}
