import { functions } from '../firebase'
import type { DocRecord } from '../types'
import {
  callCallableWithAuth,
  formatCallableError,
  isCallableUnauthenticated,
  isCloudFunctionUnavailable,
} from './cloudFunctions'
import { addDocument, updateDocument } from './firestore'
import { omitUndefined } from './firestoreSanitize'

export type CommitDocumentPayload = {
  documentId?: string
  document: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'>
  assignNumber?: boolean
}

export type CommitDocumentResult = {
  documentId: string
  number: number
  fullNumber: string
  documentYear: number
  stockCommitted: boolean
  stockWarning?: string
  usedLocalFallback?: boolean
}

export const isCommitFunctionUnavailable = isCloudFunctionUnavailable

export async function callCommitDocument(
  payload: CommitDocumentPayload,
): Promise<CommitDocumentResult> {
  return callCallableWithAuth<CommitDocumentPayload, CommitDocumentResult>(functions, 'commitDocument', {
    ...payload,
    documentId: payload.documentId || undefined,
    document: omitUndefined(payload.document),
  })
}

function buildLocalCommitResult(
  documentId: string,
  document: CommitDocumentPayload['document'],
): CommitDocumentResult {
  const year = document.documentYear ?? new Date().getFullYear()
  return {
    documentId,
    number: document.number ?? 0,
    fullNumber: document.fullNumber ?? String(document.number ?? ''),
    documentYear: year,
    stockCommitted: Boolean(document.stockCommitted),
    usedLocalFallback: true,
  }
}

/**
 * Salva via Cloud Function; se non disponibile usa Firestore diretto (create/update).
 * Su «unauthenticated» ritenta con token aggiornato; se persiste, messaggio chiaro.
 */
export async function callCommitDocumentWithFallback(
  payload: CommitDocumentPayload,
): Promise<CommitDocumentResult> {
  try {
    return await callCommitDocument(payload)
  } catch (err) {
    if (isCallableUnauthenticated(err)) {
      throw new Error(formatCallableError(err, 'Sessione scaduta: effettua di nuovo l\'accesso.'))
    }
    if (!isCommitFunctionUnavailable(err)) {
      throw new Error(formatCallableError(err, 'Salvataggio documento non riuscito.'))
    }

    const doc = payload.document
    if (payload.documentId) {
      await updateDocument(payload.documentId, omitUndefined(doc) as Partial<DocRecord>)
      return buildLocalCommitResult(payload.documentId, doc)
    }

    const ref = await addDocument(doc)
    return buildLocalCommitResult(ref.id, doc)
  }
}
