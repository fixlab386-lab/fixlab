import { forwardRef, type ReactNode } from 'react'

export const WinInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function WinInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} {...props} className={`vb-input${className ? ` ${className}` : ''}`} />
})

export const WinSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function WinSelect(
  { className, ...props },
  ref,
) {
  return <select ref={ref} {...props} className={`vb-select${className ? ` ${className}` : ''}`} />
})

export function WinTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`vb-textarea${className ? ` ${className}` : ''}`} />
}

export function WinButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`vb-btn${className ? ` ${className}` : ''}`}>
      {children}
    </button>
  )
}

export function WinField({
  label,
  htmlFor,
  children,
  className,
  action,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <div className={`vb-field${className ? ` ${className}` : ''}`}>
      <div className="vb-field__head">
        <label htmlFor={htmlFor} className="vb-field__label">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

export function WinIconBtn({
  title,
  children,
  onClick,
  disabled,
  className,
}: {
  title: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled} className={`vb-icon-btn${className ? ` ${className}` : ''}`}>
      {children}
    </button>
  )
}
