export type SoggettoRicercaResult = {
  denominazione: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  cf: string
  piva: string
  source: 'studio' | 'vies'
}

export type SoggettoRicercaRecord = {
  denominazione: string
  indirizzo?: string
  cap?: string
  citta?: string
  prov?: string
  cf?: string
  piva?: string
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

function digits(s: string): string {
  return s.replace(/\D/g, '')
}

export function searchStudioSoggetti(records: SoggettoRicercaRecord[], query: string): SoggettoRicercaResult[] {
  const q = query.trim()
  if (!q) return []
  const qLower = norm(q)
  const qDigits = digits(q)

  const out: SoggettoRicercaResult[] = []
  const seen = new Set<string>()

  for (const r of records) {
    const denom = r.denominazione?.trim()
    if (!denom) continue
    const cf = r.cf?.trim() || ''
    const piva = r.piva?.trim() || ''
    const key = `${denom}|${cf}|${piva}`
    if (seen.has(key)) continue

    const match =
      norm(denom).includes(qLower) ||
      (cf && (norm(cf).includes(qLower) || digits(cf) === qDigits)) ||
      (piva && (norm(piva).includes(qLower) || digits(piva) === qDigits))

    if (!match) continue
    seen.add(key)
    out.push({
      denominazione: denom,
      indirizzo: r.indirizzo?.trim() || '',
      cap: r.cap?.trim() || '',
      citta: r.citta?.trim() || '',
      prov: r.prov?.trim().toUpperCase() || '',
      cf,
      piva,
      source: 'studio',
    })
    if (out.length >= 50) break
  }
  return out
}

/** Parsing indirizzo VIES (es. "VIA ROMA 1\n10100 MILANO MI"). */
export function parseViesAddress(raw: string): { indirizzo: string; cap: string; citta: string; prov: string } {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return { indirizzo: '', cap: '', citta: '', prov: '' }
  if (lines.length === 1) {
    const m = lines[0].match(/^(.+?)\s+(\d{5})\s+(.+?)\s+([A-Z]{2})$/i)
    if (m) {
      return { indirizzo: m[1].trim(), cap: m[2], citta: m[3].trim(), prov: m[4].toUpperCase() }
    }
    return { indirizzo: lines[0], cap: '', citta: '', prov: '' }
  }
  const last = lines[lines.length - 1]
  const m = last.match(/^(\d{5})\s+(.+?)\s+([A-Z]{2})$/i)
  if (m) {
    return {
      indirizzo: lines.slice(0, -1).join(', '),
      cap: m[1],
      citta: m[2].trim(),
      prov: m[3].toUpperCase(),
    }
  }
  return { indirizzo: lines.slice(0, -1).join(', ') || lines[0], cap: '', citta: '', prov: '' }
}

export async function lookupItalianVat(vatNumber: string): Promise<SoggettoRicercaResult | null> {
  const vat = digits(vatNumber)
  if (vat.length !== 11) return null
  try {
    const res = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode: 'IT', vatNumber: vat }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      valid?: boolean
      name?: string
      address?: string
      vatNumber?: string
    }
    if (!data.valid || !data.name) return null
    const addr = parseViesAddress(data.address || '')
    return {
      denominazione: data.name.replace(/\s+/g, ' ').trim(),
      indirizzo: addr.indirizzo,
      cap: addr.cap,
      citta: addr.citta,
      prov: addr.prov,
      cf: '',
      piva: data.vatNumber || vat,
      source: 'vies',
    }
  } catch {
    return null
  }
}

export async function searchSoggettiNazionale(
  query: string,
  studioRecords: SoggettoRicercaRecord[],
): Promise<{ results: SoggettoRicercaResult[]; viesError?: boolean }> {
  const local = searchStudioSoggetti(studioRecords, query)
  const vat = digits(query)
  if (vat.length === 11) {
    const vies = await lookupItalianVat(vat)
    if (vies) {
      const dup = local.some(
        r => digits(r.piva) === digits(vies.piva) && norm(r.denominazione) === norm(vies.denominazione),
      )
      return { results: dup ? local : [vies, ...local] }
    }
    return { results: local, viesError: local.length === 0 }
  }
  return { results: local }
}
