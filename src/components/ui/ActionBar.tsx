import type { ReactNode } from 'react'
import ToolButton, { type ToolButtonVariant } from './ToolButton'

export type ActionBarAction = {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  variant?: ToolButtonVariant
  onClick?: () => void
}

export type ActionBarProps = {
  count?: number
  countLabel?: string
  actions?: ActionBarAction[]
  left?: ReactNode
  right?: ReactNode
  className?: string
}

export default function ActionBar({
  count,
  countLabel = 'voci',
  actions = [],
  left,
  right,
  className = '',
}: ActionBarProps) {
  return (
    <footer className={`gestionale-action-bar${className ? ` ${className}` : ''}`}>
      <div className="gestionale-action-bar__left">
        {count != null ? (
          <span className="gestionale-action-bar__count">
            {count} {countLabel}
          </span>
        ) : null}
        {left}
      </div>

      <div className="gestionale-action-bar__actions">
        {actions.map(action => (
          <ToolButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            disabled={action.disabled}
            variant={action.variant}
            onClick={action.onClick}
          />
        ))}
      </div>

      {right ? <div className="gestionale-action-bar__left">{right}</div> : null}
    </footer>
  )
}
