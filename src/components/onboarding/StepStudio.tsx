import FormField from '../ui/FormField'
import type { StudioOnboardingSnapshot } from '../../lib/studioOnboarding'

type StepStudioProps = {
  form: StudioOnboardingSnapshot
  nameError?: string
  uploadingLogo: boolean
  onChange: (patch: Partial<StudioOnboardingSnapshot>) => void
  onLogoSelect: (file: File) => void
}

export default function StepStudio({
  form,
  nameError,
  uploadingLogo,
  onChange,
  onLogoSelect,
}: StepStudioProps) {
  return (
    <div className="gestionale-onboarding-form-stack">
      <div className="gestionale-onboarding-form-grid">
        <FormField label="Cod. Fiscale" htmlFor="ob-fiscalCode">
          <input
            id="ob-fiscalCode"
            className="gestionale-form-field__input"
            value={form.fiscalCode}
            onChange={e => onChange({ fiscalCode: e.target.value })}
          />
        </FormField>
        <FormField label="Part. IVA" htmlFor="ob-vatNumber">
          <input
            id="ob-vatNumber"
            className="gestionale-form-field__input"
            value={form.vatNumber}
            onChange={e => onChange({ vatNumber: e.target.value })}
          />
        </FormField>
      </div>

      <FormField label="Denominazione" htmlFor="ob-name" required error={nameError}>
        <input
          id="ob-name"
          className="gestionale-form-field__input"
          value={form.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Nome officina"
        />
      </FormField>

      <FormField label="Sottotitolo" htmlFor="ob-subtitle">
        <input
          id="ob-subtitle"
          className="gestionale-form-field__input"
          value={form.subtitle}
          onChange={e => onChange({ subtitle: e.target.value })}
          placeholder="Es. Riparazione smartphone e PC"
        />
      </FormField>

      <FormField label="Indirizzo" htmlFor="ob-address">
        <input
          id="ob-address"
          className="gestionale-form-field__input"
          value={form.address}
          onChange={e => onChange({ address: e.target.value })}
        />
      </FormField>

      <div className="gestionale-onboarding-form-grid">
        <FormField label="CAP" htmlFor="ob-cap" labelWidth={80}>
          <input
            id="ob-cap"
            className="gestionale-form-field__input"
            value={form.cap}
            onChange={e => onChange({ cap: e.target.value })}
          />
        </FormField>
        <FormField label="Città" htmlFor="ob-city" labelWidth={80}>
          <input
            id="ob-city"
            className="gestionale-form-field__input"
            value={form.city}
            onChange={e => onChange({ city: e.target.value })}
          />
        </FormField>
        <FormField label="Prov." htmlFor="ob-province" labelWidth={80}>
          <input
            id="ob-province"
            className="gestionale-form-field__input"
            value={form.province}
            onChange={e => onChange({ province: e.target.value.toUpperCase() })}
            maxLength={2}
          />
        </FormField>
      </div>

      <div className="gestionale-onboarding-form-grid">
        <FormField label="Tel." htmlFor="ob-phone">
          <input
            id="ob-phone"
            className="gestionale-form-field__input"
            type="tel"
            value={form.phone}
            onChange={e => onChange({ phone: e.target.value })}
          />
        </FormField>
        <FormField label="Cell./WhatsApp" htmlFor="ob-cellPhone">
          <input
            id="ob-cellPhone"
            className="gestionale-form-field__input"
            type="tel"
            value={form.cellPhone}
            onChange={e => onChange({ cellPhone: e.target.value })}
          />
        </FormField>
      </div>

      <FormField label="E-mail" htmlFor="ob-email">
        <input
          id="ob-email"
          className="gestionale-form-field__input"
          type="email"
          value={form.email}
          onChange={e => onChange({ email: e.target.value })}
        />
      </FormField>

      <FormField label="Logo" htmlFor="ob-logo">
        <div className="gestionale-onboarding-logo-row">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo officina" className="gestionale-onboarding-logo-preview" />
          ) : null}
          <label className="gestionale-tool-btn" style={{ cursor: uploadingLogo ? 'wait' : 'pointer' }}>
            {uploadingLogo ? 'Caricamento…' : form.logoUrl ? 'Cambia logo' : 'Carica logo'}
            <input
              id="ob-logo"
              type="file"
              accept="image/*"
              hidden
              disabled={uploadingLogo}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) onLogoSelect(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </FormField>
    </div>
  )
}
