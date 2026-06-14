import type { Product } from '../../../types'
import { getCustomGruppi } from '../../../lib/userPrefs'
import type { RigaDocumento } from './types'
import { calcRiga, emptyRiga, productListGrossPrice } from './utils'

export type GruppoProdottoItem = {
  id: string
  productId?: string
  cod: string
  descrizione: string
  qta: number
}

export type GruppoProdotto = {
  id: string
  nome: string
  soloPrezzoComplessivo: boolean
  items: GruppoProdottoItem[]
}

function storageKey(studioId: string): string {
  return `gruppi_prodotti_${studioId}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`fixlab_prefs_${key}`)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(`fixlab_prefs_${key}`, JSON.stringify(value))
}

export function createEmptyGruppo(nome = 'Nuovo gruppo'): GruppoProdotto {
  return {
    id: crypto.randomUUID(),
    nome,
    soloPrezzoComplessivo: false,
    items: [],
  }
}

export function createGruppoItemFromProduct(p: Product, qta = 1): GruppoProdottoItem {
  return {
    id: crypto.randomUUID(),
    productId: p.id,
    cod: p.code || '',
    descrizione: p.name || '',
    qta,
  }
}

export function loadProductGroups(studioId: string): GruppoProdotto[] {
  const key = storageKey(studioId)
  const stored = readJson<GruppoProdotto[]>(key, [])
  if (stored.length > 0) return stored

  const legacy = getCustomGruppi()
  if (legacy.length === 0) return []

  const migrated = legacy.map(nome => createEmptyGruppo(nome))
  writeJson(key, migrated)
  return migrated
}

export function saveProductGroups(studioId: string, groups: GruppoProdotto[]): void {
  writeJson(storageKey(studioId), groups)
}

export function buildRigheFromGruppo(
  group: GruppoProdotto,
  products: Product[],
  listino: string,
): RigaDocumento[] {
  const header = calcRiga({
    ...emptyRiga(),
    descrizione: `— ${group.nome} —`,
    tipoRiga: 'nota',
    qta: 0,
    prezzoIvato: 0,
    um: '',
    iva: 0,
    scaricaMagazzino: false,
  })

  if (group.items.length === 0) {
    return [header]
  }

  if (group.soloPrezzoComplessivo) {
    let total = 0
    for (const item of group.items) {
      const p = item.productId ? products.find(x => x.id === item.productId) : null
      const price = p ? productListGrossPrice(p, listino) : 0
      total += item.qta * price
    }
    return [
      header,
      calcRiga({
        ...emptyRiga(),
        descrizione: group.nome,
        qta: 1,
        prezzoIvato: Math.round(total * 100) / 100,
        scaricaMagazzino: true,
      }),
    ]
  }

  const rows: RigaDocumento[] = [header]
  for (const item of group.items) {
    const p = item.productId ? products.find(x => x.id === item.productId) : null
    if (p) {
      rows.push(
        calcRiga({
          ...emptyRiga(),
          cod: p.code || item.cod,
          descrizione: p.name || item.descrizione,
          productId: p.id,
          qta: item.qta,
          um: p.unitOfMeasure || 'pz',
          prezzoIvato: productListGrossPrice(p, listino),
          iva: 22,
          scaricaMagazzino: p.typology !== 'service',
        }),
      )
    } else {
      rows.push(
        calcRiga({
          ...emptyRiga(),
          cod: item.cod,
          descrizione: item.descrizione,
          qta: item.qta,
          um: 'pz',
        }),
      )
    }
  }
  return rows
}
