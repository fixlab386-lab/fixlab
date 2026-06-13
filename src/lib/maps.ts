export type MapAddress = {
  indirizzo?: string
  cap?: string
  citta?: string
  prov?: string
  nazione?: string
}

export function formatAddressLine(addr: MapAddress): string {
  return [addr.indirizzo, addr.cap, addr.citta, addr.prov, addr.nazione].filter(Boolean).join(', ')
}

export function openMapsForAddress(addr: MapAddress): void {
  const q = formatAddressLine(addr).trim()
  if (!q) {
    alert('Compila almeno indirizzo e città per aprire la mappa.')
    return
  }
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer')
}
