import type { ReactNode } from 'react'

export type PageHeaderBack = {
  onClick: () => void
  /** Etichetta per accessibilità (es. «Torna ai documenti») */
  label?: string
}

type Props = {
  title: string
  subtitle?: string
  /** Piccola etichetta sopra il titolo (es. sezione) */
  eyebrow?: string
  back?: PageHeaderBack
  actions?: ReactNode
}

/**
 * Intestazione uniforme per le pagine interne: titolo chiaro, breve guida testuale, azioni a destra.
 */
export default function PageHeader({ title, subtitle, eyebrow, back, actions }: Props) {
  return (
    <header className="fixlab-page-header">
      <div className="fixlab-page-header__text">
        {eyebrow ? <div className="fixlab-page-header__eyebrow">{eyebrow}</div> : null}
        {back ? (
          <div className="fixlab-page-header__title-row">
            <button type="button" className="fixlab-icon-btn" onClick={back.onClick} aria-label={back.label ?? 'Indietro'}>
              ←
            </button>
            <h1 className="fixlab-page-header__title">{title}</h1>
          </div>
        ) : (
          <h1 className="fixlab-page-header__title">{title}</h1>
        )}
        {subtitle ? <p className="fixlab-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="fixlab-page-header__actions">{actions}</div> : null}
    </header>
  )
}
