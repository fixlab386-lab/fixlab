import type { Client } from '../../../types'

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

export interface Cliente {
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
  /** Bozza non ancora salvata su Firestore */
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

export type ClientiSectionState = {
  criterioRaggruppamento: RaggruppaCriterio
  filtriColonna: Partial<Record<ColonnaId, ColumnFilter>>
  colonneVisibili: Record<ColonnaId, boolean>
  expandedGroups: Set<string>
  selectionMode: boolean
  selectedIds: Set<string>
}

export function emptyCliente(studioCode = ''): Cliente {
  return {
    id: `draft-${crypto.randomUUID()}`,
    codice: studioCode,
    isCliente: true,
    isFornitore: false,
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

export function clientToCliente(c: Client): Cliente {
  const isCliente = c.type === 'client' || c.type === 'both'
  const isFornitore = c.type === 'supplier' || c.type === 'both'
  const listinoMap: Record<string, string> = {
    privati: 'Privati',
    aziende: 'Aziende',
    convenzionati: 'Convenzionati',
    vip: 'VIP',
  }
  return {
    id: c.id,
    codice: c.code || '',
    isCliente,
    isFornitore,
    sedeOperativa: {
      denominazione: c.name,
      indirizzo: c.address || '',
      cap: c.cap || '',
      citta: c.city || '',
      prov: c.province || '',
      nazione: c.nation || 'Italia',
    },
    sedeLegale: c.extraData?.sedeLegale ? { ...c.extraData.sedeLegale } : null,
    sediAmmin: c.extraData?.sediAmmin ? [...c.extraData.sediAmmin] : [],
    sediExtra: c.extraData?.sediExtra ? [...c.extraData.sediExtra] : [],
    contattiExtra: c.extraData?.contattiExtra
      ? c.extraData.contattiExtra.map(x => ({
          label: x.label,
          telefono: x.telefono || '',
          cellulare: x.cellulare || '',
          email: x.email || '',
        }))
      : [],
    codFiscale: c.fiscalCode || '',
    partitaIva: c.vatNumber || '',
    fatturaElettronica: {
      recapito: c.pec ? 'PEC' : 'CodDest',
      valore: c.pec || c.destinationCode || '',
      rifAmmin: c.adminRef || '',
    },
    contatti: {
      telefono: c.phone || '',
      fax: c.fax || '',
      cellulare: c.cellPhone || '',
      email: c.email || '',
      internet: c.website || '',
    },
    rapportiCommerciali: {
      agente: c.agent || '(Nessuno)',
      sconto: c.discount || '',
      listino: listinoMap[c.priceList || 'privati'] || 'Privati',
      pagamento: c.paymentMethod || '',
      bancaCC: c.bankAccount || '',
      fido: '',
      coordBancarie: c.bankAccount || '',
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
      homePage: c.website || '',
      loginWeb: '',
      solvibilita: 'Buona',
      tipologia: '',
      libero3: '',
      libero4: '',
      libero5: '',
      libero6: '',
    },
    note: c.notes || '',
  }
}

export function clienteToClientPayload(cliente: Cliente, studioId: string): Omit<Client, 'id' | 'createdAt'> {
  const listinoRev: Record<string, Client['priceList']> = {
    Privati: 'privati',
    Aziende: 'aziende',
    Convenzionati: 'convenzionati',
    VIP: 'vip',
    Rivenditori: 'aziende',
  }
  let type: Client['type'] = 'client'
  if (cliente.isCliente && cliente.isFornitore) type = 'both'
  else if (cliente.isFornitore) type = 'supplier'

  return {
    studioId,
    code: cliente.codice,
    type,
    name: cliente.sedeOperativa.denominazione,
    phone: cliente.contatti.telefono,
    email: cliente.contatti.email || undefined,
    pec: cliente.fatturaElettronica.recapito === 'PEC' ? cliente.fatturaElettronica.valore : undefined,
    vatNumber: cliente.partitaIva || undefined,
    fiscalCode: cliente.codFiscale || undefined,
    address: cliente.sedeOperativa.indirizzo || undefined,
    city: cliente.sedeOperativa.citta || undefined,
    province: cliente.sedeOperativa.prov || undefined,
    cap: cliente.sedeOperativa.cap || undefined,
    nation: cliente.sedeOperativa.nazione || 'Italia',
    cellPhone: cliente.contatti.cellulare || undefined,
    fax: cliente.contatti.fax || undefined,
    priceList: listinoRev[cliente.rapportiCommerciali.listino] || 'privati',
    paymentMethod: cliente.rapportiCommerciali.pagamento || undefined,
    notes: cliente.note || undefined,
    totalSpent: 0,
    repairsCount: 0,
    ...(cliente.rapportiCommerciali.agente && cliente.rapportiCommerciali.agente !== '(Nessuno)'
      ? { agent: cliente.rapportiCommerciali.agente }
      : {}),
    ...(cliente.rapportiCommerciali.sconto ? { discount: cliente.rapportiCommerciali.sconto } : {}),
    ...(cliente.rapportiCommerciali.bancaCC ? { bankAccount: cliente.rapportiCommerciali.bancaCC } : {}),
    ...(cliente.fatturaElettronica.recapito === 'CodDest' && cliente.fatturaElettronica.valore
      ? { destinationCode: cliente.fatturaElettronica.valore }
      : {}),
    ...(cliente.fatturaElettronica.rifAmmin ? { adminRef: cliente.fatturaElettronica.rifAmmin } : {}),
    ...(cliente.contatti.internet ? { website: cliente.contatti.internet } : {}),
    extraData: {
      ...(cliente.sedeLegale ? { sedeLegale: cliente.sedeLegale } : {}),
      ...(cliente.sediAmmin.length ? { sediAmmin: cliente.sediAmmin } : {}),
      ...(cliente.sediExtra.length ? { sediExtra: cliente.sediExtra } : {}),
      ...(cliente.contattiExtra.length ? { contattiExtra: cliente.contattiExtra } : {}),
    },
  }
}
