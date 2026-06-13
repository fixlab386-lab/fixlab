import type { ReactNode, ButtonHTMLAttributes } from 'react'

export type ToolButtonVariant = 'default' | 'danger' | 'success'

export type ToolButtonProps = {
  label: string
  icon?: ReactNode
  active?: boolean
  variant?: ToolButtonVariant
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export default function ToolButton({
  label,
  icon,
  active = false,
  variant = 'default',
  className = '',
  type = 'button',
  ...rest
}: ToolButtonProps) {
  const classes = [
    'gestionale-tool-btn',
    active ? 'gestionale-tool-btn--active' : '',
    variant === 'danger' ? 'gestionale-tool-btn--danger' : '',
    variant === 'success' ? 'gestionale-tool-btn--success' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} title={rest.title ?? label} {...rest}>
      {icon ? <span className="gestionale-tool-btn__icon" aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </button>
  )
}
