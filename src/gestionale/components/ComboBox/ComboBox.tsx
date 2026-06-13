interface ComboBoxProps {
  value: string
  options: readonly string[] | { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  id?: string
}

export default function ComboBox({ value, options, onChange, disabled, className = '', id }: ComboBoxProps) {
  return (
    <div className={`gestionale-combobox ${className}`.trim()}>
      <select
        id={id}
        className="gestionale-combobox__select"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => {
          const v = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return (
            <option key={v} value={v}>
              {label}
            </option>
          )
        })}
      </select>
      <span className="gestionale-combobox__arrow" aria-hidden="true">
        ▼
      </span>
    </div>
  )
}
