import type { DocRecord } from '../../../types'
import type { DocumentoOrdineCliente, RigaOrdineCliente } from '../ordine-cliente/types'
import {
  buildOrdineLabel,
  buildOrdinePayload,
  buildNotaRigaOrdine,
  createInitialOrdineCliente,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
} from '../ordine-cliente/utils'
import type { DocumentoClienteModalType, DocumentoClienteSeed, DocumentoClienteState } from './types'

function impegnaRigaFromOrdine(documentType: DocumentoClienteModalType, r: RigaOrdineCliente): boolean {
  if (documentType === 'ddt') return r.impegnaMagazzino
  if (documentType === 'rapporto_intervento') return true
  return false
}

function defaultSeguiraDocVendita(documentType: DocumentoClienteModalType): boolean {
  return documentType === 'rapporto_intervento' || documentType === 'ddt' || documentType === 'fattura_accomp'
}

export function documentoClienteStateToOrdine(doc: DocumentoClienteState): DocumentoOrdineCliente {
  const { documentType: _t, seguiraDocVendita: _s, ordineRif: _r, ...rest } = doc
  return rest
}

export function buildDocumentoSeedFromOrdine(
  doc: DocumentoOrdineCliente,
  documentType: DocumentoClienteModalType,
  mettiQtaZero: boolean,
): DocumentoClienteSeed {
  const ordineRif = buildOrdineLabel(doc)
  const ref = buildNotaRigaOrdine(`*** Rif. ${ordineRif}:`)
  const converted = doc.righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .map(r => ({
      ...r,
      id: crypto.randomUUID(),
      qta: mettiQtaZero ? 0 : r.qta,
      impegnaMagazzino: impegnaRigaFromOrdine(documentType, r),
    }))

  return {
    documentType,
    ordineRif,
    mettiQtaZero,
    cliente: doc.cliente,
    agente: doc.agente,
    listino: doc.listino,
    data: doc.data,
    intestatario: doc.intestatario,
    destinazione: doc.destinazione,
    tipoPagamento: doc.tipoPagamento,
    acconto: doc.acconto,
    campiLiberi: [...doc.campiLiberi],
    noteFine: doc.noteFine,
    commentoInterno: doc.commentoInterno,
    deviceImei: doc.deviceImei,
    deviceLockCode: doc.deviceLockCode,
    deviceAccount: doc.deviceAccount,
    deviceNotes: doc.deviceNotes,
    speseTipo: doc.speseTipo,
    speseIva: doc.speseIva,
    speseImporto: doc.speseImporto,
    trasporto: { ...doc.trasporto },
    rinnovo: { ...doc.rinnovo },
    codLotteria: doc.codLotteria,
    dataOraStampa: doc.dataOraStampa,
    proprietaFatturaElettr: { ...doc.proprietaFatturaElettr },
    righe: [ref, ...converted, emptyRigaOrdine()],
    seguiraDocVendita: defaultSeguiraDocVendita(documentType),
  }
}

export function createEmptyDocumentoClienteSeed(
  documentType: DocumentoClienteModalType,
  clienteData: Pick<
    DocumentoOrdineCliente,
    'cliente' | 'intestatario' | 'destinazione' | 'listino' | 'tipoPagamento' | 'campiLiberi'
  >,
): DocumentoClienteSeed {
  const base = createInitialOrdineCliente()
  const today = new Date().toISOString().slice(0, 10)
  return {
    documentType,
    ordineRif: '',
    mettiQtaZero: false,
    cliente: clienteData.cliente,
    agente: '(Nessuno)',
    listino: clienteData.listino,
    data: today,
    intestatario: clienteData.intestatario,
    destinazione: clienteData.destinazione,
    tipoPagamento: clienteData.tipoPagamento,
    acconto: '',
    campiLiberi: [...clienteData.campiLiberi],
    noteFine: '',
    commentoInterno: '',
    speseTipo: base.speseTipo,
    speseIva: base.speseIva,
    speseImporto: base.speseImporto,
    trasporto: { ...base.trasporto },
    rinnovo: { ...base.rinnovo },
    codLotteria: '',
    dataOraStampa: '',
    proprietaFatturaElettr: { ...base.proprietaFatturaElettr },
    righe: [emptyRigaOrdine()],
    seguiraDocVendita: defaultSeguiraDocVendita(documentType),
  }
}

export function createDocumentoClienteFromSeed(seed: DocumentoClienteSeed, numero: number): DocumentoClienteState {
  const totals = documentTotalsFromRigheOrdine(seed.righe, seed.speseImporto, seed.speseIva)
  return {
    documentType: seed.documentType,
    ordineRif: seed.ordineRif,
    seguiraDocVendita: seed.seguiraDocVendita,
    cliente: seed.cliente,
    agente: seed.agente ?? '(Nessuno)',
    listino: seed.listino,
    data: seed.data,
    numero,
    numerazione: '',
    righe: seed.righe,
    tipoPagamento: seed.tipoPagamento,
    acconto: seed.acconto,
    campiLiberi: seed.campiLiberi,
    noteFine: seed.noteFine,
    intestatario: seed.intestatario,
    destinazione: seed.destinazione,
    dataOraStampa: seed.dataOraStampa ?? '',
    codLotteria: seed.codLotteria ?? '',
    rinnovo: seed.rinnovo,
    speseTipo: seed.speseTipo,
    speseIva: seed.speseIva,
    speseImporto: seed.speseImporto,
    commentoInterno: seed.commentoInterno,
    deviceImei: seed.deviceImei ?? '',
    deviceLockCode: seed.deviceLockCode ?? '',
    deviceAccount: seed.deviceAccount ?? '',
    deviceNotes: seed.deviceNotes ?? '',
    stato: 'draft',
    dataPrevistaConclusione: '',
    trasporto: seed.trasporto,
    proprietaFatturaElettr: seed.proprietaFatturaElettr
      ? { ...seed.proprietaFatturaElettr }
      : { ...createInitialOrdineCliente().proprietaFatturaElettr },
    ...totals,
  }
}

export function buildDocumentoClientePayload(
  doc: DocumentoClienteState,
  studioId: string,
  activeRighe: RigaOrdineCliente[],
  totals: ReturnType<typeof documentTotalsFromRigheOrdine>,
  saveStatus: DocRecord['status'],
): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const base = buildOrdinePayload(
    { ...doc, stato: saveStatus },
    studioId,
    activeRighe,
    totals,
    saveStatus,
  )
  return {
    ...base,
    type: doc.documentType,
    followUpDoc: doc.seguiraDocVendita,
    internalNotes: [
      base.internalNotes,
      doc.ordineRif ? `Generato da: ${doc.ordineRif}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
