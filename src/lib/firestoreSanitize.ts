/** Rimuove campi `undefined` — Firestore non li accetta (anche dentro array annidati). */
export function omitUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item =>
      item !== null && typeof item === 'object' && !(item instanceof Date)
        ? omitUndefined(item as object)
        : item,
    ) as T
  }

  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      out[key] = omitUndefined(val)
    } else {
      out[key] = val
    }
  }
  return out as T
}
