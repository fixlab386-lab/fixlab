/** Proprietà fattura elettronica documento — allineate a Danea Easyfatt / FatturaPA. */

export type FatturaElettronicaRiferimentoTipo =
  | ''
  | 'ordine_acquisto'
  | 'contratto'
  | 'convenzione'
  | 'ricezione'
  | 'fattura_collegata'
  | 'ddt'

export interface ProprietaFatturaElettronica {
  /** Riporta in fattura come */
  tipo: FatturaElettronicaRiferimentoTipo
  /** N. documento di riferimento */
  numero: string
  /** Data documento di riferimento (YYYY-MM-DD) */
  data: string
  cig: string
  cup: string
  /** Commessa / Convenz. */
  commessaConvenzione: string
}

export const PROPRIETA_FATTURA_ELETTR_VUOTA: ProprietaFatturaElettronica = {
  tipo: '',
  numero: '',
  data: '',
  cig: '',
  cup: '',
  commessaConvenzione: '',
}

export const RIFERIMENTO_FATTURA_ELETTR_OPTIONS: { value: FatturaElettronicaRiferimentoTipo; label: string }[] = [
  { value: '', label: '(Selezionare...)' },
  { value: 'ordine_acquisto', label: "Ordine d'acquisto" },
  { value: 'contratto', label: 'Contratto' },
  { value: 'convenzione', label: 'Convenzione' },
  { value: 'ricezione', label: 'Ricezione' },
  { value: 'fattura_collegata', label: 'Fattura collegata' },
  { value: 'ddt', label: 'Doc. di trasporto' },
]

export function proprietaFatturaElettrHaDati(p: ProprietaFatturaElettronica): boolean {
  return Boolean(
    p.tipo ||
      p.numero.trim() ||
      p.data ||
      p.cig.trim() ||
      p.cup.trim() ||
      p.commessaConvenzione.trim(),
  )
}

export function proprietaFatturaElettrPerFirestore(
  p: ProprietaFatturaElettronica,
): ProprietaFatturaElettronica | undefined {
  if (!proprietaFatturaElettrHaDati(p)) return undefined
  return {
    tipo: p.tipo,
    numero: p.numero.trim(),
    data: p.data,
    cig: p.cig.trim(),
    cup: p.cup.trim(),
    commessaConvenzione: p.commessaConvenzione.trim(),
  }
}

export function proprietaFatturaElettrDaFirestore(
  raw?: Partial<ProprietaFatturaElettronica> | null,
): ProprietaFatturaElettronica {
  if (!raw || typeof raw !== 'object') return { ...PROPRIETA_FATTURA_ELETTR_VUOTA }
  const tipo = raw.tipo
  const validTipi: FatturaElettronicaRiferimentoTipo[] = [
    '',
    'ordine_acquisto',
    'contratto',
    'convenzione',
    'ricezione',
    'fattura_collegata',
    'ddt',
  ]
  return {
    tipo: validTipi.includes(tipo as FatturaElettronicaRiferimentoTipo)
      ? (tipo as FatturaElettronicaRiferimentoTipo)
      : '',
    numero: typeof raw.numero === 'string' ? raw.numero : '',
    data: typeof raw.data === 'string' ? raw.data : '',
    cig: typeof raw.cig === 'string' ? raw.cig : '',
    cup: typeof raw.cup === 'string' ? raw.cup : '',
    commessaConvenzione: typeof raw.commessaConvenzione === 'string' ? raw.commessaConvenzione : '',
  }
}
