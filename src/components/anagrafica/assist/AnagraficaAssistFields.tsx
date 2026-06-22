import { useCallback, useEffect, useRef, useState } from 'react'
import { lookupByCap } from '../../../lib/capLookup'
import { validaCodiceFiscale } from '../../../lib/codiceFiscale'
import CodiceFiscalePopup from './CodiceFiscalePopup'
import CapLookupPopup from './CapLookupPopup'
import '../../../theme/gestionale-dialog.css'

export type AddressFieldsValue = {
  fiscalCode?: string
  cap?: string
  city?: string
  province?: string
}

type InputStyleProps = {
  inp?: React.CSSProperties
  lbl?: React.CSSProperties
}

type FiscalCodeAssistFieldProps = InputStyleProps & {
  value: string
  onChange: (fiscalCode: string) => void
  /** 'win' usa lo stile Windows/Danea (input squadrato, label fornita dal contenitore). */
  variant?: 'modern' | 'win'
}

export function FiscalCodeAssistField({ value, onChange, inp, lbl, variant = 'modern' }: FiscalCodeAssistFieldProps) {
  const isWin = variant === 'win'
  const [showCfPopup, setShowCfPopup] = useState(false)
  const [cfError, setCfError] = useState('')

  const legacyInp: React.CSSProperties = inp ?? {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
  const legacyLbl: React.CSSProperties = lbl ?? {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const handleCfBlur = useCallback(() => {
    const cf = value.trim()
    if (!cf) {
      setCfError('')
      return
    }
    setCfError(validaCodiceFiscale(cf) ? '' : 'Codice fiscale non valido')
  }, [value])

  return (
    <>
      <div>
        {isWin ? null : <div style={legacyLbl}>Cod. Fiscale</div>}
        <div className="gestionale-field-with-action">
          <input
            className={isWin ? 'vb-input gestionale-field-with-action__input' : undefined}
            style={isWin ? undefined : { ...legacyInp, flex: 1, minWidth: 0, width: 'auto' }}
            value={value}
            onChange={e => {
              onChange(e.target.value.toUpperCase())
              setCfError('')
            }}
            onBlur={handleCfBlur}
            maxLength={16}
          />
          <button
            type="button"
            className={isWin ? 'gestionale-field-action-btn gestionale-field-action-btn--win' : 'gestionale-field-action-btn'}
            title="Calcola codice fiscale"
            onClick={() => setShowCfPopup(true)}
          >
            🧮
          </button>
        </div>
        {cfError ? <div className="gestionale-field-error">{cfError}</div> : null}
      </div>
      {showCfPopup ? (
        <CodiceFiscalePopup
          onClose={() => setShowCfPopup(false)}
          onApply={cf => {
            onChange(cf)
            setCfError('')
          }}
        />
      ) : null}
    </>
  )
}

type AddressCapAssistFieldsProps = InputStyleProps & {
  value: Pick<AddressFieldsValue, 'cap' | 'city' | 'province'>
  onChange: (patch: Partial<Pick<AddressFieldsValue, 'cap' | 'city' | 'province'>>) => void
  /** 'win' usa lo stile Windows/Danea (input squadrati, label compatte). */
  variant?: 'modern' | 'win'
}

export function AddressCapAssistFields({ value, onChange, inp, lbl, variant = 'modern' }: AddressCapAssistFieldsProps) {
  const isWin = variant === 'win'
  const [showCapPopup, setShowCapPopup] = useState(false)
  const [capOptions, setCapOptions] = useState<{ cap: string; citta: string; provincia: string }[]>([])
  const [showCapPicker, setShowCapPicker] = useState(false)
  const capWrapRef = useRef<HTMLDivElement>(null)

  const legacyInp: React.CSSProperties = inp ?? {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
  const legacyLbl: React.CSSProperties = lbl ?? {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const applyCapRecord = useCallback(
    (record: { cap: string; citta: string; provincia: string }) => {
      onChange({ cap: record.cap, city: record.citta, province: record.provincia })
      setCapOptions([])
      setShowCapPicker(false)
    },
    [onChange],
  )

  const handleCapChange = useCallback(
    async (raw: string) => {
      const cap = raw.replace(/\D/g, '').slice(0, 5)
      onChange({ cap })
      setCapOptions([])
      setShowCapPicker(false)

      if (cap.length === 5) {
        const matches = await lookupByCap(cap)
        if (matches.length === 1) {
          applyCapRecord(matches[0])
        } else if (matches.length > 1) {
          setCapOptions(matches)
          setShowCapPicker(true)
        }
      }
    },
    [onChange, applyCapRecord],
  )

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (capWrapRef.current && !capWrapRef.current.contains(e.target as Node)) {
        setShowCapPicker(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const renderLabel = (text: string) =>
    isWin ? <label className="vb-field__label">{text}</label> : <div style={legacyLbl}>{text}</div>

  return (
    <>
      <div className="gestionale-loc-row">
        <div ref={capWrapRef} className="gestionale-loc-row__cell" style={{ position: 'relative' }}>
          {renderLabel('CAP')}
          <div className="gestionale-field-with-action">
            <input
              className={isWin ? 'vb-input gestionale-field-with-action__input' : undefined}
              style={isWin ? undefined : { ...legacyInp, flex: 1, minWidth: 0, width: 'auto' }}
              value={value.cap ?? ''}
              maxLength={5}
              onChange={e => void handleCapChange(e.target.value)}
            />
            <button
              type="button"
              className={isWin ? 'gestionale-field-action-btn gestionale-field-action-btn--win' : 'gestionale-field-action-btn'}
              title="Ricerca CAP / Città / Provincia"
              onClick={() => setShowCapPopup(true)}
            >
              🔍
            </button>
          </div>
          {showCapPicker && capOptions.length > 1 ? (
            <div className="gestionale-cap-picker">
              {capOptions.map(opt => (
                <button
                  key={`${opt.cap}-${opt.citta}-${opt.provincia}`}
                  type="button"
                  className="gestionale-cap-picker__item"
                  onClick={() => applyCapRecord(opt)}
                >
                  {opt.citta} ({opt.provincia})
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="gestionale-loc-row__cell gestionale-loc-row__cell--city">
          {renderLabel('Città')}
          <input
            className={isWin ? 'vb-input' : undefined}
            style={isWin ? undefined : { ...legacyInp, minWidth: 0, width: '100%' }}
            value={value.city ?? ''}
            onChange={e => onChange({ city: e.target.value })}
          />
        </div>
        <div className="gestionale-loc-row__cell gestionale-loc-row__cell--prov">
          {renderLabel('Prov.')}
          <input
            className={isWin ? 'vb-input' : undefined}
            style={isWin ? undefined : { ...legacyInp, minWidth: 0, width: '100%' }}
            value={value.province ?? ''}
            onChange={e => onChange({ province: e.target.value.toUpperCase() })}
            maxLength={2}
          />
        </div>
      </div>

      {showCapPopup ? (
        <CapLookupPopup
          initialCap={value.cap ?? ''}
          initialCitta={value.city ?? ''}
          initialProvincia={value.province ?? ''}
          onClose={() => setShowCapPopup(false)}
          onApply={applyCapRecord}
        />
      ) : null}
    </>
  )
}
