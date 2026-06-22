import JSZip from 'jszip'

const SPREADSHEET_EXT = /\.(xlsx|xls|csv|ods)$/i
const ARCHIVE_EXT = /\.(eft|efs|fdb)$/i

export type BefExtractResult = {
  spreadsheets: File[]
  archiveFiles: File[]
  /** true se il .bef sembra un archivio zip/espanso */
  expanded: boolean
}

function fileFromBlob(name: string, blob: Blob): File {
  return new File([blob], name, { type: blob.type || 'application/octet-stream' })
}

/** Prova ad aprire un .bef come zip e a estrarre Excel/CSV o archivi .eft. */
export async function extractFilesFromBef(befFile: File): Promise<BefExtractResult> {
  const buffer = await befFile.arrayBuffer()
  const spreadsheets: File[] = []
  const archiveFiles: File[] = []

  const tryZip = async (data: ArrayBuffer): Promise<boolean> => {
    try {
      const zip = await JSZip.loadAsync(data)
      const names = Object.keys(zip.files).filter(n => !zip.files[n]?.dir)
      if (!names.length) return false

      for (const name of names) {
        const entry = zip.files[name]
        if (!entry || entry.dir) continue
        const base = name.split(/[/\\]/).pop() ?? name
        const blob = await entry.async('blob')
        if (SPREADSHEET_EXT.test(base)) {
          spreadsheets.push(fileFromBlob(base, blob))
        } else if (ARCHIVE_EXT.test(base)) {
          archiveFiles.push(fileFromBlob(base, blob))
        }
      }
      return spreadsheets.length > 0 || archiveFiles.length > 0
    } catch {
      return false
    }
  }

  const expanded = await tryZip(buffer)
  if (expanded) {
    return { spreadsheets, archiveFiles, expanded: true }
  }

  // Alcuni .bef sono l'archivio Firebird (.eft) con estensione diversa
  if (befFile.size > 64 * 1024) {
    archiveFiles.push(
      new File([buffer], befFile.name.replace(/\.bef$/i, '.eft'), {
        type: 'application/octet-stream',
      }),
    )
  }

  return { spreadsheets, archiveFiles, expanded: false }
}
