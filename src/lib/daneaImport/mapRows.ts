import { emptyCliente } from '../../gestionale/features/clienti/types'
import { emptyFornitore } from '../../gestionale/features/fornitori/types'
import { emptyProdotto, defaultPrezziListini } from '../../gestionale/features/prodotti/types'
import type { Cliente } from '../../gestionale/features/clienti/types'
import type { Fornitore } from '../../gestionale/features/fornitori/types'
import type { Prodotto } from '../../gestionale/features/prodotti/types'
import type { ParsedSpreadsheet } from './types'
import { getCell, parseNumber } from './spreadsheet'

function pickCode(row: Record<string, string>, headers: string[], fallback: string): string {
  const raw = getCell(row, headers, ['cod.', 'cod', 'codice', 'cod anagr', 'cod. anagr'])
  return raw || fallback
}

export function mapRowToCliente(
  row: Record<string, string>,
  headers: string[],
  code: string,
): Cliente | null {
  const name = getCell(row, headers, ['denominazione', 'ragione sociale', 'nome', 'name'])
  if (!name) return null

  const draft = emptyCliente(code)
  draft.sedeOperativa.denominazione = name
  draft.sedeOperativa.indirizzo = getCell(row, headers, ['indirizzo', 'via'])
  draft.sedeOperativa.cap = getCell(row, headers, ['cap', 'c.a.p.'])
  draft.sedeOperativa.citta = getCell(row, headers, ['città', 'citta', 'comune', 'city'])
  draft.sedeOperativa.prov = getCell(row, headers, ['prov.', 'prov', 'provincia'])
  draft.sedeOperativa.nazione = getCell(row, headers, ['nazione', 'country']) || 'Italia'
  draft.partitaIva = getCell(row, headers, ['partita iva', 'p.iva', 'piva', 'part. iva'])
  draft.codFiscale = getCell(row, headers, ['cod. fiscale', 'cod fiscale', 'codice fiscale', 'c.f.', 'cf'])
  draft.contatti.telefono = getCell(row, headers, ['telefono', 'tel', 'phone'])
  draft.contatti.cellulare = getCell(row, headers, ['cellulare', 'cell.', 'mobile'])
  draft.contatti.fax = getCell(row, headers, ['fax'])
  draft.contatti.email = getCell(row, headers, ['e-mail', 'email', 'mail'])
  draft.contatti.internet = getCell(row, headers, ['internet', 'sito', 'web'])
  draft.rapportiCommerciali.pagamento = getCell(row, headers, ['pagamento', 'modalita pagamento'])
  draft.rapportiCommerciali.agente = getCell(row, headers, ['agente']) || '(Nessuno)'
  draft.rapportiCommerciali.sconto = getCell(row, headers, ['sconto', 'sconti'])
  draft.note = getCell(row, headers, ['note'])
  draft.fatturaElettronica.valore = getCell(row, headers, ['cod. destinatario', 'cod destinatario', 'pec'])
  if (draft.fatturaElettronica.valore.includes('@')) {
    draft.fatturaElettronica.recapito = 'PEC'
  }
  return draft
}

export function mapRowToFornitore(
  row: Record<string, string>,
  headers: string[],
  code: string,
): Fornitore | null {
  const name = getCell(row, headers, ['denominazione', 'ragione sociale', 'nome', 'name'])
  if (!name) return null

  const draft = emptyFornitore(code)
  draft.sedeOperativa.denominazione = name
  draft.sedeOperativa.indirizzo = getCell(row, headers, ['indirizzo', 'via'])
  draft.sedeOperativa.cap = getCell(row, headers, ['cap'])
  draft.sedeOperativa.citta = getCell(row, headers, ['città', 'citta', 'comune'])
  draft.sedeOperativa.prov = getCell(row, headers, ['prov.', 'prov', 'provincia'])
  draft.sedeOperativa.nazione = getCell(row, headers, ['nazione']) || 'Italia'
  draft.partitaIva = getCell(row, headers, ['partita iva', 'p.iva', 'piva'])
  draft.codFiscale = getCell(row, headers, ['cod. fiscale', 'cod fiscale', 'codice fiscale', 'cf'])
  draft.contatti.telefono = getCell(row, headers, ['telefono', 'tel'])
  draft.contatti.cellulare = getCell(row, headers, ['cellulare', 'cell.'])
  draft.contatti.email = getCell(row, headers, ['e-mail', 'email', 'mail', 'pec'])
  draft.contatti.fax = getCell(row, headers, ['fax'])
  draft.contatti.internet = getCell(row, headers, ['internet', 'web'])
  draft.rapportiCommerciali.pagamento = getCell(row, headers, ['pagamento'])
  draft.note = getCell(row, headers, ['note'])
  return draft
}

