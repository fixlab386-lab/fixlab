/** Rimuove campi `undefined` — Firestore non li accetta. */
export function omitUndefined<T extends object>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item =>
      item !== null && typeof item === 'object' ? omitUndefined(item as object) : item,
    ) as T
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      out[key] = omitUndefined(val as object)
    } else {
      out[key] = val
    }
  }
  return out as T
}
