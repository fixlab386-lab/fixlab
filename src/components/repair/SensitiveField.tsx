import { useState } from 'react'
import FormField from '../ui/FormField'

type SensitiveFieldProps = {
  label: string
  htmlFor: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SensitiveField({
  label,
  htmlFor,
  value,
  onChange,
  placeholder,
}: SensitiveFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <FormField label={label} htmlFor={htmlFor}>
      <div className="gestionale-field-with-action">
        <input
          id={htmlFor}
          className="gestionale-form-field__input gestionale-field-with-action__input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          className="gestionale-field-action-btn"
          title={visible ? 'Nascondi' : 'Mostra'}
          onClick={() => setVisible(v => !v)}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </div>
    </FormField>
  )
}
