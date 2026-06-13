/**
 * Conteggio una-tantum (sola lettura): documenti tenant senza campo studioId.
 * Progetto: fixlab-app | Database Firestore: fixlab
 *
 * Esegui dalla root:
 *   node scripts/count-missing-studioId.mjs
 *   node scripts/count-missing-studioId.mjs C:/path/to/serviceAccountKey.json
 *
 * Credenziali:
 *   - npx firebase login (account con accesso al progetto), oppure
 *   - GOOGLE_APPLICATION_CREDENTIALS (service account Admin SDK)
 */
import { createRequire } from 'module'
import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const functionsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'node_modules')
const ftRoot = join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools')

const PROJECT_ID = 'fixlab-app'
const DATABASE_ID = 'fixlab'
const PAGE_SIZE = 500
const MAX_SAMPLE_IDS = 15

const FIREBASE_CLI_OAUTH = {
  client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
  client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
}

const TENANT_COLLECTIONS = [
  'clients',
  'products',
  'repairs',
  'suppliers',
  'documents',
  'payments',
  'paymentResources',
  'stockMovements',
  'devices',
  'categories',
]

function loadFirebaseCliAccounts() {
  const configPaths = [
    join(homedir(), '.config', 'configstore', 'firebase-tools.json'),
    join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ]

  /** @type {{ label: string; refreshToken: string }[]} */
  const accounts = []

  for (const configPath of configPaths) {
    if (!existsSync(configPath)) continue
    try {
      const cfg = JSON.parse(readFileSync(configPath, 'utf8'))
      if (cfg?.tokens?.refresh_token) {
        accounts.push({
          label: cfg.user?.email || 'account principale',
          refreshToken: cfg.tokens.refresh_token,
        })
      }
      for (const extra of cfg.additionalAccounts || []) {
        if (extra?.tokens?.refresh_token) {
          accounts.push({
            label: extra.user?.email || 'account aggiuntivo',
            refreshToken: extra.tokens.refresh_token,
          })
        }
      }
      if (accounts.length > 0) return accounts
    } catch {
      // prova il path successivo
    }
  }
  return accounts
}

async function createRestClient() {
  const saPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (saPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
    console.log(`Credenziali: service account (${saPath})\n`)
    const { Firestore, FieldPath } = require(join(functionsDir, '@google-cloud', 'firestore'))
    const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID })
    return { mode: 'admin', db, FieldPath }
  }

  const accounts = loadFirebaseCliAccounts()
  if (accounts.length === 0) {
    throw new Error('Nessun account Firebase CLI. Esegui: npx firebase login')
  }

  const api = require(join(ftRoot, 'lib', 'api.js'))
  const apiv2 = require(join(ftRoot, 'lib', 'apiv2.js'))
  const scopes = require(join(ftRoot, 'lib', 'scopes.js'))
  api.setScopes([scopes.CLOUD_PLATFORM])

  for (const account of accounts) {
    apiv2.setRefreshToken(account.refreshToken)
    const client = new apiv2.Client({
      auth: true,
      apiVersion: 'v1',
      urlPrefix: api.firestoreOrigin(),
    })

    try {
      await client.get(`/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/clients`, {
        queryParams: { pageSize: 1 },
        headers: { 'x-goog-user-project': PROJECT_ID },
      })
      console.log(`Credenziali: Firebase CLI (${account.label}) via Firestore REST\n`)
      return { mode: 'rest', client }
    } catch (err) {
      if (err.status !== 403 && err.status !== 401) throw err
    }
  }

  throw new Error(
    'Nessun account Firebase CLI può leggere i documenti Firestore (manca IAM datastore.entities.list). ' +
      'Usa una chiave service account Admin SDK: node scripts/count-missing-studioId.mjs path/to/key.json'
  )
}

/**
 * @param {Record<string, { stringValue?: string; nullValue?: null }>} fields
 */
function classifyRestFields(fields) {
  if (!fields || !Object.prototype.hasOwnProperty.call(fields, 'studioId')) {
    return 'missing'
  }
  const value = fields.studioId
  if (!value || 'nullValue' in value) return 'empty'
  const str = value.stringValue ?? ''
  if (str === '') return 'empty'
  return 'ok'
}

/**
 * @param {import('@google-cloud/firestore').Firestore} db
 * @param {typeof import('@google-cloud/firestore').FieldPath} FieldPath
 * @param {string} collectionName
 */
