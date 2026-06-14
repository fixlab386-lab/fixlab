import { useEffect, useReducer, useState, type ReactNode } from 'react'
import {
  addDaysToDate,
  calcCurrentValue,
  calcInteressi,
  calcReduce,
  daysBetweenDates,
  formatCalcNumber,
  formatDateIt,
  initialCalcState,
  loadCalcOptions,
  parseCalcNumber,
  saveCalcOptions,
  type CalcOptions,
} from '../easyfattCalcEngine'
import { WinButton, WinIconBtn, WinInput } from '../WinControls'

type TabId = 'calc' | 'date' | 'interessi' | 'opzioni'

type Props = {
  onClose: () => void
  onApply?: (value: number) => void
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'calc', label: 'Calc', icon: '🧮' },
  { id: 'date', label: 'Date', icon: '📅' },
  { id: 'interessi', label: 'Interessi', icon: '%' },
  { id: 'opzioni', label: 'Opzioni', icon: '⚙' },
]

function CalcKey({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" className={`vb-calc-key${className ? ` ${className}` : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export default function EasyfattCalcDialog({ onClose, onApply }: Props) {
  const [tab, setTab] = useState<TabId>('calc')
  const [options, setOptions] = useState<CalcOptions>(() => loadCalcOptions())
  const [calc, dispatchCalc] = useReducer(
    (state: ReturnType<typeof initialCalcState>, action: { type: string; payload?: string }) =>
      calcReduce(state, action.type, action.payload, options.decimals),
    undefined,
    initialCalcState,
  )
  const [showHelp, setShowHelp] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [dateA, setDateA] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateB, setDateB] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateDays, setDateDays] = useState('0')

  const [capitale, setCapitale] = useState('1000')
  const [tasso, setTasso] = useState('5')
  const [giorni, setGiorni] = useState('365')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const currentValue = calcCurrentValue(calc)
  const diffDays = daysBetweenDates(dateA, dateB)
  const datePlusDays = addDaysToDate(dateA, parseInt(dateDays, 10) || 0)
  const interessi = calcInteressi(parseCalcNumber(capitale), parseCalcNumber(tasso), parseInt(giorni, 10) || 0)

  const press = (type: string, payload?: string) => dispatchCalc({ type, payload })

  const copyValue = async () => {
    const text = String(currentValue)
    try {
      await navigator.clipboard.writeText(text)
      setToast('Copiato negli appunti.')
    } catch {
      setToast(formatCalcNumber(currentValue, options.decimals))
    }
  }

  const applyValue = () => {
    onApply?.(currentValue)
    void copyValue()
    setToast('Valore copiato — incollalo nel campo attivo.')
  }

  const saveOptions = (patch: Partial<CalcOptions>) => {
    const next = { ...options, ...patch }
    setOptions(next)
    saveCalcOptions(next)
    dispatchCalc({ type: 'clear' })
    setToast('Opzioni salvate.')
  }

  return (
    <div className="vb-dialog-overlay vb-calc-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vb-dialog vb-easyfatt-calc" role="dialog" aria-modal="true" aria-label="Easyfatt Calc">
        <div className="vb-easyfatt-calc__titlebar">
          <span>Easyfatt Calc</span>
          <button type="button" className="vb-icon-btn" title="Chiudi" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-easyfatt-calc__tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`vb-easyfatt-calc__tab${tab === t.id ? ' vb-easyfatt-calc__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="vb-easyfatt-calc__tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <WinIconBtn title="Aiuto" className="vb-easyfatt-calc__help" onClick={() => setShowHelp(true)}>
            ?
          </WinIconBtn>
        </div>

        {tab === 'calc' ? (
          <div className="vb-easyfatt-calc__body">
            <div className="vb-easyfatt-calc__main">
              <div className="vb-easyfatt-calc__sidebar">
                <WinIconBtn title="Nuovo / azzera" onClick={() => press('clear')}>
                  📄
                </WinIconBtn>
                <WinIconBtn title="Inserisci nel documento" onClick={applyValue}>
                  ↩
                </WinIconBtn>
                <WinIconBtn title="Copia" onClick={() => void copyValue()}>
                  📋
                </WinIconBtn>
                <WinIconBtn title="Suggerimenti" onClick={() => setShowHelp(true)}>
                  💡
                </WinIconBtn>
              </div>

              <div className="vb-easyfatt-calc__pad">
                <div className="vb-easyfatt-calc__display">
                  {calc.fresh && calc.display === '0'
                    ? formatCalcNumber(0, options.decimals)
                    : calc.display}
                </div>
                <div className="vb-easyfatt-calc__keys">
                  <CalcKey onClick={() => press('clear')}>C/CE</CalcKey>
                  <CalcKey onClick={() => press('digit', '7')}>7</CalcKey>
                  <CalcKey onClick={() => press('digit', '8')}>8</CalcKey>
                  <CalcKey onClick={() => press('digit', '9')}>9</CalcKey>
                  <CalcKey onClick={() => press('op', '/')}>÷</CalcKey>

                  <CalcKey onClick={() => press('sign')}>+/−</CalcKey>
                  <CalcKey onClick={() => press('digit', '4')}>4</CalcKey>
                  <CalcKey onClick={() => press('digit', '5')}>5</CalcKey>
                  <CalcKey onClick={() => press('digit', '6')}>6</CalcKey>
                  <CalcKey onClick={() => press('op', '*')}>×</CalcKey>

                  <CalcKey onClick={() => press('reciprocal')}>1/x</CalcKey>
                  <CalcKey onClick={() => press('digit', '1')}>1</CalcKey>
                  <CalcKey onClick={() => press('digit', '2')}>2</CalcKey>
                  <CalcKey onClick={() => press('digit', '3')}>3</CalcKey>
                  <CalcKey onClick={() => press('op', '-')}>−</CalcKey>

                  <CalcKey onClick={() => press('sqrt')}>√</CalcKey>
                  <CalcKey onClick={() => press('digit', '0')}>0</CalcKey>
                  <CalcKey onClick={() => press('digit', ',')}>,</CalcKey>
                  <CalcKey className="vb-calc-key--equals" onClick={() => press('equals')}>
                    =
                  </CalcKey>
                  <CalcKey onClick={() => press('op', '+')}>+</CalcKey>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'date' ? (
          <div className="vb-easyfatt-calc__body vb-easyfatt-calc__body--panel">
            <label className="vb-easyfatt-calc__field">
              Data iniziale
              <WinInput type="date" value={dateA} onChange={e => setDateA(e.target.value)} />
              <span className="vb-easyfatt-calc__hint">{formatDateIt(dateA)}</span>
            </label>
            <label className="vb-easyfatt-calc__field">
              Data finale
              <WinInput type="date" value={dateB} onChange={e => setDateB(e.target.value)} />
              <span className="vb-easyfatt-calc__hint">{formatDateIt(dateB)}</span>
            </label>
            <div className="vb-easyfatt-calc__result">
              Differenza: <strong>{diffDays ?? '—'}</strong> giorni
            </div>
            <hr className="vb-easyfatt-calc__sep" />
            <label className="vb-easyfatt-calc__field">
              Aggiungi giorni a data iniziale
              <WinInput value={dateDays} onChange={e => setDateDays(e.target.value)} />
            </label>
            <div className="vb-easyfatt-calc__result">
              Risultato: <strong>{datePlusDays ? formatDateIt(datePlusDays) : '—'}</strong>
            </div>
          </div>
        ) : null}

        {tab === 'interessi' ? (
          <div className="vb-easyfatt-calc__body vb-easyfatt-calc__body--panel">
            <label className="vb-easyfatt-calc__field">
              Capitale (€)
              <WinInput value={capitale} onChange={e => setCapitale(e.target.value)} />
            </label>
            <label className="vb-easyfatt-calc__field">
              Tasso % annuo
              <WinInput value={tasso} onChange={e => setTasso(e.target.value)} />
            </label>
            <label className="vb-easyfatt-calc__field">
              Giorni
              <WinInput value={giorni} onChange={e => setGiorni(e.target.value)} />
            </label>
            <div className="vb-easyfatt-calc__result">
              Interessi: <strong>€ {formatCalcNumber(interessi, options.decimals)}</strong>
            </div>
            <WinButton
              onClick={() => {
                dispatchCalc({
                  type: 'setValue',
                  payload: formatCalcNumber(interessi, options.decimals),
                })
                setTab('calc')
                setToast('Interessi trasferiti in Calc.')
              }}
            >
              Usa in Calc
            </WinButton>
          </div>
        ) : null}

        {tab === 'opzioni' ? (
          <div className="vb-easyfatt-calc__body vb-easyfatt-calc__body--panel">
            <label className="vb-easyfatt-calc__field">
              Cifre decimali
              <select
                className="vb-select"
                value={options.decimals}
                onChange={e => saveOptions({ decimals: parseInt(e.target.value, 10) })}
              >
                {[0, 2, 4, 6, 8].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <p className="vb-easyfatt-calc__hint">Le opzioni vengono memorizzate per le prossime sessioni.</p>
          </div>
        ) : null}

        {toast ? <div className="vb-easyfatt-calc__toast">{toast}</div> : null}
      </div>

      {showHelp ? (
        <div className="vb-dialog-overlay vb-calc-help-overlay" onClick={e => e.target === e.currentTarget && setShowHelp(false)}>
          <div className="vb-dialog vb-dialog--md">
            <div className="vb-dialog__titlebar">
              <span>Easyfatt Calc — Aiuto</span>
            </div>
            <div className="vb-dialog__body" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <p>
                <strong>Calc:</strong> calcolatrice con tastierino; ↩ copia il valore; 📋 copia negli appunti.
              </p>
              <p>
                <strong>Date:</strong> differenza tra due date e somma giorni a una data.
              </p>
              <p>
                <strong>Interessi:</strong> calcolo interessi semplici (capitale × tasso × giorni / 365).
              </p>
            </div>
            <div className="vb-dialog__footer">
              <WinButton onClick={() => setShowHelp(false)}>Chiudi</WinButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
