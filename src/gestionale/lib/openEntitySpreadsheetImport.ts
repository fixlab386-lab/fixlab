import {
  formatEntityImportResult,
  importEntityFromSpreadsheet,
} from '../../lib/daneaImport/runEntityImport'
import { isDefXmlImportFile, defXmlImportRejectionMessage } from '../../lib/daneaImport/defXml'
import {
  isSpreadsheetImportFile,
  spreadsheetImportRejectionMessage,
} from '../../lib/daneaImport/spreadsheet'
import type { DaneaEntityType } from '../../lib/daneaImport/types'

type EntityImportTarget = 'clients' | 'suppliers' | 'products' | 'documents'

export function openEntitySpreadsheetImport(opts: {
  studioId: string | undefined
  entity: EntityImportTarget
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onProgress?: (message: string) => void
}): void {
  if (!opts.studioId) {
    opts.onError('Seleziona uno studio prima di importare.')
    return
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const acceptsDefXml = opts.entity === 'documents' && isDefXmlImportFile(file)
    if (!acceptsDefXml && !isSpreadsheetImportFile(file)) {
      opts.onError(
        opts.entity === 'documents'
          ? defXmlImportRejectionMessage(file.name)
          : spreadsheetImportRejectionMessage(file.name),
      )
      return
    }
    opts.onProgress?.('Importazione in corso…')
    try {
      const result = await importEntityFromSpreadsheet(
        opts.studioId!,
        file,
        opts.entity,
        progress => opts.onProgress?.(progress.message),
      )
      opts.onSuccess(formatEntityImportResult(opts.entity as DaneaEntityType, result))
    } catch (err) {
      console.error('Import spreadsheet failed', err)
      const msg = err instanceof Error ? err.message : ''
      opts.onError(
        msg && !msg.includes('Importazione non riuscita')
          ? msg
          : opts.entity === 'documents'
            ? 'Importazione non riuscita. Usa un file Easyfatt-Xml (.DefXml) o Excel/ODS esportato da Danea.'
            : 'Importazione non riuscita. Verifica che il file .ods o Excel sia un export da Danea Easyfatt.',
      )
    }
  }
  input.click()
}
