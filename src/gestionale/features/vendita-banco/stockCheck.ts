import type { Product } from '../../../types'
import type { RigaDocumento } from './types'

export type AnomaliaMagazzino = {
  codice: string
  descrizione: string
  richiesta: number
  giacenza: number
}

export function findAnomalieMagazzino(righe: RigaDocumento[], products: Product[]): AnomaliaMagazzino[] {
  const anomalies: AnomaliaMagazzino[] = []
  for (const r of righe) {
    if (!r.descrizione.trim() || !r.productId || !r.scaricaMagazzino) continue
    const p = products.find(x => x.id === r.productId)
    if (!p || p.typology !== 'with_stock') continue
    const giacenza = p.stock ?? 0
    if (r.qta > giacenza) {
      anomalies.push({
        codice: r.cod || p.code,
        descrizione: r.descrizione || p.name,
        richiesta: r.qta,
        giacenza,
      })
    }
  }
  return anomalies
}
