import {
  applicationOptionsToFirestore,
  loadApplicationOptions,
  syncAppOptionsFromFeatures,
  type ApplicationOptions,
} from './applicationOptions'
import { DEFAULT_STUDIO_FEATURES } from './studioOnboarding'
import type { StudioFeatures } from '../types'

/** Risolve le funzionalità attive dal documento studio (features + appOptions). */
export function resolveStudioFeatures(data: Record<string, unknown> | undefined): StudioFeatures {
  const base: StudioFeatures = {
    ...DEFAULT_STUDIO_FEATURES,
    ...((data?.features as Partial<StudioFeatures> | undefined) ?? {}),
  }
  if (!data?.appOptions) return base

  const appOptions = loadApplicationOptions(data)
  return {
    warehouse: appOptions.moduli.magazzinoGestione,
    pos: appOptions.moduli.venditaTouchscreen,
    whatsapp: appOptions.moduli.ecommerce,
    rtPrinter: appOptions.moduli.registratoreCassa,
  }
}

/** Patch Firestore allineata a onboarding + opzioni moduli. */
export function studioFeaturesToFirestorePatch(
  features: StudioFeatures,
  existingData?: Record<string, unknown>,
): { features: StudioFeatures; appOptions: ApplicationOptions } {
  const appOptions = syncAppOptionsFromFeatures(loadApplicationOptions(existingData), features)
  return { features, appOptions }
}

export function featuresToFirestoreFields(
  features: StudioFeatures,
  existingData?: Record<string, unknown>,
): Record<string, unknown> {
  const { features: synced, appOptions } = studioFeaturesToFirestorePatch(features, existingData)
  return {
    features: synced,
    ...applicationOptionsToFirestore(appOptions),
  }
}

export function isFeatureEnabled(features: StudioFeatures, key: keyof StudioFeatures): boolean {
  return Boolean(features[key])
}

/** Voci toolbar principale → funzionalità richiesta (null = sempre visibile). */
export const TOOLBAR_NAV_FEATURES: Record<string, keyof StudioFeatures | null> = {
  prodotti: 'warehouse',
  magazzino: 'warehouse',
}

/** Voci menu Nuovo → funzionalità richiesta. */
export const NEW_MENU_ITEM_FEATURES: Record<string, keyof StudioFeatures | null> = {
  prodotto: 'warehouse',
  vendita_banco: 'pos',
}

export function filterByStudioFeatures<T extends { id: string }>(
  items: T[],
  features: StudioFeatures,
  gateMap: Record<string, keyof StudioFeatures | null>,
): T[] {
  return items.filter(item => {
    const required = gateMap[item.id]
    return !required || isFeatureEnabled(features, required)
  })
}