async function scanCollectionAdmin(db, FieldPath, collectionName) {
  let total = 0
  let missing = 0
  let empty = 0
  const missingIds = []
  const emptyIds = []
  let lastDoc = null

  while (true) {
    let query = db.collection(collectionName).orderBy(FieldPath.documentId()).limit(PAGE_SIZE)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snapshot = await query.get()
    if (snapshot.empty) break

    for (const doc of snapshot.docs) {
      total++
      const data = doc.data()
      const kind = !Object.prototype.hasOwnProperty.call(data, 'studioId')
        ? 'missing'
        : data.studioId === null || data.studioId === undefined || data.studioId === ''
          ? 'empty'
          : 'ok'
      if (kind === 'missing') {
        missing++
        if (missingIds.length < MAX_SAMPLE_IDS) missingIds.push(doc.id)
      } else if (kind === 'empty') {
        empty++
        if (emptyIds.length < MAX_SAMPLE_IDS) emptyIds.push(doc.id)
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
    if (snapshot.size < PAGE_SIZE) break
  }

  return { collectionName, total, missing, empty, missingIds, emptyIds }
}

/**
 * @param {import('firebase-tools/lib/apiv2').Client} client
 * @param {string} collectionName
 */
async function scanCollectionRest(client, collectionName) {
  let total = 0
  let missing = 0
  let empty = 0
  const missingIds = []
  const emptyIds = []
  let pageToken = undefined

  const basePath = `/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collectionName}`

  while (true) {
    const queryParams = { pageSize: PAGE_SIZE }
    if (pageToken) queryParams.pageToken = pageToken

    const res = await client.get(basePath, {
      queryParams,
      headers: { 'x-goog-user-project': PROJECT_ID },
    })

    const documents = res.body.documents || []
    if (documents.length === 0 && !pageToken) break

    for (const doc of documents) {
      total++
      const id = doc.name.split('/').pop()
      const kind = classifyRestFields(doc.fields)
      if (kind === 'missing') {
        missing++
        if (missingIds.length < MAX_SAMPLE_IDS) missingIds.push(id)
      } else if (kind === 'empty') {
        empty++
        if (emptyIds.length < MAX_SAMPLE_IDS) emptyIds.push(id)
      }
    }

    pageToken = res.body.nextPageToken
    if (!pageToken) break
  }

  return { collectionName, total, missing, empty, missingIds, emptyIds }
}

function printResults(results) {
  console.log('\n' + '='.repeat(72))
  console.log('RISULTATI PER COLLEZIONE')
  console.log('='.repeat(72))

  let grandTotal = 0
  let grandMissing = 0
  let grandEmpty = 0

  for (const r of results) {
    grandTotal += r.total
    grandMissing += r.missing
    grandEmpty += r.empty

    const status =
      r.missing === 0 && r.empty === 0
        ? 'OK'
        : r.missing > 0
          ? 'ATTENZIONE (campo assente)'
          : 'NOTA (campo vuoto/null)'

    console.log(`\n${r.collectionName}`)
    console.log(`  Totale documenti:     ${r.total}`)
    console.log(`  Senza campo studioId: ${r.missing}`)
    console.log(`  studioId vuoto/null:  ${r.empty}`)
    console.log(`  Stato:                ${status}`)

    if (r.missing > 0) {
      const extra = r.missing > r.missingIds.length ? ` (+ altri ${r.missing - r.missingIds.length})` : ''
      console.log(`  Esempi ID (mancante): ${r.missingIds.join(', ')}${extra}`)
    }
    if (r.empty > 0) {
      const extra = r.empty > r.emptyIds.length ? ` (+ altri ${r.empty - r.emptyIds.length})` : ''
      console.log(`  Esempi ID (vuoto):    ${r.emptyIds.join(', ')}${extra}`)
    }
  }

  console.log('\n' + '='.repeat(72))
  console.log('RIEPILOGO')
  console.log('='.repeat(72))
  console.log(`Documenti totali scansionati: ${grandTotal}`)
  console.log(`Senza campo studioId:         ${grandMissing}`)
  console.log(`Con studioId vuoto/null:      ${grandEmpty}`)

  if (grandMissing > 0) {
    console.log('\n>>> Serve valutare uno script di migrazione PRIMA del deploy delle rules.')
    console.log('>>> Le rules Fase 2 richiedono studioId su create e per tenantDocAccessible in read/update/delete.')
  } else if (grandEmpty > 0) {
    console.log('\n>>> Nessun documento senza campo, ma alcuni hanno studioId vuoto/null: verificare anche quelli.')
  } else {
    console.log('\n>>> Nessun documento problematico trovato: deploy rules sicuro dal punto di vista studioId.')
  }
}

async function main() {
  const client = await createRestClient()

  console.log(`Progetto: ${PROJECT_ID}`)
  console.log(`Database: ${DATABASE_ID}`)
  console.log(`Collezioni: ${TENANT_COLLECTIONS.join(', ')}`)
  console.log('Modalità: sola lettura (nessuna modifica)\n')

  const results = []

  for (const name of TENANT_COLLECTIONS) {
    process.stdout.write(`Scansione ${name}... `)
    const result =
      client.mode === 'admin'
        ? await scanCollectionAdmin(client.db, client.FieldPath, name)
        : await scanCollectionRest(client.client, name)
    results.push(result)
    console.log(`ok (${result.total} documenti)`)
  }

  printResults(results)
}

main().catch((err) => {
  console.error('\nErrore:', err.message || err)
  if (err.status === 403 || err.code === 7 || /PERMISSION_DENIED|Could not load the default credentials|invalid_grant/i.test(String(err))) {
    console.error('\nAutenticazione / permessi insufficienti. Opzioni:')
    console.error('  1. npx firebase login  (account Owner/Editor su fixlab-app)')
    console.error('  2. Firebase Console → Impostazioni progetto → Account di servizio → Genera nuova chiave privata')
    console.error('     poi: set GOOGLE_APPLICATION_CREDENTIALS=<path-to-key.json>')
    console.error('  3. gcloud auth application-default login --project fixlab-app')
  }
  process.exit(1)
})
