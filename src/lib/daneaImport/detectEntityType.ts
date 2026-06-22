import type { ClassifiedFile, DaneaEntityType, ParsedSpreadsheet } from './types'
import { findColumn } from './spreadsheet'

function scoreEntity(headers: string[], fileName: string, entity: DaneaEntityType): number {
  let score = 0
  const name = fileName.toLowerCase()

  if (entity === 'clients') {
    if (name.includes('client')) score += 4
    if (findColumn(headers, ['denominazione', 'ragione sociale', 'nome'])) score += 3
    if (findColumn(headers, ['partita iva', 'p.iva', 'piva'])) score += 2
    if (findColumn(headers, ['cod. fiscale', 'cod fiscale', 'codice fiscale'])) score += 1
    if (findColumn(headers, ['giacenza', 'prezzo listino', 'cod. a barre', 'cod a barre'])) score -= 3
  }

  if (entity === 'suppliers') {
    if (name.includes('fornit')) score += 4
    if (findColumn(headers, ['denominazione', 'ragione sociale', 'nome'])) score += 3
    if (findColumn(headers, ['partita iva', 'p.iva', 'piva'])) score += 2
    if (findColumn(headers, ['giacenza', 'prezzo listino', 'cod. a barre'])) score -= 3
  }

  if (entity === 'products') {
    if (name.includes('prodott') || name.includes('magazz') || name.includes('artic')) score += 4
    if (findColumn(headers, ['descrizione', 'desc.'])) score += 3
    if (findColumn(headers, ['cod.', 'codice', 'cod prodotto', 'cod. prodotto'])) score += 2
    if (findColumn(headers, ['giacenza', 'qta', 'quantita'])) score += 2
    if (findColumn(headers, ['prezzo', 'prezzo listino', 'listino 1'])) score += 2
    if (findColumn(headers, ['cod. a barre', 'cod a barre', 'barcode', 'ean'])) score += 1
    if (findColumn(headers, ['categoria', 'sottocategoria'])) score += 1
    if (findColumn(headers, ['numero', 'data doc', 'tipo documento'])) score -= 3
  }

  if (entity === 'documents') {
    if (name.includes('fattur') || name.includes('document') || name.includes('preventiv')) score += 4
    if (name.includes('ordine') || name.includes('ddt') || name.includes('banco') || name.includes('trasporto')) score += 3
    if (findColumn(headers, ['numero', 'num.', 'n. doc', 'numero doc'])) score += 4
    if (findColumn(headers, ['data', 'data doc', 'data documento'])) score += 3
    if (findColumn(headers, ['tipo documento', 'tipo doc', 'tipo', 'causale'])) score += 2
    if (findColumn(headers, ['tot. documento', 'tot documento', 'totale documento'])) score += 3
    if (findColumn(headers, ['cliente', 'fornitore', 'soggetto', 'destinatario'])) score += 1
    if (findColumn(headers, ['denominazione', 'partita iva']) && !findColumn(headers, ['numero', 'num.'])) score -= 4
    if (findColumn(headers, ['giacenza', 'cod. a barre'])) score -= 3
  }

  return score
}

export function classifySpreadsheet(parsed: ParsedSpreadsheet): ClassifiedFile {
  const scores: Array<{ type: DaneaEntityType; score: number }> = [
    { type: 'documents', score: scoreEntity(parsed.headers, parsed.fileName, 'documents') },
    { type: 'clients', score: scoreEntity(parsed.headers, parsed.fileName, 'clients') },
    { type: 'suppliers', score: scoreEntity(parsed.headers, parsed.fileName, 'suppliers') },
    { type: 'products', score: scoreEntity(parsed.headers, parsed.fileName, 'products') },
  ]
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]
  const entityType = best && best.score >= 3 ? best.type : 'unknown'
  return { ...parsed, entityType, confidence: best?.score ?? 0 }
}

export function isBefFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.bef')
}

export function isEftFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return lower.endsWith('.eft') || lower.endsWith('.efs') || lower.endsWith('.fdb')
}

export function isDaneaArchiveFile(file: File): boolean {
  return isBefFile(file) || isEftFile(file)
}
