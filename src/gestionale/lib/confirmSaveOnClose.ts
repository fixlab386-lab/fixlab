export const SAVE_DOCUMENT_CONFIRM_MESSAGE = 'Vuoi salvare il documento?'

/** Documento con righe non ancora salvate o con modifiche dopo l'ultimo salvataggio. */
export function documentNeedsSaveOnClose(
  hasRows: boolean,
  savedDocumentId: string | null,
  isDirty: boolean,
): boolean {
  return hasRows && (!savedDocumentId || isDirty)
}

/**
 * Chiede se salvare prima di chiudere. Se l'utente conferma, esegue `save` in automatico.
 * @returns `'close'` se il modale va chiuso, `'stay'` se resta aperto (salvataggio rifiutato o fallito).
 */
export async function confirmSaveDocumentOnClose(
  needsPrompt: boolean,
  save: () => Promise<unknown>,
): Promise<'close' | 'stay'> {
  if (!needsPrompt) return 'close'

  if (!window.confirm(SAVE_DOCUMENT_CONFIRM_MESSAGE)) {
    return 'close'
  }

  try {
    await save()
    return 'close'
  } catch {
    return 'stay'
  }
}

export function snapshotDocumentState<T>(state: T): string {
  return JSON.stringify(state)
}

export function isDocumentStateDirty<T>(current: T | null, savedSnapshot: string | null): boolean {
  if (!current || !savedSnapshot) return false
  return JSON.stringify(current) !== savedSnapshot
}
