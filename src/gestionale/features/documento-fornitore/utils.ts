import type { DocRecord } from '../../../types'
import type { DocumentoOrdineFornitore, RigaOrdineFornitore } from '../ordine-fornitore/types'
import {
  buildOrdineFornitoreLabel,
  buildOrdineFornitorePayload,
  createInitialOrdineFornitore,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
} from '../ordine-fornitore/utils'
import { buildNotaRigaOrdine } from '../ordine-cliente/utils'
import type { DocumentoFornitoreModalType, DocumentoFornitoreSeed, DocumentoFornitoreState } from './types'

function caricaRigaFromOrdine(documentType: DocumentoFornitoreModalType, r: RigaOrdineFornitore): boolean {
  if (documentType === 'arrivo_merce') return true
  return r.impegnaMagazzino
}

export function documentoFornitoreStateToOrdine(doc: DocumentoFornitoreState): DocumentoOrdineFornitore {
  const {
    documentType: _t,
    ordineRif: _r,
    linkedDocumentId: _l,
    linkedDocumentType: _lt,
    ...rest
  } = doc
  return rest
}

export function buildDocumentoFornitoreSeedFromOrdine(
  doc: DocumentoOrdineFornitore,
  documentType: DocumentoFornitoreModalType,
  mettiQtaZero: boolean,
  linkedDocumentId?: string,
  linkedDocumentType?: DocRecord['type'],
): DocumentoFornitoreSeed {
  const ordineRif = buildOrdineFornitoreLabel(doc)
  const ref = buildNotaRigaOrdine(`*** Rif. ${ordineRif}:`)
  const converted = doc.righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .map(r => ({
      ...r,
      id: crypto.randomUUID(),
      qta: mettiQtaZero ? 0 : r.qta,
      impegnaMagazzino: caricaRigaFromOrdine(documentType, r),
    }))

  const today = new Date().toISOString().slice(0, 10)

  return {
    documentType,
    ordineRif,
    mettiQtaZero,
    linkedDocumentId,
    linkedDocumentType,
    fornitore: doc.fornitore,
    listino: doc.listino,
    data: documentType === 'arrivo_merce' ? today : doc.data,
    intestatario: doc.intestatario,
    destinazione: doc.destinazione,
    tipoPagamento: doc.tipoPagamento,
    acconto: doc.acconto,
    campiLiberi: [...doc.campiLiberi],
    noteFine: doc.noteFine,
    commentoInterno: doc.commentoInterno,
    speseTipo: doc.speseTipo,
    speseIva: doc.speseIva,
    speseImporto: doc.speseImporto,
    trasporto: { ...doc.trasporto },
    rinnovo: { ...doc.rinnovo },
    codLotteria: doc.codLotteria,
    dataOraStampa: doc.dataOraStampa,
    righe: [ref, ...converted, emptyRigaOrdine()],
    causaleCarico: documentType === 'arrivo_merce' ? '' : undefined,
    aggiornaPrezzoFornitore: documentType === 'arrivo_merce' ? false : undefined,
    seguiraRegFattura: documentType === 'arrivo_merce' ? true : undefined,
  }
}

export function createEmptyDocumentoFornitoreSeed(
  documentType: DocumentoFornitoreModalType,
  fornitoreData: Pick<
    DocumentoOrdineFornitore,
    'fornitore' | 'intestatario' | 'destinazione' | 'listino' | 'tipoPagamento' | 'campiLiberi'
  >,
): DocumentoFornitoreSeed {
  const base = createInitialOrdineFornitore()
  const today = new Date().toISOString().slice(0, 10)
  return {
    documentType,
    ordineRif: '',
    mettiQtaZero: false,
    fornitore: fornitoreData.fornitore,
    listino: fornitoreData.listino,
    data: today,
    intestatario: fornitoreData.intestatario,
    destinazione: fornitoreData.destinazione,
    tipoPagamento: fornitoreData.tipoPagamento,
    acconto: '',
    campiLiberi: [...fornitoreData.campiLiberi],
    noteFine: '',
    commentoInterno: '',
    speseTipo: base.speseTipo,
    speseIva: base.speseIva,
    speseImporto: base.speseImporto,
    trasporto: { ...base.trasporto },
    rinnovo: { ...base.rinnovo },
    codLotteria: '',
    dataOraStampa: '',
    righe: [emptyRigaOrdine()],
    ...(documentType === 'arrivo_merce'
      ? { causaleCarico: '', aggiornaPrezzoFornitore: false, seguiraRegFattura: true }
      : {}),
  }
}

export function createDocumentoFornitoreFromSeed(
  seed: DocumentoFornitoreSeed,
  numero: number,
): DocumentoFornitoreState {
  const totals = documentTotalsFromRigheOrdine(seed.righe, seed.speseImporto, seed.speseIva)
  return {
    documentType: seed.documentType,
    ordineRif: seed.ordineRif,
    linkedDocumentId: seed.linkedDocumentId,
    linkedDocumentType: seed.linkedDocumentType,
    fornitore: seed.fornitore,
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
    stato: 'draft',
    dataPrevistaConclusione: '',
    trasporto: seed.trasporto,
    causaleCarico: seed.causaleCarico,
    aggiornaPrezzoFornitore: seed.aggiornaPrezzoFornitore,
    seguiraRegFattura: seed.seguiraRegFattura,
    ...totals,
  }
}

export function buildDocumentoFornitorePayload(
  doc: DocumentoFornitoreState,
  studioId: string,
  activeRighe: RigaOrdineFornitore[],
  totals: ReturnType<typeof documentTotalsFromRigheOrdine>,
  saveStatus: DocRecord['status'],
): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const base = buildOrdineFornitorePayload(
    { ...documentoFornitoreStateToOrdine(doc), stato: saveStatus },
    studioId,
    activeRighe,
    totals,
    saveStatus,
  )
  return {
    ...base,
    type: doc.documentType,
    linkedDocumentId: doc.linkedDocumentId,
    linkedDocumentType: doc.linkedDocumentType,
    followUpDoc: doc.documentType === 'arrivo_merce' ? Boolean(doc.seguiraRegFattura) : base.followUpDoc,
    internalNotes: [
      base.internalNotes,
      doc.ordineRif ? `Generato da: ${doc.ordineRif}` : '',
      doc.documentType === 'arrivo_merce' && doc.causaleCarico?.trim()
        ? `Causale carico: ${doc.causaleCarico.trim()}`
        : '',
      doc.documentType === 'arrivo_merce' && doc.aggiornaPrezzoFornitore
        ? 'Aggiorna prezzo fornitore: sì'
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
