import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'

export type DocumentAttachment = {
  url: string
  path: string
  name: string
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file'
}

/** Carica un allegato documento su Storage (`studios/{studioId}/documents/...`). */
export async function uploadDocumentAttachment(
  studioId: string,
  documentKey: string,
  file: File,
): Promise<DocumentAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`"${file.name}" supera i 20 MB consentiti.`)
  }
  const timestamp = Date.now()
  const storagePath = `studios/${studioId}/documents/${documentKey}/attachments/${timestamp}_${safeFileName(file.name)}`
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path: storagePath, name: file.name }
}

export async function deleteDocumentAttachment(attachment: DocumentAttachment): Promise<void> {
  try {
    await deleteObject(ref(storage, attachment.path))
  } catch (err) {
    console.warn('Eliminazione allegato Storage:', err)
  }
}

export function attachmentUrls(attachments: DocumentAttachment[]): string[] {
  return attachments.map(a => a.url)
}