export function mapRowToProdotto(
  row: Record<string, string>,
  headers: string[],
  studioId: string,
  code: string,
): Prodotto | null {
  const descrizione = getCell(row, headers, ['descrizione', 'desc.', 'nome articolo', 'articolo'])
  if (!descrizione) return null

  const draft = emptyProdotto(studioId, pickCode(row, headers, code))
  draft.descrizione = descrizione
  draft.codProdotto = pickCode(row, headers, code)

  const categoria = getCell(row, headers, ['categoria', 'cat.'])
  const sottocategoria = getCell(row, headers, ['sottocategoria', 'sottocat'])
  if (categoria && sottocategoria) {
    draft.categoryPath = `${categoria} » ${sottocategoria}`
    draft.categoria = categoria
    draft.sottocategoria = sottocategoria
  } else if (categoria) {
    draft.categoryPath = categoria
    draft.categoria = categoria
  }

  draft.um = getCell(row, headers, ['u.m.', 'um', 'unita di misura']) || 'pz'
  draft.dettagli.codBarre = getCell(row, headers, ['cod. a barre', 'cod a barre', 'barcode', 'ean'])
  draft.dettagli.produttore = getCell(row, headers, ['produttore', 'marca', 'brand'])
  draft.dettagli.fornitore = getCell(row, headers, ['fornitore'])
  draft.dettagli.ubicazione = getCell(row, headers, ['ubicazione'])
  draft.note = getCell(row, headers, ['note'])

  const prezzo = parseNumber(getCell(row, headers, ['prezzo', 'prezzo listino', 'listino 1', 'prezzo ivato', 'prezzo iva incl']))
  const costo = parseNumber(getCell(row, headers, ['prezzo costo', 'costo', 'acquisto']))
  const giacenza = parseNumber(getCell(row, headers, ['giacenza', 'qta', 'quantita', 'stock']))

  draft.prezzi = defaultPrezziListini().map(p =>
    p.listinoId === 'privati' ? { ...p, valore: prezzo } : p,
  )
  draft.prezzoCosto = costo
  draft.magazzino = {
    giacenza,
    impegnata: 0,
    ordinata: 0,
    disponibile: giacenza,
    scortaMinima: parseNumber(getCell(row, headers, ['scorta min', 'scorta minima'])),
    ubicazione: draft.dettagli.ubicazione,
    ordineMultiplo: 1,
    movimenti: [],
  }

  const tipologiaRaw = getCell(row, headers, ['tipologia', 'tipo']).toLowerCase()
  if (tipologiaRaw.includes('serviz')) draft.tipologia = 'Servizio'
  else if (tipologiaRaw.includes('gener')) draft.tipologia = 'Articolo'
  else draft.tipologia = 'ArtMagazzino'

  return draft
}

export function sampleLabelsFromSheet(
  parsed: ParsedSpreadsheet,
  entity: 'clients' | 'suppliers' | 'products',
  limit = 3,
): string[] {
  const labels: string[] = []
  for (const row of parsed.rows) {
    let label = ''
    if (entity === 'products') {
      label = getCell(row, parsed.headers, ['descrizione', 'desc.'])
    } else {
      label = getCell(row, parsed.headers, ['denominazione', 'ragione sociale', 'nome'])
    }
    if (label && !labels.includes(label)) labels.push(label)
    if (labels.length >= limit) break
  }
  return labels
}

export { pickCode }
