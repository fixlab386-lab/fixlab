import type { ReactNode } from 'react'

export type FormFieldProps = {
  label: string
  children: ReactNode
  required?: boolean
  error?: string
  htmlFor?: string
  labelWidth?: number
}

export default function FormField({
  label,
  children,
  required = false,
  error,
  htmlFor,
  labelWidth = 120,
}: FormFieldProps) {
  return (
    <div
      className="gestionale-form-field"
      style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
    >
      <label
        className={`gestionale-form-field__label${required ? ' gestionale-form-field__label--required' : ''}`}
        htmlFor={htmlFor}
      >
        {label}
      </label>
      <div className="gestionale-form-field__control">{children}</div>
      {error ? <span className="gestionale-form-field__error">{error}</span> : null}
    </div>
  )
}
