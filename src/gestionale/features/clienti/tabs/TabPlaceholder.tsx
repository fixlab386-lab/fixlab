import type { Cliente } from '../types'

type Props = {
  cliente: Cliente
  field: 'fatturazione' | 'note' | 'emailInviate' | 'situazioneContabile'
  label: string
  disabled?: boolean
  onChange: (c: Cliente) => void
}

export default function TabPlaceholder({ cliente, field, label, disabled, onChange }: Props) {
  return (
    <div>
      <p className="clienti-section-title">{label}</p>
      <textarea
        className="clienti-textarea"
        rows={10}
        value={cliente[field]}
        disabled={disabled}
        onChange={e => onChange({ ...cliente, [field]: e.target.value })}
        placeholder={`Contenuto tab «${label}»…`}
      />
    </div>
  )
}
