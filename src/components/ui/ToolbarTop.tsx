import type { ReactNode } from 'react'

export type ToolbarTopItem = {
  id: string
  label: string
  icon: ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  title?: string
}

export type ToolbarTopProps = {
  items: ToolbarTopItem[]
  className?: string
  'aria-label'?: string
}

export default function ToolbarTop({
  items,
  className = '',
  'aria-label': ariaLabel = 'Barra strumenti',
}: ToolbarTopProps) {
  return (
    <nav className={`gestionale-toolbar${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={`gestionale-toolbar__item${item.active ? ' gestionale-toolbar__item--active' : ''}`}
          onClick={item.onClick}
          disabled={item.disabled}
          title={item.title ?? item.label}
          aria-pressed={item.active ?? false}
        >
          <span className="gestionale-toolbar__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="gestionale-toolbar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
