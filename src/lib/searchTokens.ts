import type { Client, Product, Supplier } from '../types'

const MAX_TOKENS = 40

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Token lowercase per array-contains Firestore (parole + stringhe intere). */
function extractTokens(...parts: (string | undefined | null)[]): string[] {
  const set = new Set<string>()
  for (const part of parts) {
    if (!part?.trim()) continue
    const normalized = normalizeToken(part)
    if (normalized.length >= 1) set.add(normalized)
    for (const word of normalized.split(/[\s\-_/.,]+/).filter(w => w.length >= 2)) {
      set.add(word)
    }
  }
  return [...set].slice(0, MAX_TOKENS)
}

export function buildProductSearchTokens(p: Partial<Product>): string[] {
  return extractTokens(
    p.code,
    p.name,
    p.brand,
    p.model,
    p.barcode,
    p.categoryName,
    p.subcategoryName,
    p.description,
  )
}

export function buildClientSearchTokens(c: Partial<Client>): string[] {
  return extractTokens(
    c.code,
    c.name,
    c.phone,
    c.cellPhone,
    c.email,
    c.vatNumber,
    c.fiscalCode,
    c.city,
    c.address,
    c.contactPerson,
  )
}

export function buildSupplierSearchTokens(s: Partial<Supplier>): string[] {
  return extractTokens(
    s.code,
    s.name,
    s.phone,
    s.cellPhone,
    s.email,
    s.vatNumber,
    s.fiscalCode,
    s.city,
    s.address,
    s.contactPerson,
  )
}

export function tokenizeSearchTerm(term: string): string[] {
  return term
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function haystackIncludesAll(haystack: string, words: string[]): boolean {
  const h = haystack.toLowerCase()
  return words.every(w => h.includes(w))
}
