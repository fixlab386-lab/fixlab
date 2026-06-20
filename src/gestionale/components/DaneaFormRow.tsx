import type { ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
  wideLabel?: boolean
  className?: string
}

export function DaneaFormRow({ label, children, wideLabel, className = '' }: Props) {
  return (
    <div className={`danea-form__row${wideLabel ? ' danea-form__row--wide-label' : ''}${className ? ` ${className}` : ''}`}>
      <span className="danea-form__label">{label}</span>
      <div className="danea-form__control">{children}</div>
    </div>
  )
}

export function DaneaFormGroupTitle({ children }: { children: ReactNode }) {
  return <div className="danea-form__group-title">{children}</div>
}

export function DaneaFormLinks({ children }: { children: ReactNode }) {
  return <div className="danea-form__links">{children}</div>
}
