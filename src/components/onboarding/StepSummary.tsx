import type { StudioOnboardingSnapshot } from '../../lib/studioOnboarding'
import { featureLabel, repairTypeLabel } from './constants'
import type { StudioFeatures } from '../../types'

type StepSummaryProps = {
  form: StudioOnboardingSnapshot
}

function activeFeatures(features: StudioFeatures): string[] {
  return (Object.keys(features) as (keyof StudioFeatures)[])
    .filter(key => features[key])
    .map(featureLabel)
}

export default function StepSummary({ form }: StepSummaryProps) {
  const enabled = activeFeatures(form.features)

  return (
    <div className="gestionale-onboarding-summary">
      <section className="gestionale-onboarding-summary__section">
        <h4>La tua officina</h4>
        <dl>
          <dt>Denominazione</dt>
          <dd>{form.name || '—'}</dd>
          {form.subtitle ? (
            <>
              <dt>Sottotitolo</dt>
              <dd>{form.subtitle}</dd>
            </>
          ) : null}
          {form.vatNumber ? (
            <>
              <dt>Part. IVA</dt>
              <dd>{form.vatNumber}</dd>
            </>
          ) : null}
          {form.fiscalCode ? (
            <>
              <dt>Cod. Fiscale</dt>
              <dd>{form.fiscalCode}</dd>
            </>
          ) : null}
          {form.address || form.city ? (
            <>
              <dt>Indirizzo</dt>
              <dd>
                {[form.address, form.cap, form.city, form.province].filter(Boolean).join(', ') || '—'}
              </dd>
            </>
          ) : null}
          {form.phone ? (
            <>
              <dt>Tel.</dt>
              <dd>{form.phone}</dd>
            </>
          ) : null}
          {form.cellPhone ? (
            <>
              <dt>Cell./WhatsApp</dt>
              <dd>{form.cellPhone}</dd>
            </>
          ) : null}
          {form.email ? (
            <>
              <dt>E-mail</dt>
              <dd>{form.email}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="gestionale-onboarding-summary__section">
        <h4>Funzionalità attive</h4>
        {enabled.length > 0 ? (
          <div className="gestionale-onboarding-summary__tags">
            {enabled.map(label => (
              <span key={label} className="gestionale-onboarding-summary__tag">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="gestionale-onboarding-hint" style={{ marginTop: 0 }}>
            Nessuna funzionalità selezionata.
          </p>
        )}
      </section>

      <section className="gestionale-onboarding-summary__section">
        <h4>Tipo riparazioni</h4>
        {form.repairType.length > 0 ? (
          <div className="gestionale-onboarding-summary__tags">
            {form.repairType.map(id => (
              <span key={id} className="gestionale-onboarding-summary__tag">
                {repairTypeLabel(id)}
              </span>
            ))}
          </div>
        ) : (
          <p className="gestionale-onboarding-hint" style={{ marginTop: 0 }}>
            Nessuna categoria selezionata.
          </p>
        )}
      </section>
    </div>
  )
}
