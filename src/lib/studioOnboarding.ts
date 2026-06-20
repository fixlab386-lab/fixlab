import type { Studio, StudioFeatures, StudioRepairType } from '../types'

export const DEFAULT_STUDIO_FEATURES: StudioFeatures = {
  warehouse: true,
  pos: true,
  whatsapp: false,
  rtPrinter: false,
}

export type StudioOnboardingSnapshot = {
  fiscalCode: string
  vatNumber: string
  name: string
  subtitle: string
  address: string
  cap: string
  city: string
  province: string
  phone: string
  cellPhone: string
  email: string
  logoUrl: string
  features: StudioFeatures
  repairType: StudioRepairType[]
}

export function studioDocToOnboardingForm(
  data: Record<string, unknown> | undefined,
  fallbackEmail = '',
): StudioOnboardingSnapshot {
  const features = (data?.features as StudioFeatures | undefined) ?? DEFAULT_STUDIO_FEATURES
  return {
    fiscalCode: String(data?.fiscalCode ?? ''),
    vatNumber: String(data?.vatNumber ?? ''),
    name: String(data?.name ?? ''),
    subtitle: String(data?.subtitle ?? ''),
    address: String(data?.address ?? ''),
    cap: String(data?.cap ?? ''),
    city: String(data?.city ?? ''),
    province: String(data?.province ?? ''),
    phone: String(data?.phone ?? ''),
    cellPhone: String(data?.cellPhone ?? ''),
    email: String(data?.email ?? fallbackEmail),
    logoUrl: String(data?.logoUrl ?? ''),
    features: { ...DEFAULT_STUDIO_FEATURES, ...features },
    repairType: Array.isArray(data?.repairType) ? (data.repairType as StudioRepairType[]) : [],
  }
}

/** True se il wizard deve apparire al login (non completato o dati base mancanti). */
export function shouldShowOnboardingWizard(data: Record<string, unknown> | undefined): boolean {
  if (!data) return true
  if (data.onboardingCompleted === true) return false
  const name = String(data.name ?? '').trim()
  if (!name) return true
  return data.onboardingCompleted !== true
}

export function onboardingFormToFirestorePatch(form: StudioOnboardingSnapshot, complete: boolean) {
  return {
    fiscalCode: form.fiscalCode.trim(),
    vatNumber: form.vatNumber.trim(),
    name: form.name.trim(),
    subtitle: form.subtitle.trim(),
    address: form.address.trim(),
    cap: form.cap.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
    phone: form.phone.trim(),
    cellPhone: form.cellPhone.trim(),
    email: form.email.trim(),
    logoUrl: form.logoUrl.trim(),
    features: form.features,
    repairType: form.repairType,
    ...(complete ? { onboardingCompleted: true } : {}),
  }
}
