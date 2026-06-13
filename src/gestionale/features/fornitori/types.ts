import type { Supplier } from '../../../types'

export interface Indirizzo {
  denominazione: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

export interface Contatti {
  telefono: string
  fax: string
  cellulare: string
  email: string
  internet: string
}

export interface FatturaElettronica {
  recapito: 'CodDest' | 'PEC'
  valore: string
  rifAmmin: string
}

export interface RapportiCommerciali {
  agente: string
  sconto: string
  listino: string
  pagamento: string
  bancaCC: string
  fido: string
  coordBancarie: string
  nsBanca: string
  incTrasporto: string
  porto: string
  aliquotaIva: string
  dichIntento: string
  dichIntentoData: string
  inviaDocEmail: boolean
  fatturaRitenuta: boolean
  mostraAvviso: string
  inserisciNota: string
}

export interface Varie {
  homePage: string
  loginWeb: string
  solvibilita: string
  tipologia: string
  libero3: string
  libero4: string
  libero5: string
  libero6: string
}

export interface ContattoExtra {
  label: string
  telefono: string
  cellulare: string
  email: string
}

/** Stessa struttura scheda FIXLab di Fornitori. */
export interface Fornitore {
  id: string
  codice: string
  isCliente: boolean
  isFornitore: boolean
  sedeOperativa: Indirizzo
  sedeLegale: Indirizzo | null
  sediAmmin: Indirizzo[]
  sediExtra: Indirizzo[]
  contattiExtra: ContattoExtra[]
  codFiscale: string
  partitaIva: string
  fatturaElettronica: FatturaElettronica
  contatti: Contatti
  rapportiCommerciali: RapportiCommerciali
  varie: Varie
  note: string
  isDraft?: boolean
}

export type SchedaTabId = 'anagrafica' | 'rapporti' | 'varie'

export type RaggruppaCriterio =
  | 'Nessuno'
  | 'Agente'
  | 'Cap'
  | 'Città'
  | 'Cod. destinatario'
  | 'Codice'
  | 'Comune'
  | 'Nazione'
  | 'Provincia'
  | 'Regione'
  | 'Sconto (%)'
  | 'Tipologia'
  | 'Pagamento'

export type ColonnaId =
  | 'cod'
  | 'denominazione'
  | 'indirizzo'
  | 'cap'
  | 'citta'
  | 'prov'
  | 'nazione'
  | 'codDestinatario'
  | 'partitaIva'
  | 'agente'
  | 'dichIntento'

export type ColumnFilter =
  | { kind: 'text'; selected: Set<string>; showEmpty: boolean; showAll: boolean; search: string }
  | { kind: 'piva'; mode: 'tutti' | 'personalizzato' | 'nonVuote' | 'vuote' }

export function emptyFornitore(studioCode = ''): Fornitore {
  return {
    id: `draft-${crypto.randomUUID()}`,
    codice: studioCode,
    isCliente: false,
    isFornitore: true,
    sedeOperativa: {
      denominazione: '',
      indirizzo: '',
      cap: '',
      citta: '',
      prov: '',
      nazione: 'Italia',
    },
    sedeLegale: null,
    sediAmmin: [],
    sediExtra: [],
    contattiExtra: [],
    codFiscale: '',
    partitaIva: '',
    fatturaElettronica: { recapito: 'CodDest', valore: '', rifAmmin: '' },
    contatti: { telefono: '', fax: '', cellulare: '', email: '', internet: '' },
    rapportiCommerciali: {
      agente: '(Nessuno)',
      sconto: '',
      listino: 'Privati',
      pagamento: '',
      bancaCC: '',
      fido: '',
      coordBancarie: '',
      nsBanca: '',
      incTrasporto: '',
      porto: '',
      aliquotaIva: '22%',
      dichIntento: '',
      dichIntentoData: '',
      inviaDocEmail: false,
      fatturaRitenuta: false,
      mostraAvviso: 'Sì',
      inserisciNota: '',
    },
    varie: {
      homePage: '',
      loginWeb: '',
      solvibilita: 'Buona',
      tipologia: '',
      libero3: '',
      libero4: '',
      libero5: '',
      libero6: '',
    },
    note: '',
    isDraft: true,
  }
}

export function supplierToFornitore(s: Supplier): Fornitore {
  const listinoMap: Record<string, string> = {
    privati: 'Privati',
    aziende: 'Aziende',
    convenzionati: 'Convenzionati',
    vip: 'VIP',
  }
  return {
    id: s.id,
    codice: s.code || '',
    isCliente: false,
    isFornitore: true,
    sedeOperativa: {
      denominazione: s.name,
      indirizzo: s.address || '',
      cap: s.cap || '',
      citta: s.city || '',
      prov: s.province || '',
      nazione: s.nation || 'Italia',
    },
    sedeLegale: s.extraData?.sedeLegale ? { ...s.extraData.sedeLegale } : null,
    sediAmmin: s.extraData?.sediAmmin ? [...s.extraData.sediAmmin] : [],
    sediExtra: s.extraData?.sediExtra ? [...s.extraData.sediExtra] : [],
    contattiExtra: s.extraData?.contattiExtra
      ? s.extraData.contattiExtra.map(x => ({
          label: x.label,
          telefono: x.telefono || '',
          cellulare: x.cellulare || '',
          email: x.email || '',
        }))
      : [],
    codFiscale: s.fiscalCode || '',
    partitaIva: s.vatNumber || '',
    fatturaElettronica: {
      recapito: s.pec ? 'PEC' : 'CodDest',
      valore: s.pec || s.destinationCode || '',
      rifAmmin: s.adminRef || '',
    },
    contatti: {
      telefono: s.phone || '',
      fax: s.fax || '',
      cellulare: s.cellPhone || '',
      email: s.email || '',
      internet: s.website || '',
    },
    rapportiCommerciali: {
      agente: s.agent || '(Nessuno)',
      sconto: s.discount || '',
      listino: listinoMap[s.priceList || 'privati'] || 'Privati',
      pagamento: s.paymentMethod || s.paymentTerms || '',
      bancaCC: s.bankAccount || s.bankIban || '',
      fido: '',
      coordBancarie: s.bankAccount || s.bankIban || '',
      nsBanca: s.bankName || '',
      incTrasporto: '',
      porto: '',
      aliquotaIva: '22%',
      dichIntento: '',
      dichIntentoData: '',
      inviaDocEmail: false,
      fatturaRitenuta: false,
      mostraAvviso: 'Sì',
      inserisciNota: '',
    },
    varie: {
      homePage: s.website || '',
      loginWeb: '',
      solvibilita: 'Buona',
      tipologia: '',
      libero3: '',
      libero4: '',
      libero5: '',
      libero6: '',
    },
    note: s.notes || '',
  }
}

export function fornitoreToSupplierPayload(
  fornitore: Fornitore,
  studioId: string,
): Omit<Supplier, 'id' | 'createdAt'> {
  const listinoRev: Record<string, Supplier['priceList']> = {
    Privati: 'privati',
    Aziende: 'aziende',
    Convenzionati: 'convenzionati',
    VIP: 'vip',
    Rivenditori: 'aziende',
  }

  return {
    studioId,
    code: fornitore.codice,
    name: fornitore.sedeOperativa.denominazione,
    phone: fornitore.contatti.telefono || undefined,
    cellPhone: fornitore.contatti.cellulare || undefined,
    fax: fornitore.contatti.fax || undefined,
    email: fornitore.contatti.email || undefined,
    pec: fornitore.fatturaElettronica.recapito === 'PEC' ? fornitore.fatturaElettronica.valore : undefined,
    vatNumber: fornitore.partitaIva || undefined,
    fiscalCode: fornitore.codFiscale || undefined,
    address: fornitore.sedeOperativa.indirizzo || undefined,
    city: fornitore.sedeOperativa.citta || undefined,
    province: fornitore.sedeOperativa.prov || undefined,
    cap: fornitore.sedeOperativa.cap || undefined,
    nation: fornitore.sedeOperativa.nazione || 'Italia',
    paymentMethod: fornitore.rapportiCommerciali.pagamento || undefined,
    paymentTerms: fornitore.rapportiCommerciali.pagamento || undefined,
    priceList: listinoRev[fornitore.rapportiCommerciali.listino] || 'privati',
    agent: fornitore.rapportiCommerciali.agente !== '(Nessuno)' ? fornitore.rapportiCommerciali.agente : undefined,
    discount: fornitore.rapportiCommerciali.sconto || undefined,
    bankAccount: fornitore.rapportiCommerciali.bancaCC || undefined,
    bankIban: fornitore.rapportiCommerciali.coordBancarie || undefined,
    bankName: fornitore.rapportiCommerciali.nsBanca || undefined,
    destinationCode:
      fornitore.fatturaElettronica.recapito === 'CodDest' ? fornitore.fatturaElettronica.valore : undefined,
    adminRef: fornitore.fatturaElettronica.rifAmmin || undefined,
    website: fornitore.contatti.internet || fornitore.varie.homePage || undefined,
    notes: fornitore.note || undefined,
    extraData: {
      ...(fornitore.sedeLegale ? { sedeLegale: fornitore.sedeLegale } : {}),
      ...(fornitore.sediAmmin.length ? { sediAmmin: fornitore.sediAmmin } : {}),
      ...(fornitore.sediExtra.length ? { sediExtra: fornitore.sediExtra } : {}),
      ...(fornitore.contattiExtra.length ? { contattiExtra: fornitore.contattiExtra } : {}),
    },
  }
}
