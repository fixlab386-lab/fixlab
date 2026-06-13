import { addClient, addSupplier } from '../../lib/firestore'
import { clienteToClientPayload, emptyCliente } from '../features/clienti/types'
import { emptyFornitore, fornitoreToSupplierPayload } from '../features/fornitori/types'

function splitCsvLine(line: string): string[] {
  const sep = line.includes(';') ? ';' : ','
  return line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase())
  for (const c of candidates) {
    const i = lower.findIndex(h => h.includes(c))
    if (i >= 0) return i
  }
  return -1
}

export type ImportAnagraficaResult = { imported: number; skipped: number; error?: string }

export async function importClientsFromCsv(
  csvText: string,
  studioId: string,
  getNextCode: () => Promise<string>,
): Promise<ImportAnagraficaResult> {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { imported: 0, skipped: 0, error: 'File vuoto o senza righe dati.' }

  const headers = splitCsvLine(lines[0])
  const nameIdx = findColumnIndex(headers, ['denominazione', 'ragione', 'nome', 'name'])
  const emailIdx = findColumnIndex(headers, ['email', 'e-mail', 'mail'])
  const phoneIdx = findColumnIndex(headers, ['telefono', 'tel', 'phone', 'cellulare'])
  const cityIdx = findColumnIndex(headers, ['città', 'citta', 'comune', 'city'])
  const capIdx = findColumnIndex(headers, ['cap', 'zip'])
  const provIdx = findColumnIndex(headers, ['prov', 'provincia'])

  if (nameIdx < 0) return { imported: 0, skipped: 0, error: 'Colonna denominazione/nome non trovata.' }

  let imported = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const name = cols[nameIdx]?.trim()
    if (!name) {
      skipped++
      continue
    }
    const code = await getNextCode()
    const draft = emptyCliente(code)
    draft.sedeOperativa.denominazione = name
    if (emailIdx >= 0) draft.contatti.email = cols[emailIdx] || ''
    if (phoneIdx >= 0) draft.contatti.telefono = cols[phoneIdx] || ''
    if (cityIdx >= 0) draft.sedeOperativa.citta = cols[cityIdx] || ''
    if (capIdx >= 0) draft.sedeOperativa.cap = cols[capIdx] || ''
    if (provIdx >= 0) draft.sedeOperativa.prov = cols[provIdx] || ''
    await addClient(clienteToClientPayload(draft, studioId))
    imported++
  }

  return { imported, skipped }
}

export async function importSuppliersFromCsv(
  csvText: string,
  studioId: string,
  getNextCode: () => Promise<string>,
): Promise<ImportAnagraficaResult> {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { imported: 0, skipped: 0, error: 'File vuoto o senza righe dati.' }

  const headers = splitCsvLine(lines[0])
  const nameIdx = findColumnIndex(headers, ['denominazione', 'ragione', 'nome', 'name'])
  const emailIdx = findColumnIndex(headers, ['email', 'e-mail', 'mail'])
  const phoneIdx = findColumnIndex(headers, ['telefono', 'tel', 'phone'])

  if (nameIdx < 0) return { imported: 0, skipped: 0, error: 'Colonna denominazione/nome non trovata.' }

  let imported = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const name = cols[nameIdx]?.trim()
    if (!name) {
      skipped++
      continue
    }
    const code = await getNextCode()
    const draft = emptyFornitore(code)
    draft.sedeOperativa.denominazione = name
    if (emailIdx >= 0) draft.contatti.email = cols[emailIdx] || ''
    if (phoneIdx >= 0) draft.contatti.telefono = cols[phoneIdx] || ''
    await addSupplier(fornitoreToSupplierPayload(draft, studioId))
    imported++
  }

  return { imported, skipped }
}
