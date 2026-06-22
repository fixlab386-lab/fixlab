import { useCallback, useEffect, useRef, useState } from 'react'
import CapLookupPopup from '../../../components/anagrafica/assist/CapLookupPopup'
import { lookupByCap, type CapRecord } from '../../../lib/capLookup'

type Props = {
  cap: string
  citta: string
  prov: string
  disabled?: boolean
  onPatch: (patch: { cap?: string; citta?: string; prov?: string }) => void
}

export default function SedeCapFields({ cap, citta, prov, disabled, onPatch }: Props) {
  const [capOptions, setCapOptions] = useState<CapRecord[]>([])
  const [showCapPicker, setShowCapPicker] = useState(false)
  const [showCapDialog, setShowCapDialog] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const applyCap = useCallback(
    (record: CapRecord) => {
      onPatch({ cap: record.cap, citta: record.citta, prov: record.provincia })
      setCapOptions([])
      setShowCapPicker(false)
    },
    [onPatch],
  )

  const handleCapChange = useCallback(
    async (raw: string) => {
      const next = raw.replace(/\D/g, '').slice(0, 5)
      onPatch({ cap: next })
      setCapOptions([])
      setShowCapPicker(false)
      if (next.length === 5) {
        const matches = await lookupByCap(next)
        if (matches.length === 1) applyCap(matches[0])
        else if (matches.length > 1) {
          setCapOptions(matches)
          setShowCapPicker(true)
        }
      }
    },
    [onPatch, applyCap],
  )

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowCapPicker(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <>
      <div className="danea-form__row danea-form__row--loc">
        <span className="danea-form__label" aria-hidden="true">
          &nbsp;
        </span>
        <div className="danea-form__loc-grid">
          <div className="danea-form__loc-cell" ref={wrapRef}>
            <span className="danea-form__sublabel">CAP</span>
            <div className="danea-form__control">
              <input
                className="clienti-input"
                value={cap}
                disabled={disabled}
                maxLength={5}
                onChange={e => void handleCapChange(e.target.value)}
              />
              <button
                type="button"
                className="clienti-icon-btn"
                title="Ricerca CAP / Città / Provincia"
                disabled={disabled}
                onClick={() => setShowCapDialog(true)}
              >
                🔍
              </button>
            </div>
            {showCapPicker && capOptions.length > 1 ? (
              <div className="clienti-cap-picker">
                {capOptions.map(opt => (
                  <button
                    key={`${opt.cap}-${opt.citta}-${opt.provincia}`}
                    type="button"
                    className="clienti-cap-picker__item"
                    onClick={() => applyCap(opt)}
                  >
                    {opt.citta} ({opt.provincia})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="danea-form__loc-cell danea-form__loc-cell--city">
            <span className="danea-form__sublabel">Città</span>
            <input
              className="clienti-input"
              value={citta}
              disabled={disabled}
              onChange={e => onPatch({ citta: e.target.value })}
            />
          </div>
          <div className="danea-form__loc-cell danea-form__loc-cell--prov">
            <span className="danea-form__sublabel">Prov.</span>
            <input
              className="clienti-input"
              maxLength={2}
              value={prov}
              disabled={disabled}
              onChange={e => onPatch({ prov: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
      </div>

      {showCapDialog ? (
        <CapLookupPopup
          initialCap={cap}
          initialCitta={citta}
          initialProvincia={prov}
          onClose={() => setShowCapDialog(false)}
          onApply={applyCap}
        />
      ) : null}
    </>
  )
}
