import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  onboardingFormToFirestorePatch,
  studioDocToOnboardingForm,
  type StudioOnboardingSnapshot,
} from '../../lib/studioOnboarding'
import { uploadStudioLogoFile } from '../../lib/studioLogo'
import { WIZARD_STEPS } from './constants'
import StepStudio from './StepStudio'
import StepFeatures from './StepFeatures'
import StepRepairType from './StepRepairType'
import StepSummary from './StepSummary'
import './onboarding.css'

type OnboardingWizardProps = {
  studioId: string
  studioData: Record<string, unknown> | undefined
  fallbackEmail?: string
  onSkip: () => void
  onComplete: () => void
}

export default function OnboardingWizard({
  studioId,
  studioData,
  fallbackEmail = '',
  onSkip,
  onComplete,
}: OnboardingWizardProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<StudioOnboardingSnapshot>(() =>
    studioDocToOnboardingForm(studioData, fallbackEmail),
  )
  const [nameError, setNameError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const patchForm = useCallback((patch: Partial<StudioOnboardingSnapshot>) => {
    setForm(prev => ({ ...prev, ...patch }))
    if (patch.name !== undefined && patch.name.trim()) setNameError('')
  }, [])

  const validateStep1 = (): boolean => {
    if (!form.name.trim()) {
      setNameError('La denominazione è obbligatoria.')
      return false
    }
    setNameError('')
    return true
  }

  const handleNext = () => {
    setSaveError('')
    if (step === 1 && !validateStep1()) return
    setStep(s => Math.min(s + 1, WIZARD_STEPS.length))
  }

  const handleBack = () => {
    setSaveError('')
    setStep(s => Math.max(s - 1, 1))
  }

  const handleLogoSelect = async (file: File) => {
    setUploadingLogo(true)
    setSaveError('')
    try {
      const url = await uploadStudioLogoFile(studioId, file)
      patchForm({ logoUrl: url })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore caricamento logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleComplete = async () => {
    if (!validateStep1()) {
      setStep(1)
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const patch = onboardingFormToFirestorePatch(form, true)
      await updateDoc(doc(db, 'studios', studioId), patch)
      onComplete()
      navigate('/')
    } catch {
      setSaveError('Errore durante il salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = WIZARD_STEPS[step - 1]

  return (
    <div className="gestionale-onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="gestionale-onboarding-card">
        <header className="gestionale-onboarding-card__header">
          <h1 id="onboarding-title" className="gestionale-onboarding-card__title">
            {currentStep.title}
          </h1>
          <div className="gestionale-onboarding-card__progress" aria-label={`Passo ${step} di ${WIZARD_STEPS.length}`}>
            {WIZARD_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`gestionale-onboarding-card__progress-dot${
                  i + 1 === step
                    ? ' gestionale-onboarding-card__progress-dot--active'
                    : i + 1 < step
                      ? ' gestionale-onboarding-card__progress-dot--done'
                      : ''
                }`}
              />
            ))}
          </div>
        </header>

        <div className="gestionale-onboarding-card__body">
          {saveError ? <div className="gestionale-onboarding-error-banner">{saveError}</div> : null}

          {step === 1 ? (
            <StepStudio
              form={form}
              nameError={nameError}
              uploadingLogo={uploadingLogo}
              onChange={patchForm}
              onLogoSelect={handleLogoSelect}
            />
          ) : null}
          {step === 2 ? <StepFeatures features={form.features} onChange={f => patchForm({ features: f })} /> : null}
          {step === 3 ? (
            <StepRepairType repairType={form.repairType} onChange={r => patchForm({ repairType: r })} />
          ) : null}
          {step === 4 ? <StepSummary form={form} /> : null}
        </div>

        <footer className="gestionale-onboarding-card__footer">
          <button type="button" className="gestionale-onboarding-card__skip" onClick={onSkip}>
            Salta per ora
          </button>

          {step > 1 ? (
            <button type="button" className="gestionale-onboarding-btn" onClick={handleBack} disabled={saving}>
              <span aria-hidden="true">←</span> Indietro
            </button>
          ) : null}

          {step < WIZARD_STEPS.length ? (
            <button type="button" className="gestionale-onboarding-btn gestionale-onboarding-btn--primary" onClick={handleNext}>
              Procedi <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="gestionale-onboarding-btn gestionale-onboarding-btn--primary"
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? 'Salvataggio…' : 'Completa configurazione'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
