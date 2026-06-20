import type { SoggettoRicercaResult } from '../../lib/ricercaSoggetto'

type SedeShape = {
  denominazione: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

type AnagraficaShape = {
  codFiscale: string
  partitaIva: string
  sedeOperativa: SedeShape
}

export function applySoggettoRicerca<T extends AnagraficaShape>(record: T, result: SoggettoRicercaResult): T {
  return {
    ...record,
    codFiscale: result.cf || record.codFiscale,
    partitaIva: result.piva || record.partitaIva,
    sedeOperativa: {
      ...record.sedeOperativa,
      denominazione: result.denominazione || record.sedeOperativa.denominazione,
      indirizzo: result.indirizzo || record.sedeOperativa.indirizzo,
      cap: result.cap || record.sedeOperativa.cap,
      citta: result.citta || record.sedeOperativa.citta,
      prov: result.prov || record.sedeOperativa.prov,
    },
  }
}
