import type { ReactNode } from 'react'

export function OpzioniHelp({ title }: { title: string }) {
  return (
    <button
      type="button"
      className="opzioni-help"
      title={title}
      onClick={() => alert(title)}
      aria-label="Aiuto"
    >
      (?)
    </button>
  )
}

export function OpzioniSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="opzioni-section">
      <h3 className="opzioni-section__label">{label}</h3>
      <div className="opzioni-section__body">{children}</div>
    </section>
  )
}

export function OpzioniCheckRow({
  label,
  checked,
  onChange,
  help,
  disabled,
  children,
}: {
  label: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  help?: string
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <div className="opzioni-check-row">
      <label className="opzioni-check-row__main">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
        <span>{label}</span>
        {help ? <OpzioniHelp title={help} /> : null}
      </label>
      {children ? <div className="opzioni-check-row__extra">{children}</div> : null}
    </div>
  )
}

export function OpzioniFieldRow({
  label,
  children,
  help,
}: {
  label: string
  children: ReactNode
  help?: string
}) {
  return (
    <div className="opzioni-field-row">
      <span className="opzioni-field-row__label">
        {label}
        {help ? <OpzioniHelp title={help} /> : null}
      </span>
      <div className="opzioni-field-row__control">{children}</div>
    </div>
  )
}

export function OpzioniNumberedFields({
  values,
  onChange,
}: {
  values: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="opzioni-numbered-fields">
      {values.map((v, i) => (
        <div key={i} className="opzioni-numbered-fields__row">
          <span className="opzioni-numbered-fields__num">{i + 1}</span>
          <input
            className="opzioni-input"
            value={v}
            onChange={e => {
              const next = [...values]
              next[i] = e.target.value
              onChange(next)
            }}
          />
        </div>
      ))}
    </div>
  )
}
