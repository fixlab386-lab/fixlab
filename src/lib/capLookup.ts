export type CapRecord = {
  cap: string
  citta: string
  provincia: string
}

let capCache: CapRecord[] | null = null
let capLoadPromise: Promise<CapRecord[]> | null = null

/** Caricamento lazy del dataset CAP (solo al primo utilizzo). */
export async function loadCapDataset(): Promise<CapRecord[]> {
  if (capCache) return capCache
  if (!capLoadPromise) {
    capLoadPromise = import('../data/cap.json').then(mod => {
      capCache = mod.default as CapRecord[]
      return capCache
    })
  }
  return capLoadPromise
}

export async function lookupByCap(cap: string): Promise<CapRecord[]> {
  const normalized = cap.replace(/\D/g, '').padStart(5, '0').slice(0, 5)
  if (normalized.length < 5) return []
  const data = await loadCapDataset()
  return data.filter(r => r.cap === normalized)
}

export async function searchCapRecords(filters: {
  cap?: string
  citta?: string
  provincia?: string
  limit?: number
}): Promise<CapRecord[]> {
  const data = await loadCapDataset()
  const capQ = filters.cap?.replace(/\D/g, '').trim() ?? ''
  const cittaQ = filters.citta?.trim().toLowerCase() ?? ''
  const provQ = filters.provincia?.trim().toUpperCase() ?? ''
  const limit = filters.limit ?? 100

  const results: CapRecord[] = []
  for (const row of data) {
    if (capQ && !row.cap.startsWith(capQ)) continue
    if (cittaQ && !row.citta.toLowerCase().includes(cittaQ)) continue
    if (provQ && row.provincia.toUpperCase() !== provQ) continue
    results.push(row)
    if (results.length >= limit) break
  }
  return results
}
