import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { assertStudioAccess } from './auth'
import { arubaSignIn, arubaUploadInvoice, type ArubaEnvironment } from './aruba/client'
import { decryptSecret, encryptSecret } from './aruba/crypto'
import { buildFatturaPaXml } from './aruba/fatturaPaXml'

const arubaSecretsKey = defineSecret('ARUBA_SECRETS_KEY')
const arubaCallables = { region: 'europe-west1' as const, secrets: [arubaSecretsKey] }

function secretsKeyValue(): string {
  return arubaSecretsKey.value()
}

const db = getFirestore('fixlab')

type StudioArubaConfig = {
  enabled?: boolean
  environment?: ArubaEnvironment
  username?: string
  hasPassword?: boolean
  regimeFiscale?: string
  lastTestAt?: FirebaseFirestore.Timestamp
  lastTestOk?: boolean
  lastTestMessage?: string
}

type DocRow = {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  vatNature?: string
}

type DocPayload = {
  studioId: string
  type: string
  status: string
  fullNumber: string
  date: string
  subjectType: string
  subjectId?: string
  subjectName: string
  subjectAddress?: string
  rows: DocRow[]
  totalNet: number
  totalVat: number
  totalDocument: number
  paymentMethod?: string
  bankIban?: string
  electronicInvoiceRef?: {
    tipo?: string
    numero?: string
    data?: string
    cig?: string
    cup?: string
    commessaConvenzione?: string
  }
  aruba?: {
    status?: string
    uploadFileName?: string
  }
}

const VALID_RIFERIMENTO_TIPI = new Set([
  'ordine_acquisto',
  'contratto',
  'convenzione',
  'ricezione',
  'fattura_collegata',
  'ddt',
])

function resolveRiferimentoDocumento(
  raw?: DocPayload['electronicInvoiceRef'],
): import('./aruba/fatturaPaXml').FatturaPaRiferimento | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const tipo = typeof raw.tipo === 'string' ? raw.tipo : ''
  if (!VALID_RIFERIMENTO_TIPI.has(tipo)) return undefined
  const numero = typeof raw.numero === 'string' ? raw.numero.trim() : ''
  const data = typeof raw.data === 'string' ? raw.data.trim() : ''
  const cig = typeof raw.cig === 'string' ? raw.cig.trim() : ''
  const cup = typeof raw.cup === 'string' ? raw.cup.trim() : ''
  const commessaConvenzione =
    typeof raw.commessaConvenzione === 'string' ? raw.commessaConvenzione.trim() : ''
  if (!numero && !data && !cig && !cup && !commessaConvenzione) return undefined
  return {
    tipo: tipo as import('./aruba/fatturaPaXml').FatturaPaRiferimentoTipo,
    numero,
    data,
    cig,
    cup,
    commessaConvenzione,
  }
}

function normalizeEnvironment(value: unknown): ArubaEnvironment {
  return value === 'production' ? 'production' : 'demo'
}

async function loadArubaPassword(studioId: string): Promise<string> {
  const snap = await db.collection('studioSecrets').doc(studioId).get()
  const encrypted = snap.data()?.arubaPasswordEncrypted
  if (typeof encrypted !== 'string' || !encrypted) {
    throw new HttpsError('failed-precondition', 'Password Aruba non configurata per questo studio.')
  }
  try {
    return decryptSecret(encrypted, secretsKeyValue())
  } catch {
    throw new HttpsError('internal', 'Impossibile decifrare le credenziali Aruba.')
  }
}

async function nextProgressivoInvio(studioId: string): Promise<string> {
  const ref = db.collection('arubaCounters').doc(studioId)
  const next = await db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const current = snap.exists ? Number(snap.data()?.progressivoInvio || 0) : 0
    const value = current + 1
    tx.set(ref, { progressivoInvio: value, studioId, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return value
  })
  return String(next).padStart(5, '0').slice(-10)
}

function paymentModeCode(method?: string): string | undefined {
  const m = (method || '').toLowerCase()
  if (m.includes('bonif')) return 'MP05'
  if (m.includes('contant') || m.includes('cassa')) return 'MP01'
  if (m.includes('carta') || m.includes('pos')) return 'MP08'
  if (m.includes('assegno')) return 'MP02'
  return undefined
}

function resolveCustomerDestination(client: Record<string, unknown>): { codiceDestinatario: string; pec?: string } {
  const destinationCode = typeof client.destinationCode === 'string' ? client.destinationCode.trim() : ''
  const pec = typeof client.pec === 'string' ? client.pec.trim() : ''
  if (destinationCode) return { codiceDestinatario: destinationCode.toUpperCase() }
  if (pec) return { codiceDestinatario: '0000000', pec }
  throw new HttpsError('failed-precondition', 'Cliente senza codice destinatario o PEC per la fattura elettronica.')
}

