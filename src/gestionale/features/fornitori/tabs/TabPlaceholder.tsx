import type { Fornitore } from '../types'

type Props = {
  fornitore: Fornitore
  field: 'fatturazione' | 'note' | 'emailInviate' | 'situazioneContabile'
  label: string
  disabled?: boolean
  onChange: (c: Fornitore) => void
}

export default function TabPlaceholder({ fornitore, field, label, disabled, onChange }: Props) {
  return (
    <div>
      <p className="clienti-section-title">{label}</p>
      <textarea
        className="clienti-textarea"
        rows={10}
        value={fornitore[field]}
        disabled={disabled}
        onChange={e => onChange({ ...fornitore, [field]: e.target.value })}
        placeholder={`Contenuto tab «${label}»…`}
      />
    </div>
  )
}
