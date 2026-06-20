import { useCallback, useRef, useState } from 'react'
import { lookupVatNumber, type VatLookupResult } from '../../../lib/vatLookup'

export type VatResolvedData = {
  name?: string
  address?: string
  cap?: string
  city?: string
  province?: string
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'valid'; name?: string }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string }

type Props = {
  value: string
  onChange: (value: string) => void
  /** Chiamato quando la P.IVA è valida: riempie i campi anagrafici disponibili. */
  onResolved: (data: VatResolvedData) => void
  disabled?: boolean
  id?: string
  /** Stili inline legacy (ClientFormModal). Se assenti, usa le classi gestionale. */
  inp?: React.CSSProperties
  /** Classe input personalizzata (es. "clienti-input"). Default: vb-input. */
  inputClassName?: string
  /** 'win' usa il pulsante di verifica in stile Windows/Danea (verde). */
  variant?: 'modern' | 'win'
}

export default function VatNumberAssistField({ value, onChange, onResolved, disabled, id, inp, inputClassName, variant = 'modern' }: Props) {
  const isWin = variant === 'win'
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const lastLookup = useRef<string>('')

  const runLookup = useCallback(async () => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
    if (cleaned.length < 8) {
      setStatus({ kind: 'idle' })
      return
    }
    if (status.kind === 'loading' && lastLookup.current === cleaned) return
    lastLookup.current = cleaned
    setStatus({ kind: 'loading' })
    try {
      const res: VatLookupResult = await lookupVatNumber(cleaned)
      if (!res.valid) {
        setStatus({ kind: 'notfound' })
        return
      }
      setStatus({ kind: 'valid', name: res.name })
      onResolved({
        name: res.name,
        address: res.address,
        cap: res.cap,
        city: res.city,
        province: res.province,
      })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Verifica non riuscita.' })
    }
  }, [value, status.kind, onResolved])

  const handleBlur = useCallback(() => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
    if (cleaned.length >= 8 && cleaned !== lastLookup.current) {
      void runLookup()
    }
  }, [value, runLookup])

  const legacyInput: React.CSSProperties | undefined = inp
    ? { ...inp, flex: 1, minWidth: 0, width: 'auto' }
    : undefined

  return (
    <>
      <div className="gestionale-field-with-action">
        <input
          id={id}
          className={inputClassName ?? (inp ? undefined : 'vb-input vb-input--flex')}
          style={legacyInput}
          value={value}
          disabled={disabled}
          placeholder="es. 12345678901"
          onChange={e => {
            onChange(e.target.value)
            if (status.kind !== 'idle') setStatus({ kind: 'idle' })
          }}
          onBlur={handleBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void runLookup()
            }
          }}
        />
        <button
          type="button"
          className={isWin ? 'gestionale-field-action-btn gestionale-field-action-btn--win' : 'gestionale-field-action-btn'}
          title="Verifica Partita IVA e compila i dati"
          disabled={disabled || status.kind === 'loading'}
          onClick={() => void runLookup()}
        >
          {status.kind === 'loading' ? '…' : '🔍'}
        </button>
      </div>
      {status.kind === 'loading' ? (
        <div className="gestionale-field-hint">Verifica P.IVA in corso…</div>
      ) : null}
      {status.kind === 'valid' ? (
        <div className="gestionale-field-ok">✓ P.IVA valida{status.name ? ` — ${status.name}` : ''}</div>
      ) : null}
      {status.kind === 'notfound' ? (
        <div className="gestionale-field-error">P.IVA non trovata nel registro VIES.</div>
      ) : null}
      {status.kind === 'error' ? <div className="gestionale-field-error">{status.message}</div> : null}
    </>
  )
}
