import type { ColonnaId, RaggruppaCriterio, SchedaTabId, TipologiaProdotto } from './types'

export const SCHEDA_TABS: { id: SchedaTabId; label: string; requiresMagazzino?: boolean }[] = [
  { id: 'caratteristiche', label: 'Caratteristiche' },
  { id: 'dimensioni', label: 'Dimensioni e peso' },
  { id: 'dettagli', label: 'Dettagli' },
  { id: 'magazzino', label: 'Magazzino', requiresMagazzino: true },
]

export const TIPOLOGIE_PRODOTTO: TipologiaProdotto[] = [
  'Servizio',
  'Articolo',
  'ArtMagazzino',
  'ArtLottiSeriali',
  'ArtTaglieColori',
]

export const TIPOLOGIA_LABELS: Record<TipologiaProdotto, string> = {
  Servizio: 'Servizio',
  Articolo: 'Articolo',
  ArtMagazzino: 'Art. con magazzino',
  ArtLottiSeriali: 'Art. con lotti/seriali',
  ArtTaglieColori: 'Art. con taglie/colori',
}

export const RAGGRUPPA_CRITERI: RaggruppaCriterio[] = [
  'Nessuno',
  'Categoria',
  'CategoriaSottocategoria',
  'Um',
  'Fornitore',
  'Produttore',
  'Opzioni',
  'Giacenza',
  'Richiesta',
  'Nota',
]

export const RAGGRUPPA_LABELS: Record<RaggruppaCriterio, string> = {
  Nessuno: 'Nessuno',
  Categoria: 'Categoria',
  CategoriaSottocategoria: 'Categoria / Sottocategoria',
  Um: 'U.m.',
  Fornitore: 'Fornitore',
  Produttore: 'Produttore',
  Opzioni: 'Opzioni',
  Giacenza: 'Giacenza',
  Richiesta: 'Richiesta',
  Nota: 'Nota',
}

export const COLONNE_DEF: { id: ColonnaId; label: string; default: boolean }[] = [
  { id: 'cod', label: 'Cod.', default: true },
  { id: 'descrizione', label: 'Descrizione', default: true },
  { id: 'produttore', label: 'Produttore', default: true },
  { id: 'prezzo', label: 'Prezzo', default: true },
]

export const DEFAULT_COLONNE: Record<ColonnaId, boolean> = Object.fromEntries(
  COLONNE_DEF.map(c => [c.id, c.default]),
) as Record<ColonnaId, boolean>

export const LISTINI_GLOBALI = [
  { id: 'privati', label: 'Privati', ivatoDefault: true, attivo: true },
  { id: 'aziende', label: 'Aziende', ivatoDefault: true, attivo: true },
  { id: 'rivenditori', label: 'Rivenditori', ivatoDefault: false, attivo: true },
  { id: 'convenzionati', label: 'Convenzionati', ivatoDefault: true, attivo: true },
  { id: 'vip', label: 'Vip', ivatoDefault: true, attivo: true },
  { id: 'listino5', label: 'Listino 5', ivatoDefault: false, attivo: true },
  { id: 'listino6', label: 'Listino 6', ivatoDefault: false, attivo: true },
  { id: 'listino7', label: 'Listino 7', ivatoDefault: false, attivo: true },
  { id: 'listino8', label: 'Listino 8', ivatoDefault: false, attivo: true },
  { id: 'listino9', label: 'Listino 9', ivatoDefault: false, attivo: true },
] as const

/** Listini mostrati nel blocco principale tab Caratteristiche */
export const LISTINI_PRINCIPALI = ['privati', 'aziende', 'convenzionati'] as const

export const LISTINI_REGOLE_DEFAULT: Record<string, string> = {
  privati: '+30%',
  aziende: '+15%',
  rivenditori: '+0%',
  convenzionati: '+0%',
  vip: '+0%',
  listino5: '+0%',
  listino6: '+0%',
  listino7: '+0%',
  listino8: '+0%',
  listino9: '+0%',
}

export const UNITA_MISURA = ['Kg', 'pz', 'm', 'lt', 'ore', 'conf'] as const
export const UM_DIMENSIONI = ['cm', 'mm', 'm'] as const
export const UM_VOLUME = ['cdm', 'm³', 'l'] as const
export const UM_PESO = ['kg', 'g'] as const
export const ALIQUOTE_IVA = ['0%', '4%', '5%', '10%', '22%'] as const
export const GARANZIE = ['Nessuna', '6 mesi', '12 mesi', '24 mesi'] as const
export const RICHIESTE = ['Normale', 'Urgente', 'Su ordinazione'] as const

export const STAMPA_ITEMS = ['Scheda prodotto', 'Elenco'] as const
export const UTILITA_ITEMS = [
  'Esporta con Excel',
  'Esporta con OpenOffice/LibreOffice',
  'Importa con Excel',
  'Importa con OpenOffice/LibreOffice',
] as const

export const CERCA_VELOCE_CAMPI = [
  { id: 'codBarre' as const, label: 'Cerca cod. a barre' },
  { id: 'descrizione' as const, label: 'Cerca descrizione' },
  { id: 'codProduttore' as const, label: 'Cerca codice produttore' },
]

export const CERCA_VELOCE_MODI = [
  { id: 'cominciaCon' as const, label: 'Comincia con…' },
  { id: 'inizianoPer' as const, label: 'Voci che iniziano per…' },
  { id: 'contengono' as const, label: 'Voci che contengono…' },
]

/** Albero categorie esempio FIXLab (fallback se DB vuoto) */
export const SAMPLE_CATEGORY_TREE: Record<string, string[]> = {
  Accessori: ['Appendiabiti', 'Carrelli', 'Cestini/Portaborse', 'Specchi'],
  "Complementi d'arredo": ['Cassettiera', 'Mobile', 'Orologio', 'Poggiapiedi', 'Porta Depliants', 'Scala', 'Sgabello'],
  Mobili: ['Bancone', 'Carrello', 'Mobile', 'Scrivania', 'Sedia', 'Tavolo'],
}
