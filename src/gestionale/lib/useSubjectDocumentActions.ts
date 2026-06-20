import { useCallback, useState } from 'react'
import { useOpenDocumentFlow } from './openDocumentFlow'
import { resolveNuovoDocLabel, type SubjectDocumentContext } from './nuovoDocLabels'

export type SubjectDocumentsDialogTarget = {
  subjectId: string
  subjectName: string
  subjectType: 'client' | 'supplier'
}

export function useSubjectDocumentActions() {
  const { openNew } = useOpenDocumentFlow()
  const [documentsDialog, setDocumentsDialog] = useState<SubjectDocumentsDialogTarget | null>(null)

  const openNuovoDocFromLabel = useCallback(
    (label: string, subject?: SubjectDocumentContext) => {
      const type = resolveNuovoDocLabel(label)
      if (!type) return false
      openNew(type, subject)
      return true
    },
    [openNew],
  )

  const openSubjectDocuments = useCallback((target: SubjectDocumentsDialogTarget) => {
    setDocumentsDialog(target)
  }, [])

  const closeSubjectDocuments = useCallback(() => {
    setDocumentsDialog(null)
  }, [])

  return {
    openNuovoDocFromLabel,
    openSubjectDocuments,
    closeSubjectDocuments,
    documentsDialog,
  }
}
