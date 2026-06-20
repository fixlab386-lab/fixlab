type Party = {
  denominazione: string
  partitaIva?: string
  codiceFiscale?: string
  indirizzo: string
  cap: string
  comune: string
  provincia: string
  nazione?: string
  regimeFiscale?: string
}

type Customer = Party & {
  codiceDestinatario: string
  pec?: string
}

type InvoiceLine = {
  numeroLinea: number
  descrizione: string
  quantita: number
  prezzoUnitario: number
  aliquotaIva: number
  natura?: string
}

export type FatturaPaRiferimentoTipo =
  | 'ordine_acquisto'
  | 'contratto'
  | 'convenzione'
  | 'ricezione'
  | 'fattura_collegata'
  | 'ddt'

export type FatturaPaRiferimento = {
  tipo: FatturaPaRiferimentoTipo
  numero?: string
  data?: string
  cig?: string
  cup?: string
  commessaConvenzione?: string
}

export type FatturaPaInput = {
  progressivoInvio: string
  numeroDocumento: string
  dataDocumento: string
  cedente: Party
  cessionario: Customer
  righe: InvoiceLine[]
  totaleImponibile: number
  totaleImposta: number
  totaleDocumento: number
  modalitaPagamento?: string
  iban?: string
  causale?: string
  riferimentoDocumento?: FatturaPaRiferimento
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function xmlOptional(tag: string, value?: string): string {
  const trimmed = value?.trim()
  return trimmed ? `<${tag}>${xmlEscape(trimmed)}</${tag}>` : ''
}

function buildRiferimentoDocumentoXml(ref: FatturaPaRiferimento): string {
  const idDocumento = ref.numero?.trim()
  const data = ref.data?.trim()
  const cig = ref.cig?.trim()
  const cup = ref.cup?.trim()
  const numItem = ref.commessaConvenzione?.trim()

  if (ref.tipo === 'ddt') {
    if (!idDocumento && !data) return ''
    return `<DatiDDT>
  ${xmlOptional('NumeroDDT', idDocumento)}
  ${xmlOptional('DataDDT', data)}
</DatiDDT>`
  }

  if (!idDocumento && !data && !cig && !cup && !numItem) return ''

  const common = `
  ${xmlOptional('IdDocumento', idDocumento)}
  ${xmlOptional('Data', data)}
  ${xmlOptional('NumItem', numItem)}
  ${xmlOptional('CodiceCIG', cig)}
  ${xmlOptional('CodiceCUP', cup)}`

  switch (ref.tipo) {
    case 'ordine_acquisto':
      return `<DatiOrdineAcquisto>${common}
</DatiOrdineAcquisto>`
    case 'contratto':
      return `<DatiContratto>${common}
</DatiContratto>`
    case 'convenzione':
      return `<DatiConvenzione>${common}
</DatiConvenzione>`
    case 'ricezione':
      return `<DatiRicezione>${common}
</DatiRicezione>`
    case 'fattura_collegata':
      return `<DatiFattureCollegate>
  ${xmlOptional('IdDocumento', idDocumento)}
  ${xmlOptional('Data', data)}
  ${xmlOptional('NumItem', numItem)}
</DatiFattureCollegate>`
    default:
      return ''
  }
}

function partyId(party: Party): string {
  const piva = party.partitaIva?.replace(/\D/g, '') || ''
  if (piva.length === 11) return `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${xmlEscape(piva)}</IdCodice></IdFiscaleIVA>`
  const cf = party.codiceFiscale?.trim() || ''
  if (cf) return `<CodiceFiscale>${xmlEscape(cf)}</CodiceFiscale>`
  return ''
}

function validateInput(input: FatturaPaInput): string[] {
  const errors: string[] = []
  if (!input.cedente.partitaIva?.trim()) errors.push('P.IVA emittente mancante nelle impostazioni azienda.')
  if (!input.cedente.denominazione.trim()) errors.push('Denominazione emittente mancante.')
  if (!input.cessionario.denominazione.trim()) errors.push('Denominazione cliente mancante.')
  if (!input.cessionario.codiceDestinatario.trim()) errors.push('Codice destinatario o PEC cliente mancante.')
  if (!input.righe.length) errors.push('La fattura non contiene righe.')
  if (!input.numeroDocumento.trim()) errors.push('Numero documento mancante.')
  return errors
}

export function buildFatturaPaXml(input: FatturaPaInput): string {
  const errors = validateInput(input)
  if (errors.length) throw new Error(errors.join(' '))

  const idTrasmittente = input.cedente.partitaIva!.replace(/\D/g, '').slice(0, 11)
  const codDest = input.cessionario.codiceDestinatario.trim().toUpperCase()
  const pecDest =
    codDest.length !== 7 && input.cessionario.pec?.trim()
      ? `<PECDestinatario>${xmlEscape(input.cessionario.pec.trim())}</PECDestinatario>`
      : ''

  const linee = input.righe
    .map(r => {
      const imponibile = Math.round(r.quantita * r.prezzoUnitario * 100) / 100
      const natura = r.natura ? `<Natura>${xmlEscape(r.natura)}</Natura>` : ''
      return `<DettaglioLinee>
  <NumeroLinea>${r.numeroLinea}</NumeroLinea>
  <Descrizione>${xmlEscape(r.descrizione.slice(0, 1000))}</Descrizione>
  <Quantita>${r.quantita.toFixed(2)}</Quantita>
  <PrezzoUnitario>${r.prezzoUnitario.toFixed(2)}</PrezzoUnitario>
  <PrezzoTotale>${imponibile.toFixed(2)}</PrezzoTotale>
  <AliquotaIVA>${r.aliquotaIva.toFixed(2)}</AliquotaIVA>
  ${natura}
</DettaglioLinee>`
    })
    .join('\n')

  const aliquota = input.righe[0]?.aliquotaIva ?? 22
  const pagamento =
    input.modalitaPagamento || input.iban
      ? `<DatiPagamento>
  <CondizioniPagamento>TP02</CondizioniPagamento>
  <DettaglioPagamento>
    <ModalitaPagamento>${xmlEscape(input.modalitaPagamento || 'MP05')}</ModalitaPagamento>
    ${input.iban ? `<IBAN>${xmlEscape(input.iban.replace(/\s/g, ''))}</IBAN>` : ''}
    <ImportoPagamento>${input.totaleDocumento.toFixed(2)}</ImportoPagamento>
  </DettaglioPagamento>
</DatiPagamento>`
      : ''

  const riferimentoXml = input.riferimentoDocumento
    ? buildRiferimentoDocumentoXml(input.riferimentoDocumento)
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
<FatturaElettronicaHeader>
  <DatiTrasmissione>
    <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>${xmlEscape(idTrasmittente)}</IdCodice></IdTrasmittente>
    <ProgressivoInvio>${xmlEscape(input.progressivoInvio)}</ProgressivoInvio>
    <FormatoTrasmissione>FPR12</FormatoTrasmissione>
    <CodiceDestinatario>${xmlEscape(codDest.padEnd(7, '0').slice(0, 7))}</CodiceDestinatario>
    ${pecDest}
  </DatiTrasmissione>
  <CedentePrestatore>
    <DatiAnagrafici>
      ${partyId(input.cedente)}
      <Anagrafica><Denominazione>${xmlEscape(input.cedente.denominazione.slice(0, 80))}</Denominazione></Anagrafica>
      <RegimeFiscale>${xmlEscape(input.cedente.regimeFiscale || 'RF01')}</RegimeFiscale>
    </DatiAnagrafici>
    <Sede>
      <Indirizzo>${xmlEscape(input.cedente.indirizzo.slice(0, 60) || '—')}</Indirizzo>
      <CAP>${xmlEscape((input.cedente.cap || '00000').replace(/\D/g, '').padStart(5, '0').slice(0, 5))}</CAP>
      <Comune>${xmlEscape(input.cedente.comune.slice(0, 60) || '—')}</Comune>
      <Provincia>${xmlEscape((input.cedente.provincia || 'XX').slice(0, 2).toUpperCase())}</Provincia>
      <Nazione>${xmlEscape(input.cedente.nazione || 'IT')}</Nazione>
    </Sede>
  </CedentePrestatore>
  <CessionarioCommittente>
    <DatiAnagrafici>
      ${partyId(input.cessionario)}
      <Anagrafica><Denominazione>${xmlEscape(input.cessionario.denominazione.slice(0, 80))}</Denominazione></Anagrafica>
    </DatiAnagrafici>
    <Sede>
      <Indirizzo>${xmlEscape(input.cessionario.indirizzo.slice(0, 60) || '—')}</Indirizzo>
      <CAP>${xmlEscape((input.cessionario.cap || '00000').replace(/\D/g, '').padStart(5, '0').slice(0, 5))}</CAP>
      <Comune>${xmlEscape(input.cessionario.comune.slice(0, 60) || '—')}</Comune>
      <Provincia>${xmlEscape((input.cessionario.provincia || 'XX').slice(0, 2).toUpperCase())}</Provincia>
      <Nazione>${xmlEscape(input.cessionario.nazione || 'IT')}</Nazione>
    </Sede>
  </CessionarioCommittente>
</FatturaElettronicaHeader>
<FatturaElettronicaBody>
  <DatiGenerali>
    <DatiGeneraliDocumento>
      <TipoDocumento>TD01</TipoDocumento>
      <Divisa>EUR</Divisa>
      <Data>${xmlEscape(input.dataDocumento)}</Data>
      <Numero>${xmlEscape(input.numeroDocumento)}</Numero>
      ${input.causale ? `<Causale>${xmlEscape(input.causale.slice(0, 200))}</Causale>` : ''}
    </DatiGeneraliDocumento>
    ${riferimentoXml}
  </DatiGenerali>
  <DatiBeniServizi>
    ${linee}
    <DatiRiepilogo>
      <AliquotaIVA>${aliquota.toFixed(2)}</AliquotaIVA>
      <ImponibileImporto>${input.totaleImponibile.toFixed(2)}</ImponibileImporto>
      <Imposta>${input.totaleImposta.toFixed(2)}</Imposta>
      <EsigibilitaIVA>I</EsigibilitaIVA>
    </DatiRiepilogo>
  </DatiBeniServizi>
  ${pagamento}
</FatturaElettronicaBody>
</p:FatturaElettronica>`
}
