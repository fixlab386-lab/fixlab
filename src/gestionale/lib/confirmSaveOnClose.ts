export const SAVE_DOCUMENT_CONFIRM_MESSAGE = 'Vuoi salvare il documento?'

/** Documento con righe non ancora salvate o con modifiche dopo l'ultimo salvataggio. */
export function documentNeedsSaveOnClose(
  hasRows: boolean,
  savedDocumentId: string | null,
  isDirty: boolean,
): boolean {
  return hasRows && (!savedDocumentId || isDirty)
}

export type SaveDocumentOnCloseResult = {
  closed: boolean
  error?: string
}

/**
 * Chiede se salvare prima di chiudere. Se l'utente conferma, esegue `save` in automatico.
 */
export async function confirmSaveDocumentOnClose(
  needsPrompt: boolean,
  save: () => Promise<unknown>,
): Promise<SaveDocumentOnCloseResult> {
  if (!needsPrompt) return { closed: true }

  if (!window.confirm(SAVE_DOCUMENT_CONFIRM_MESSAGE)) {
    return { closed: true }
  }

  try {
    await save()
    return { closed: true }
  } catch (err) {
    return {
      closed: false,
      error: err instanceof Error ? err.message : 'Salvataggio non riuscito.',
    }
  }
}

export function snapshotDocumentState<T>(state: T): string {
  return JSON.stringify(state)
}

export function isDocumentStateDirty<T>(current: T | null, savedSnapshot: string | null): boolean {
  if (!current || !savedSnapshot) return false
  return JSON.stringify(current) !== savedSnapshot
}