export const saveArubaCredentials = onCall(arubaCallables, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')

  const { studioId, username, password, environment, enabled, regimeFiscale } = request.data as {
    studioId?: string
    username?: string
    password?: string
    environment?: ArubaEnvironment
    enabled?: boolean
    regimeFiscale?: string
  }

  if (!studioId || !username?.trim()) {
    throw new HttpsError('invalid-argument', 'Studio e username Aruba obbligatori.')
  }

  await assertStudioAccess(request.auth.uid, studioId)

  const studioRef = db.collection('studios').doc(studioId)
  const studioSnap = await studioRef.get()
  if (!studioSnap.exists) throw new HttpsError('not-found', 'Studio non trovato.')

  const env = normalizeEnvironment(environment)
  const patch: StudioArubaConfig = {
    enabled: Boolean(enabled),
    environment: env,
    username: username.trim(),
    regimeFiscale: regimeFiscale?.trim() || 'RF01',
  }

  if (password?.trim()) {
    await db.collection('studioSecrets').doc(studioId).set(
      {
        arubaPasswordEncrypted: encryptSecret(password.trim(), secretsKeyValue()),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true },
    )
    patch.hasPassword = true
  } else {
    const secretSnap = await db.collection('studioSecrets').doc(studioId).get()
    patch.hasPassword = Boolean(secretSnap.data()?.arubaPasswordEncrypted)
    if (!patch.hasPassword) {
      throw new HttpsError('invalid-argument', 'Inserisci la password API Aruba.')
    }
  }

  patch.lastTestMessage = 'Credenziali salvate. Esegui un test connessione.'
  await studioRef.set(
    {
      aruba: {
        ...((studioSnap.data()?.aruba as StudioArubaConfig | undefined) ?? {}),
        ...patch,
        configuredAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  )

  return { ok: true, hasPassword: patch.hasPassword }
})

export const testArubaConnection = onCall(arubaCallables, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')

  const { studioId } = request.data as { studioId?: string }
  if (!studioId) throw new HttpsError('invalid-argument', 'Studio obbligatorio.')
  await assertStudioAccess(request.auth.uid, studioId)

  const studioSnap = await db.collection('studios').doc(studioId).get()
  if (!studioSnap.exists) throw new HttpsError('not-found', 'Studio non trovato.')

  const aruba = (studioSnap.data()?.aruba || {}) as StudioArubaConfig
  if (!aruba.username?.trim()) {
    throw new HttpsError('failed-precondition', 'Configura username Aruba nelle impostazioni.')
  }

  const password = await loadArubaPassword(studioId)
  const environment = normalizeEnvironment(aruba.environment)

  let ok = false
  let message = ''
  try {
    const auth = await arubaSignIn(environment, aruba.username.trim(), password)
    ok = Boolean(auth.accessToken)
    message = ok ? 'Connessione Aruba riuscita.' : 'Connessione non riuscita.'
  } catch (err) {
    ok = false
    message = err instanceof Error ? err.message : 'Connessione Aruba non riuscita.'
  }

  await studioSnap.ref.set(
    {
      aruba: {
        ...aruba,
        lastTestAt: FieldValue.serverTimestamp(),
        lastTestOk: ok,
        lastTestMessage: message,
      },
    },
    { merge: true },
  )

  if (!ok) throw new HttpsError('failed-precondition', message)
  return { ok, message, environment }
})

