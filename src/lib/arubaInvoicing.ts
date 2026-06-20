import { functions } from '../firebase'
import { callCallableWithAuth } from './cloudFunctions'

export type ArubaEnvironment = 'demo' | 'production'

export type StudioArubaPublicConfig = {
  enabled?: boolean
  environment?: ArubaEnvironment
  username?: string
  hasPassword?: boolean
  regimeFiscale?: string
  lastTestOk?: boolean
  lastTestMessage?: string
  configuredAt?: unknown
  lastTestAt?: unknown
}

export type SaveArubaCredentialsPayload = {
  studioId: string
  username: string
  password?: string
  environment: ArubaEnvironment
  enabled: boolean
  regimeFiscale?: string
}

export type SendArubaInvoiceResult = {
  ok: boolean
  uploadFileName?: string
  progressivoInvio?: string
  message?: string
}

export async function callSaveArubaCredentials(payload: SaveArubaCredentialsPayload): Promise<{ ok: boolean }> {
  return callCallableWithAuth<SaveArubaCredentialsPayload, { ok: boolean }>(
    functions,
    'saveArubaCredentials',
    payload,
  )
}

export async function callTestArubaConnection(studioId: string): Promise<{ ok: boolean; message: string }> {
  return callCallableWithAuth<{ studioId: string }, { ok: boolean; message: string }>(
    functions,
    'testArubaConnection',
    { studioId },
  )
}

export async function callSendArubaInvoice(studioId: string, documentId: string): Promise<SendArubaInvoiceResult> {
  return callCallableWithAuth<{ studioId: string; documentId: string }, SendArubaInvoiceResult>(
    functions,
    'sendArubaInvoice',
    { studioId, documentId },
  )
}

export function parseStudioArubaConfig(data: Record<string, unknown> | undefined): StudioArubaPublicConfig {
  const raw = data?.aruba
  if (!raw || typeof raw !== 'object') return {}
  const aruba = raw as Record<string, unknown>
  return {
    enabled: Boolean(aruba.enabled),
    environment: aruba.environment === 'production' ? 'production' : 'demo',
    username: typeof aruba.username === 'string' ? aruba.username : '',
    hasPassword: Boolean(aruba.hasPassword),
    regimeFiscale: typeof aruba.regimeFiscale === 'string' ? aruba.regimeFiscale : 'RF01',
    lastTestOk: typeof aruba.lastTestOk === 'boolean' ? aruba.lastTestOk : undefined,
    lastTestMessage: typeof aruba.lastTestMessage === 'string' ? aruba.lastTestMessage : undefined,
    configuredAt: aruba.configuredAt,
    lastTestAt: aruba.lastTestAt,
  }
}

export const ARUBA_REGIMI_FISCALI = [
  { id: 'RF01', label: 'RF01 — Ordinario' },
  { id: 'RF02', label: 'RF02 — Contribuenti minimi' },
  { id: 'RF04', label: 'RF04 — Agricoltura' },
  { id: 'RF19', label: 'RF19 — Forfettario' },
] as const
