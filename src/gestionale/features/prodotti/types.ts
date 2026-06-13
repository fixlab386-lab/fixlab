import type { Category, Product, StockMovement } from '../../../types'
import { LISTINI_GLOBALI, TIPOLOGIE_PRODOTTO } from './constants'

export type TipologiaProdotto =
  | 'Servizio'
  | 'Articolo'
  | 'ArtMagazzino'
  | 'ArtLottiSeriali'
  | 'ArtTaglieColori'

export type SchedaTabId = 'caratteristiche' | 'dimensioni' | 'dettagli' | 'magazzino'

export type ColonnaId = 'cod' | 'descrizione' | 'produttore' | 'prezzo'

export type RaggruppaCriterio =
  | 'Nessuno'
  | 'Categoria'
  | 'CategoriaSottocategoria'
  | 'Um'
  | 'Fornitore'
  | 'Produttore'
  | 'Opzioni'
  | 'Giacenza'
  | 'Richiesta'
  | 'Nota'

export type CercaVeloceCampo = 'codBarre' | 'descrizione' | 'codProduttore'
export type CercaVeloceModo = 'cominciaCon' | 'inizianoPer' | 'contengono'

export type ColumnFilter =
  | { kind: 'text'; search: string }
  | { kind: 'values'; selected: Set<string>; showAll: boolean; showEmpty: boolean; search: string }
  | { kind: 'produttore'; mode: 'tutti' | 'personalizzato' | 'nonVuote' | 'vuote' }

export interface RegolaListino {
  base?: string
  copiaDaListino?: string
  ricaricoSuCosto?: number
  diminuzione?: number
  importoFisso?: number
  arrotondamento?: string
}

export interface PrezzoListino {
  listinoId: string
  modalita: 'manuale' | 'calcolato'
  valore: number
  ivato: boolean
  regola?: RegolaListino
}

export interface Movimento {
  data: string
  tipoDoc: string
  numero: string
  ragioneSociale: string
  qta: number
  valore: number
}

export interface Magazzino {
  giacenza: number
  impegnata: number
  ordinata: number
  disponibile: number
  scortaMinima: number
  ubicazione: string
  ordineMultiplo: number
  movimenti: Movimento[]
}

export interface Prodotto {
  id: string
  studioId: string
  isDraft?: boolean
  codProdotto: string
  descrizione: string
  tipologia: TipologiaProdotto
  categoria: string
  sottocategoria: string
  categoryId: string
  subcategoryId: string
  um: string
  prezzi: PrezzoListino[]
  prezzoCosto: number
  note: string
  dimensioni?: {
    larghezza: number
    altezza: number
    profondita: number
    volume: number
    umDim: string
    peso: number
    pesoLordo: number
    umPeso: string
  }
  dettagli: {
    aliquotaIva: string
    codBarre: string
    fornitore: string
    produttore: string
    artAssemblato: boolean
    componenti?: string
    mostraVenditaTouch: boolean
    garanzia: string
    richiesta: string
    ubicazione: string
    codProdFornitore: string
    noteFornitura: string
  }
  magazzino?: Magazzino
  allegati?: string[]
  immagineUrl?: string
  variantiTagliaColore?: string
  lottiSeriali?: string
}

export function tipologiaHaMagazzino(t: TipologiaProdotto): boolean {
  return t === 'ArtMagazzino' || t === 'ArtLottiSeriali' || t === 'ArtTaglieColori'
}

export function tipologiaToProductTypology(t: TipologiaProdotto): Product['typology'] {
  if (t === 'Servizio') return 'service'
  if (t === 'Articolo') return 'generic'
  return 'with_stock'
}

export function productTypologyToTipologia(t: Product['typology'], variants?: string): TipologiaProdotto {
  if (t === 'service') return 'Servizio'
  if (t === 'generic') return 'Articolo'
  if (variants?.includes('lotti')) return 'ArtLottiSeriali'
  if (variants?.includes('taglie')) return 'ArtTaglieColori'
  return 'ArtMagazzino'
}

