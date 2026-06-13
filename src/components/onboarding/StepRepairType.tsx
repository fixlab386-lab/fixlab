import type { StudioRepairType } from '../../types'
import { REPAIR_TYPE_OPTIONS } from './constants'

type StepRepairTypeProps = {
  repairType: StudioRepairType[]
  onChange: (repairType: StudioRepairType[]) => void
}

export default function StepRepairType({ repairType, onChange }: StepRepairTypeProps) {
  const toggle = (id: StudioRepairType) => {
    if (repairType.includes(id)) {
      onChange(repairType.filter(r => r !== id))
    } else {
      onChange([...repairType, id])
    }
  }

  return (
    <>
      <div className="gestionale-onboarding-check-list">
        {REPAIR_TYPE_OPTIONS.map(opt => (
          <label key={opt.id} className="gestionale-onboarding-check">
            <input
              type="checkbox"
              checked={repairType.includes(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      <p className="gestionale-onboarding-hint">
        Useremo questa scelta per pre-impostare le categorie ricambi e i campi della scheda riparazione.
      </p>
    </>
  )
}