export const sendArubaInvoice = onCall(arubaCallables, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')

  const { studioId, documentId } = request.data as { studioId?: string; documentId?: string }
  if (!studioId || !documentId) {
    throw new HttpsError('invalid-argument', 'Studio e documento obbligatori.')
  }
  await assertStudioAccess(request.auth.uid, studioId)

  const studioSnap = await db.collection('studios').doc(studioId).get()
  if (!studioSnap.exists) throw new HttpsError('not-found', 'Studio non trovato.')
  const studio = studioSnap.data() || {}
  const aruba = (studio.aruba || {}) as StudioArubaConfig

  if (!aruba.enabled) {
    throw new HttpsError('failed-precondition', 'Fatturazione elettronica non abilitata nelle impostazioni.')
  }
  if (!aruba.username?.trim()) {
    throw new HttpsError('failed-precondition', 'Credenziali Aruba non configurate.')
  }

  const docRef = db.collection('documents').doc(documentId)
  const docSnap = await docRef.get()
  if (!docSnap.exists) throw new HttpsError('not-found', 'Documento non trovato.')

  const doc = { id: docSnap.id, ...docSnap.data() } as DocPayload & { id: string }
  if (doc.studioId !== studioId) throw new HttpsError('permission-denied', 'Documento di un altro studio.')
  if (doc.type !== 'fattura') {
    throw new HttpsError('failed-precondition', 'Solo le fatture possono essere inviate allo SDI.')
  }
  if (!['confirmed', 'sent', 'completed'].includes(doc.status)) {
    throw new HttpsError('failed-precondition', 'Conferma la fattura prima dell\'invio allo SDI.')
  }
  if (doc.aruba?.status === 'sent' && doc.aruba.uploadFileName) {
    throw new HttpsError('failed-precondition', 'Fattura già inviata ad Aruba.')
  }
  if (doc.subjectType !== 'client' || !doc.subjectId) {
    throw new HttpsError('failed-precondition', 'La fattura deve avere un cliente associato.')
  }

  const clientSnap = await db.collection('clients').doc(doc.subjectId).get()
  if (!clientSnap.exists) throw new HttpsError('not-found', 'Cliente non trovato.')
  const client = clientSnap.data() || {}
  const destination = resolveCustomerDestination(client)

  const progressivoInvio = await nextProgressivoInvio(studioId)

  let xml = ''
  try {
    xml = buildFatturaPaXml({
      progressivoInvio,
      numeroDocumento: doc.fullNumber || String(doc.rows.length),
      dataDocumento: doc.date,
      cedente: {
        denominazione: String(studio.name || 'Studio'),
        partitaIva: String(studio.vatNumber || ''),
        codiceFiscale: String(studio.fiscalCode || ''),
        indirizzo: String(studio.address || ''),
        cap: String(studio.cap || ''),
        comune: String(studio.city || ''),
        provincia: String(studio.province || ''),
        nazione: 'IT',
        regimeFiscale: aruba.regimeFiscale || 'RF01',
      },
      cessionario: {
        denominazione: String(client.name || doc.subjectName || 'Cliente'),
        partitaIva: typeof client.vatNumber === 'string' ? client.vatNumber : undefined,
        codiceFiscale: typeof client.fiscalCode === 'string' ? client.fiscalCode : undefined,
        indirizzo: String(client.address || doc.subjectAddress || ''),
        cap: String(client.cap || ''),
        comune: String(client.city || ''),
        provincia: String(client.province || ''),
        nazione: String(client.nation || 'IT'),
        codiceDestinatario: destination.codiceDestinatario,
        pec: destination.pec,
      },
      righe: (doc.rows || []).map((row, index) => ({
        numeroLinea: index + 1,
        descrizione: row.description || 'Riga documento',
        quantita: Number(row.quantity || 1),
        prezzoUnitario: Number(row.unitPrice || 0),
        aliquotaIva: Number(row.vatRate ?? 22),
        natura: row.vatNature,
      })),
      totaleImponibile: Number(doc.totalNet || 0),
      totaleImposta: Number(doc.totalVat || 0),
      totaleDocumento: Number(doc.totalDocument || 0),
      modalitaPagamento: paymentModeCode(doc.paymentMethod),
      iban: typeof doc.bankIban === 'string' ? doc.bankIban : typeof studio.bankIban === 'string' ? studio.bankIban : undefined,
      causale: `Fattura ${doc.fullNumber}`,
      riferimentoDocumento: resolveRiferimentoDocumento(doc.electronicInvoiceRef),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generazione XML non riuscita.'
    await docRef.set(
      {
        aruba: {
          status: 'error',
          errorMessage: message,
          updatedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    )
    throw new HttpsError('failed-precondition', message)
  }

  const password = await loadArubaPassword(studioId)
  const environment = normalizeEnvironment(aruba.environment)
  const auth = await arubaSignIn(environment, aruba.username.trim(), password)
  const upload = await arubaUploadInvoice(environment, auth.accessToken, xml)

  await docRef.set(
    {
      status: 'sent',
      aruba: {
        status: 'sent',
        environment,
        progressivoInvio,
        uploadFileName: upload.uploadFileName || null,
        sentAt: FieldValue.serverTimestamp(),
        sentBy: request.auth.uid,
        errorMessage: upload.errorDescription || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return {
    ok: true,
    uploadFileName: upload.uploadFileName,
    progressivoInvio,
    message: upload.errorDescription || 'Fattura trasmessa ad Aruba.',
  }
})
