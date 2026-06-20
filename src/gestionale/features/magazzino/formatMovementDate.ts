export function formatMovementDate(d: unknown): string {
  if (!d) return '—'
  let date: Date
  if (d instanceof Date) date = d
  else if (typeof d === 'string') date = new Date(d.includes('T') ? d : `${d}T12:00:00`)
  else if (typeof d === 'object' && d !== null && 'toDate' in d)
    date = (d as { toDate: () => Date }).toDate()
  else if (typeof d === 'object' && d !== null && 'seconds' in d)
    date = new Date((d as { seconds: number }).seconds * 1000)
  else return '—'
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
