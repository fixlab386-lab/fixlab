import { WinSelect } from '../vendita-banco/WinControls'
import {
  documentNumerationOptions,
  documentYearFromNumerazione,
  resolveDocumentNumerazione,
} from '../documenti/utils'

type Props = {
  id?: string
  value: string
  date: string
  documentYear?: number
  disabled?: boolean
  className?: string
  onChange: (numerazione: string) => void
}

export default function NumerazioneSelect({
  id,
  value,
  date,
  documentYear,
  disabled,
  className,
  onChange,
}: Props) {
  const selected = resolveDocumentNumerazione(value, date, documentYear)
  const refYear = documentYearFromNumerazione(selected, date)
  const options = documentNumerationOptions(refYear)

  return (
    <WinSelect
      id={id}
      value={selected}
      disabled={disabled}
      className={className}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(year => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </WinSelect>
  )
}
