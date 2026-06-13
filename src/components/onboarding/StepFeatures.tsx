import type { StudioFeatures } from '../../types'
import { FEATURE_OPTIONS } from './constants'

type StepFeaturesProps = {
  features: StudioFeatures
  onChange: (features: StudioFeatures) => void
}

export default function StepFeatures({ features, onChange }: StepFeaturesProps) {
  return (
    <div className="gestionale-onboarding-check-list">
      {FEATURE_OPTIONS.map(opt => (
        <label key={opt.key} className="gestionale-onboarding-check">
          <input
            type="checkbox"
            checked={features[opt.key]}
            onChange={e => onChange({ ...features, [opt.key]: e.target.checked })}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}
