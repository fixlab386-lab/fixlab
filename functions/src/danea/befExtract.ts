import AdmZip from 'adm-zip'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import sevenBin from '7zip-bin'

const SPREADSHEET_EXT = /\.(xlsx|xls|csv|ods)$/i
const ARCHIVE_EXT = /\.(eft|efs|fdb)$/i

export type ExtractedArchive = {
  workDir: string
  databasePath: string | null
  spreadsheets: Array<{ name: string; path: string }>
  /** true se il file caricato era un .bef non decodificabile come archivio */
  befProprietary: boolean
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkFiles(full, acc)
    else acc.push(full)
  }
  return acc
}

function scanExtractedDir(workDir: string): Pick<ExtractedArchive, 'databasePath' | 'spreadsheets'> {
  const spreadsheets: ExtractedArchive['spreadsheets'] = []
  let databasePath: string | null = null

  for (const filePath of walkFiles(workDir)) {
    const name = basename(filePath)
    if (SPREADSHEET_EXT.test(name)) {
      spreadsheets.push({ name, path: filePath })
    } else if (ARCHIVE_EXT.test(name) && !databasePath) {
      databasePath = filePath
    }
  }

  return { databasePath, spreadsheets }
}

function tryZipExtract(buffer: Buffer, workDir: string): boolean {
  try {
    const zip = new AdmZip(buffer)
    zip.extractAllTo(workDir, true)
    return true
  } catch {
    return false
  }
}

function is7zArchive(buffer: Buffer): boolean {
  return buffer.length >= 6 && buffer.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))
}

function try7zExtract(buffer: Buffer, workDir: string): boolean {
  if (!is7zArchive(buffer)) return false
  const archivePath = join(workDir, 'upload.bef')
  try {
    writeFileSync(archivePath, buffer)
    execFileSync(sevenBin.path7za, ['x', archivePath, `-o${workDir}`, '-y'], { timeout: 120_000 })
    return true
  } catch {
    return false
  }
}

/** Estrae da .bef / .eft: zip/7z interno, file Excel o database Easyfatt. */
export function extractDaneaArchiveFile(buffer: Buffer, originalName: string): ExtractedArchive {
  const workDir = join(tmpdir(), `fixlab-danea-${randomUUID()}`)
  mkdirSync(workDir, { recursive: true })

  const lower = originalName.toLowerCase()
  if (lower.endsWith('.eft') || lower.endsWith('.efs') || lower.endsWith('.fdb')) {
    const dbPath = join(workDir, basename(originalName))
    writeFileSync(dbPath, buffer)
    return { workDir, databasePath: dbPath, spreadsheets: [], befProprietary: false }
  }

  if (tryZipExtract(buffer, workDir)) {
    const scanned = scanExtractedDir(workDir)
    if (scanned.databasePath || scanned.spreadsheets.length) {
      return { workDir, ...scanned, befProprietary: false }
    }
  }

  if (try7zExtract(buffer, workDir)) {
    const scanned = scanExtractedDir(workDir)
    if (scanned.databasePath || scanned.spreadsheets.length) {
      return { workDir, ...scanned, befProprietary: false }
    }
  }

  if (lower.endsWith('.bef')) {
    return { workDir, databasePath: null, spreadsheets: [], befProprietary: true }
  }

  return { workDir, databasePath: null, spreadsheets: [], befProprietary: false }
}

export function copyDatabaseForRead(sourcePath: string, workDir: string): string {
  const dest = join(workDir, `read-${basename(sourcePath)}`)
  copyFileSync(sourcePath, dest)
  return dest
}

export function archiveExtension(path: string): string {
  return extname(path).toLowerCase()
}