export function defaultPrezziListini(): PrezzoListino[] {
  return LISTINI_GLOBALI.map(l => ({
    listinoId: l.id,
    modalita: 'manuale' as const,
    valore: 0,
    ivato: l.ivatoDefault,
    regola: l.id === 'privati' ? undefined : { diminuzione: 0 },
  }))
}

export function calcDisponibile(giacenza: number, impegnata: number, ordinata: number): number {
  return giacenza - impegnata + ordinata
}

export function movementToMovimento(m: StockMovement): Movimento {
  const qta = m.loaded ?? m.unloaded ?? m.committed ?? m.incoming ?? m.adjustDelta ?? 0
  return {
    data: m.date,
    tipoDoc: m.type === 'load' ? 'Carico' : m.type === 'unload' ? 'Scarico' : m.type === 'adjust' ? 'Rettifica' : m.type,
    numero: m.id.slice(0, 8),
    ragioneSociale: m.subjectName || '',
    qta: Math.abs(qta),
    valore: 0,
  }
}

export function productToProdotto(
  p: Product,
  movements: StockMovement[] = [],
): Prodotto {
  const impegnata = movements.filter(m => m.productId === p.id).reduce((s, m) => s + (m.committed || 0), 0)
  const ordinata = movements.filter(m => m.productId === p.id).reduce((s, m) => s + (m.incoming || 0), 0)
  const giacenza = p.stock ?? 0
  const tipologia = productTypologyToTipologia(p.typology, p.variants)

  const prezzi: PrezzoListino[] = LISTINI_GLOBALI.map(l => {
    const key = l.id as keyof typeof p.prices
    const val = (p.prices as unknown as Record<string, number | undefined>)[key] ?? p.price ?? 0
    return { listinoId: l.id, modalita: 'manuale', valore: val, ivato: l.ivatoDefault }
  })

  const parts = (p.categoryName || '').split('»').map(s => s.trim())
  const categoria = parts[0] || ''
  const sottocategoria = p.subcategoryName || parts[1] || ''

  const prodotto: Prodotto = {
    id: p.id,
    studioId: p.studioId,
    codProdotto: p.code || '',
    descrizione: p.description || p.name || '',
    tipologia,
    categoria,
    sottocategoria,
    categoryId: p.categoryId || '',
    subcategoryId: p.subcategoryId || '',
    um: p.unitOfMeasure || 'Kg',
    prezzi,
    prezzoCosto: p.purchasePrice ?? 0,
    note: p.notes || '',
    dettagli: {
      aliquotaIva: '22%',
      codBarre: p.barcode || '',
      fornitore: p.supplierName || '',
      produttore: p.brand || '',
      artAssemblato: false,
      mostraVenditaTouch: false,
      garanzia: '',
      richiesta: '',
      ubicazione: '',
      codProdFornitore: '',
      noteFornitura: '',
    },
    allegati: p.attachments,
    immagineUrl: p.imageUrl,
    variantiTagliaColore: tipologia === 'ArtTaglieColori' ? p.variants : undefined,
    lottiSeriali: tipologia === 'ArtLottiSeriali' ? p.variants : undefined,
  }

  if (tipologiaHaMagazzino(tipologia)) {
    prodotto.magazzino = {
      giacenza,
      impegnata,
      ordinata,
      disponibile: calcDisponibile(giacenza, impegnata, ordinata),
      scortaMinima: p.minStock ?? 0,
      ubicazione: prodotto.dettagli.ubicazione,
      ordineMultiplo: 1,
      movimenti: movements.filter(m => m.productId === p.id).map(movementToMovimento),
    }
  }

  if (p.weight || p.dimensions) {
    prodotto.dimensioni = {
      larghezza: 0,
      altezza: 0,
      profondita: 0,
      volume: 0,
      umDim: 'cm',
      peso: parseFloat(p.weight || '0') || 0,
      pesoLordo: 0,
      umPeso: 'kg',
    }
  }

  return prodotto
}

