import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { DocRecord } from '../types'
import { isCloudFunctionUnavailable } from './cloudFunctions'
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
}

export const isCommitFunctionUnavailable = isCloudFunctionUnavailable

export async function callCommitDocument(
  payload: CommitDocumentPayload,
): Promise<CommitDocumentResult> {
  const fn = httpsCallable<CommitDocumentPayload, CommitDocumentResult>(functions, 'commitDocument')
  const res = await fn({
    ...payload,
    documentId: payload.documentId || undefined,
    document: omitUndefined(payload.document),
  })
  return res.data
}
