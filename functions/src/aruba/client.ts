export type ArubaEnvironment = 'demo' | 'production'

const ENDPOINTS: Record<ArubaEnvironment, { auth: string; api: string }> = {
  demo: {
    auth: 'https://demoauth.fatturazioneelettronica.aruba.it',
    api: 'https://demows.fatturazioneelettronica.aruba.it',
  },
  production: {
    auth: 'https://auth.fatturazioneelettronica.aruba.it',
    api: 'https://ws.fatturazioneelettronica.aruba.it',
  },
}

export function arubaEndpoints(environment: ArubaEnvironment) {
  return ENDPOINTS[environment]
}

export async function arubaSignIn(
  environment: ArubaEnvironment,
  username: string,
  password: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { auth } = arubaEndpoints(environment)
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
  })

  const res = await fetch(`${auth}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    const msg =
      (typeof data.error_description === 'string' && data.error_description) ||
      (typeof data.error === 'string' && data.error) ||
      text ||
      `Autenticazione Aruba fallita (${res.status}).`
    throw new Error(msg)
  }

  const accessToken = typeof data.access_token === 'string' ? data.access_token : ''
  if (!accessToken) throw new Error('Aruba non ha restituito un token di accesso.')

  return {
    accessToken,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
  }
}

export async function arubaUploadInvoice(
  environment: ArubaEnvironment,
  accessToken: string,
  xmlContent: string,
  signed = false,
): Promise<{ uploadFileName?: string; errorDescription?: string }> {
  const { api } = arubaEndpoints(environment)
  const path = signed ? '/services/invoice/uploadSigned' : '/services/invoice/upload'
  const dataFile = Buffer.from(xmlContent, 'utf8').toString('base64')

  const res = await fetch(`${api}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({
      dataFile,
      credential: '',
      domain: '',
      senderPIVA: '',
      skipExtraSchema: false,
    }),
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    const msg =
      (typeof data.errorDescription === 'string' && data.errorDescription) ||
      (typeof data.message === 'string' && data.message) ||
      text ||
      `Upload fattura Aruba fallito (${res.status}).`
    throw new Error(msg)
  }

  return {
    uploadFileName: typeof data.uploadFileName === 'string' ? data.uploadFileName : undefined,
    errorDescription: typeof data.errorDescription === 'string' ? data.errorDescription : undefined,
  }
}