export function prodottoToProductPayload(
  prodotto: Prodotto,
  categories: Category[],
): Omit<Product, 'id' | 'createdAt'> {
  const prices: Product['prices'] = {
    privati: prodotto.prezzi.find(p => p.listinoId === 'privati')?.valore ?? 0,
    aziende: prodotto.prezzi.find(p => p.listinoId === 'aziende')?.valore ?? 0,
    convenzionati: prodotto.prezzi.find(p => p.listinoId === 'convenzionati')?.valore ?? 0,
    vip: prodotto.prezzi.find(p => p.listinoId === 'vip')?.valore ?? 0,
  }

  let variants: string | undefined
  if (prodotto.tipologia === 'ArtLottiSeriali') variants = prodotto.lottiSeriali || 'lotti'
  if (prodotto.tipologia === 'ArtTaglieColori') variants = prodotto.variantiTagliaColore || 'taglie'

  const cat = categories.find(c => c.id === prodotto.categoryId)
  const sub = categories.find(c => c.id === prodotto.subcategoryId)
  const categoryName = cat
    ? sub
      ? `${cat.name} » ${sub.name}`
      : cat.name
    : prodotto.categoria

  return {
    studioId: prodotto.studioId,
    code: prodotto.codProdotto,
    name: prodotto.descrizione.slice(0, 80) || prodotto.codProdotto,
    description: prodotto.descrizione,
    categoryId: prodotto.categoryId || cat?.id || '',
    categoryName,
    subcategoryId: prodotto.subcategoryId || undefined,
    subcategoryName: prodotto.sottocategoria || sub?.name,
    brand: prodotto.dettagli.produttore,
    model: '',
    typology: tipologiaToProductTypology(prodotto.tipologia),
    unitOfMeasure: prodotto.um,
    prices,
    price: prices.privati,
    purchasePrice: prodotto.prezzoCosto || undefined,
    stock: prodotto.magazzino?.giacenza ?? 0,
    minStock: prodotto.magazzino?.scortaMinima,
    notes: prodotto.note || undefined,
    barcode: prodotto.dettagli.codBarre || undefined,
    variants,
    supplierName: prodotto.dettagli.fornitore || undefined,
    attachments: prodotto.allegati,
    imageUrl: prodotto.immagineUrl,
    weight: prodotto.dimensioni?.peso ? String(prodotto.dimensioni.peso) : undefined,
  }
}

export function emptyProdotto(studioId: string, code: string): Prodotto {
  return {
    id: `draft-${crypto.randomUUID()}`,
    studioId,
    isDraft: true,
    codProdotto: code,
    descrizione: '',
    tipologia: 'ArtMagazzino',
    categoria: '',
    sottocategoria: '',
    categoryId: '',
    subcategoryId: '',
    um: 'Kg',
    prezzi: defaultPrezziListini(),
    prezzoCosto: 0,
    note: '',
    dimensioni: {
      larghezza: 0,
      altezza: 0,
      profondita: 0,
      volume: 0,
      umDim: 'cm',
      peso: 0,
      pesoLordo: 0,
      umPeso: 'kg',
    },
    dettagli: {
      aliquotaIva: '22%',
      codBarre: '',
      fornitore: '',
      produttore: '',
      artAssemblato: false,
      mostraVenditaTouch: false,
      garanzia: '',
      richiesta: '',
      ubicazione: '',
      codProdFornitore: '',
      noteFornitura: '',
    },
    magazzino: {
      giacenza: 0,
      impegnata: 0,
      ordinata: 0,
      disponibile: 0,
      scortaMinima: 0,
      ubicazione: '',
      ordineMultiplo: 1,
      movimenti: [],
    },
  }
}

export function duplicateProdotto(p: Prodotto, newCode: string): Prodotto {
  return {
    ...structuredClone(p),
    id: `draft-${crypto.randomUUID()}`,
    isDraft: true,
    codProdotto: newCode,
    descrizione: p.descrizione ? `${p.descrizione} (copia)` : '',
    magazzino: p.magazzino
      ? { ...p.magazzino, giacenza: 0, impegnata: 0, ordinata: 0, disponibile: 0, movimenti: [] }
      : undefined,
  }
}
