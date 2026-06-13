import type { StudioFeatures } from '../types'
import { DEFAULT_STUDIO_FEATURES, studioDocToOnboardingForm } from './studioOnboarding'

export const DEFAULT_WA_TEMPLATE = `Ciao {{nome}}! 👋

Il tuo *{{dispositivo}}* è pronto per il ritiro! 🎉

Puoi passare a ritirarlo durante i nostri orari di apertura.

Per info: {{telefono_negozio}}

_{{nome_negozio}}_`

export const DEFAULT_DISCLAIMER = `Ai sensi del D.Lgs. 196/2003 Vi informiamo che i Vs. dati saranno utilizzati esclusivamente per i fini connessi ai rapporti commerciali tra di noi in essere. Contributo CONAI assolto ove dovuto - Vi preghiamo di controllare i Vs. dati anagrafici, la P. IVA e il Cod. Fiscale. Non ci riteniamo responsabili di eventuali errori. Nell'eventualità in cui l'apparato, riparato o no, non sia ritirato entro 3 mesi, si autorizza il laboratorio alla demolizione o vendita del suddetto per il recupero delle spese gestionali.`

export type StudioSettingsForm = {
  shopName: string
  subtitle: string
  address: string
  city: string
  province: string
  cap: string
  phone: string
  cellPhone: string
  email: string
  website: string
  vatNumber: string
  fiscalCode: string
  logoUrl: string
  features: StudioFeatures
  rtModel: string
  rtIp: string
  warrantyText: string
  footerText: string
  disclaimer: string
  waTemplate: string
}

export function emptyStudioSettingsForm(fallbackEmail = ''): StudioSettingsForm {
  const base = studioDocToOnboardingForm(undefined, fallbackEmail)
  return {
    shopName: base.name,
    subtitle: base.subtitle,
    address: base.address,
    city: base.city,
    province: base.province,
    cap: base.cap,
    phone: base.phone,
    cellPhone: base.cellPhone,
    email: base.email,
    website: '',
    vatNumber: base.vatNumber,
    fiscalCode: base.fiscalCode,
    logoUrl: base.logoUrl,
    features: base.features,
    rtModel: '',
    rtIp: '',
    warrantyText: 'Garanzia 90 giorni sulla riparazione.',
    footerText: 'Grazie per aver scelto il nostro servizio!',
    disclaimer: DEFAULT_DISCLAIMER,
    waTemplate: DEFAULT_WA_TEMPLATE,
  }
}

export function studioDocToSettingsForm(
  data: Record<string, unknown> | undefined,
  fallbackEmail = '',
): StudioSettingsForm {
  const base = studioDocToOnboardingForm(data, fallbackEmail)
  return {
    shopName: base.name,
    subtitle: base.subtitle,
    address: base.address,
    city: base.city,
    province: base.province,
    cap: base.cap,
    phone: base.phone,
    cellPhone: base.cellPhone,
    email: base.email,
    website: String(data?.website ?? ''),
    vatNumber: base.vatNumber,
    fiscalCode: base.fiscalCode,
    logoUrl: base.logoUrl,
    features: base.features,
    rtModel: String(data?.rtModel ?? ''),
    rtIp: String(data?.rtIp ?? ''),
    warrantyText: String(data?.warrantyText ?? 'Garanzia 90 giorni sulla riparazione.'),
    footerText: String(data?.footerText ?? 'Grazie per aver scelto il nostro servizio!'),
    disclaimer: String(data?.disclaimer ?? DEFAULT_DISCLAIMER),
    waTemplate: String(data?.waTemplate ?? DEFAULT_WA_TEMPLATE),
  }
}

export function settingsFormToFirestorePatch(form: StudioSettingsForm) {
  return {
    name: form.shopName.trim(),
    subtitle: form.subtitle.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
    cap: form.cap.trim(),
    phone: form.phone.trim(),
    cellPhone: form.cellPhone.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    vatNumber: form.vatNumber.trim(),
    fiscalCode: form.fiscalCode.trim(),
    logoUrl: form.logoUrl.trim(),
    features: form.features,
    rtModel: form.rtModel.trim(),
    rtIp: form.rtIp.trim(),
    warrantyText: form.warrantyText.trim(),
    footerText: form.footerText.trim(),
    disclaimer: form.disclaimer.trim(),
    waTemplate: form.waTemplate.trim(),
  }
}
