/**
 * Audit automatico FIXLab — dati Firestore + login utente + integrità calcoli.
 *
 * Uso:
 *   node scripts/auditFixlab.mjs <serviceAccount.json>
 *   node scripts/auditFixlab.mjs <serviceAccount.json> testnegozio@gmail.com 123456@Sa
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'))
const { Firestore } = require(join(__dirname, '..', 'functions', 'node_modules', '@google-cloud', 'firestore'))

const PROJECT_ID = 'fixlab-app'
const DATABASE_ID = 'fixlab'
const FIREBASE_API_KEY = 'AIzaSyAaJw_-GeHaXjuSLhJs8EyjbLiv--mX_b0'

const DEFAULT_EMAIL = 'testnegozio@gmail.com'
const DEFAULT_PASSWORD = '123456@Sa'

const results = { pass: [], warn: [], fail: [] }

function pass(msg) {
  results.pass.push(msg)
  console.log(`  ✅ ${msg}`)
}
function warn(msg) {
  results.warn.push(msg)
  console.log(`  ⚠️  ${msg}`)
}
function fail(msg) {
  results.fail.push(msg)
  console.log(`  ❌ ${msg}`)
}

function calcDocumentRow(row) {
  const net = row.quantity * row.unitPrice * (1 - (row.discount || 0) / 100)
  const total = net * (1 + row.vatRate / 100)
  return { totalNet: Math.round(net * 100) / 100, total: Math.round(total * 100) / 100 }
}

function documentTotals(rows, shippingCost = 0, shippingVatRate = 22) {
  let netSum = 0
  let vatSum = 0
  for (const r of rows.filter(x => x.description)) {
    const row = calcDocumentRow(r)
    netSum += row.totalNet
    vatSum += row.total - row.totalNet
  }
  const shipNet = shippingCost || 0
  const shipVat = shipNet * (shippingVatRate / 100)
  netSum += shipNet
  vatSum += shipVat
  return {
    totalNet: Math.round(netSum * 100) / 100,
    totalVat: Math.round(vatSum * 100) / 100,
    totalDocument: Math.round((netSum + vatSum) * 100) / 100,
  }
}

async function signInWithPassword(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Login fallito')
  return data
}

async function timedQuery(label, fn) {
  const t0 = performance.now()
  const result = await fn()
  const ms = Math.round(performance.now() - t0)
  return { result, ms, label }
}

async function main() {
  const saPath = process.argv[2]
  const email = process.argv[3] || DEFAULT_EMAIL
  const password = process.argv[4] || DEFAULT_PASSWORD

  if (!saPath || !existsSync(saPath)) {
    console.error('Uso: node scripts/auditFixlab.mjs <serviceAccount.json> [email] [password]')
    process.exit(1)
  }

  console.log('\n═══ FIXLab Audit ═══\n')

  // ── 1. Login Firebase Auth ──
  console.log('1. Autenticazione')
  let authData
  try {
    authData = await signInWithPassword(email, password)
    pass(`Login OK: ${email} (uid: ${authData.localId})`)
  } catch (e) {
    fail(`Login fallito: ${e.message}`)
    process.exit(1)
  }

  const uid = authData.localId
  process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
  const sa = JSON.parse(readFileSync(saPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID })
  const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID })

  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) {
    fail(`Profilo users/${uid} mancante`)
    process.exit(1)
  }
  const studioId = userDoc.data()?.studioId
  if (!studioId) {
    fail('studioId mancante nel profilo')
    process.exit(1)
  }
  pass(`Profilo utente OK — studioId: ${studioId}`)

  if (userDoc.data()?.emailVerificationPending === true) {
    warn('emailVerificationPending=true — accesso app potrebbe essere bloccato')
  }

  const membershipId = `${uid}_${studioId}`
  const membership = await db.collection('memberships').doc(membershipId).get()
  if (membership.exists) pass(`Membership ${membershipId} presente`)
  else warn(`Membership ${membershipId} assente (legacy studioId=${uid}?`)

  // ── 2. Conteggi collezioni ──
  console.log('\n2. Conteggi dati tenant')
  const collections = ['categories', 'products', 'clients', 'suppliers', 'documents', 'repairs', 'payments', 'stockMovements']
  const counts = {}
  for (const col of collections) {
    const snap = await db.collection(col).where('studioId', '==', studioId).select().get()
    counts[col] = snap.size
    const min = col === 'products' ? 200 : col === 'clients' ? 100 : col === 'suppliers' ? 20 : col === 'documents' ? 50 : col === 'repairs' ? 30 : col === 'payments' ? 40 : col === 'stockMovements' ? 60 : 10
    if (snap.size >= min) pass(`${col}: ${snap.size} (≥ ${min})`)
    else if (snap.size > 0) warn(`${col}: ${snap.size} (attesi ≥ ${min})`)
    else fail(`${col}: 0 record`)
  }

  if (counts.products > 400) {
    warn(`Prodotti ${counts.products}: possibile doppio seed — valuta pulizia`)
  }

  // ── 3. Performance query ──
  console.log('\n3. Performance query Firestore')
  const perfTests = [
    ['products (100)', () => db.collection('products').where('studioId', '==', studioId).limit(100).get()],
    ['clients (100)', () => db.collection('clients').where('studioId', '==', studioId).limit(100).get()],
    ['documents (50)', () => db.collection('documents').where('studioId', '==', studioId).limit(50).get()],
    ['searchTokens prodotti', () =>
      db.collection('products').where('studioId', '==', studioId).where('searchTokens', 'array-contains', 'apple').limit(40).get(),
    ],
  ]
  for (const [label, fn] of perfTests) {
    const { ms, result } = await timedQuery(label, fn)
    if (ms < 1000) pass(`${label}: ${ms}ms (${result.size} doc)`)
    else if (ms < 3000) warn(`${label}: ${ms}ms (lento, >1s)`)
    else fail(`${label}: ${ms}ms (troppo lento, >3s)`)
  }

  // ── 4. Integrità prodotti ──
  console.log('\n4. Integrità prodotti')
  const productsSnap = await db.collection('products').where('studioId', '==', studioId).limit(500).get()
  let missingTokens = 0
  let missingCategory = 0
  let badPrices = 0
  for (const doc of productsSnap.docs) {
    const p = doc.data()
    if (!p.searchTokens?.length) missingTokens++
    if (!p.categoryId || !p.categoryName) missingCategory++
    if (typeof p.price !== 'number' || p.price < 0) badPrices++
  }
  if (missingTokens === 0) pass('Tutti i prodotti campionati hanno searchTokens')
  else warn(`${missingTokens}/${productsSnap.size} prodotti senza searchTokens — esegui Indicizza ricerca catalogo`)
  if (missingCategory === 0) pass('Categorie prodotto presenti')
  else warn(`${missingCategory} prodotti senza categoria`)
  if (badPrices === 0) pass('Prezzi prodotto validi')
  else fail(`${badPrices} prodotti con prezzo invalido`)

  // ── 5. Integrità clienti ──
  console.log('\n5. Integrità clienti')
  const clientsSnap = await db.collection('clients').where('studioId', '==', studioId).limit(200).get()
  let clientsNoCode = 0
  let clientsNoPhone = 0
  let clientsNoTokens = 0
  for (const doc of clientsSnap.docs) {
    const c = doc.data()
    if (!c.code) clientsNoCode++
    if (!c.phone) clientsNoPhone++
    if (!c.searchTokens?.length) clientsNoTokens++
  }
  if (clientsNoCode === 0) pass('Codici cliente presenti')
  else warn(`${clientsNoCode} clienti senza code`)
  if (clientsNoPhone === 0) pass('Telefono cliente presente')
  else warn(`${clientsNoPhone} clienti senza telefono`)
  if (clientsNoTokens === 0) pass('searchTokens clienti OK')
  else warn(`${clientsNoTokens} clienti senza searchTokens`)

  // ── 6. Calcoli documenti ──
  console.log('\n6. Calcoli documenti')
  const docsSnap = await db.collection('documents').where('studioId', '==', studioId).limit(100).get()
  let docCalcErrors = 0
  let docMissingFields = 0
  let linkedPairs = 0
  for (const doc of docsSnap.docs) {
    const d = doc.data()
    const rows = d.rows || []
    if (rows.length === 0) continue
    const expected = documentTotals(rows, d.shippingCost, d.shippingVatRate ?? 22)
    const tol = 0.02
    if (Math.abs((d.totalDocument || 0) - expected.totalDocument) > tol) docCalcErrors++
    if (Math.abs((d.totalNet || 0) - expected.totalNet) > tol) docCalcErrors++
    if (!d.subjectName) docMissingFields++
    if (d.linkedDocumentId) linkedPairs++
  }
  if (docCalcErrors === 0) pass(`${docsSnap.size} documenti — totali coerenti`)
  else fail(`${docCalcErrors} documenti con totali incoerenti`)
  if (docMissingFields === 0) pass('Soggetto documento sempre presente')
  else warn(`${docMissingFields} documenti senza subjectName`)
  if (linkedPairs > 0) pass(`${linkedPairs} documenti con linkedDocumentId`)
  else warn('Nessun documento collegato trovato')

  // ── 7. Riparazioni ──
  console.log('\n7. Riparazioni')
  const repairsSnap = await db.collection('repairs').where('studioId', '==', studioId).limit(50).get()
  let repairCalcErrors = 0
  let repairNoTicket = 0
  for (const doc of repairsSnap.docs) {
    const r = doc.data()
    if (!r.ticketNumber) repairNoTicket++
    const partsCost = (r.products || []).reduce((s, p) => s + (p.price || 0) * (p.qty || 1), 0)
    const expected = Math.round(((r.laborCost || 0) + partsCost) * 100) / 100
    if (Math.abs((r.totalCost || 0) - expected) > 0.02) repairCalcErrors++
  }
  if (repairCalcErrors === 0) pass(`${repairsSnap.size} riparazioni — totalCost coerente`)
  else fail(`${repairCalcErrors} riparazioni con totalCost errato`)
  if (repairNoTicket === 0) pass('Ticket number presenti')
  else warn(`${repairNoTicket} riparazioni senza ticketNumber`)

  // ── 8. Pagamenti ──
  console.log('\n8. Pagamenti')
  const paymentsSnap = await db.collection('payments').where('studioId', '==', studioId).limit(100).get()
  let paymentErrors = 0
  let settled = 0
  let unsettled = 0
  for (const doc of paymentsSnap.docs) {
    const p = doc.data()
    const hasIn = typeof p.amountIn === 'number' && p.amountIn > 0
    const hasOut = typeof p.amountOut === 'number' && p.amountOut > 0
    if (hasIn && hasOut) paymentErrors++
    if (!hasIn && !hasOut) paymentErrors++
    if (p.settled) settled++
    else unsettled++
  }
  if (paymentErrors === 0) pass(`${paymentsSnap.size} pagamenti — importi validi (entrata XOR uscita)`)
  else fail(`${paymentErrors} pagamenti con importi invalidi`)
  pass(`Pagamenti: ${settled} saldati, ${unsettled} da saldare`)

  // ── 9. Movimenti magazzino ──
  console.log('\n9. Movimenti magazzino')
  const movSnap = await db.collection('stockMovements').where('studioId', '==', studioId).limit(100).get()
  let movErrors = 0
  for (const doc of movSnap.docs) {
    const m = doc.data()
    if (!m.productId || !m.productCode) movErrors++
    if (m.type === 'load' && !m.loaded) movErrors++
    if (m.type === 'unload' && !m.unloaded) movErrors++
  }
  if (movErrors === 0) pass(`${movSnap.size} movimenti — struttura valida`)
  else fail(`${movErrors} movimenti con campi mancanti`)

  // ── 10. Categorie ──
  console.log('\n10. Categorie')
  const catSnap = await db.collection('categories').where('studioId', '==', studioId).get()
  const roots = catSnap.docs.filter(d => (d.data().level ?? 0) === 0)
  const subs = catSnap.docs.filter(d => (d.data().level ?? 0) > 0)
  if (roots.length >= 10) pass(`${roots.length} categorie root`)
  else warn(`Solo ${roots.length} categorie root`)
  if (subs.length >= 30) pass(`${subs.length} sottocategorie`)
  else warn(`Solo ${subs.length} sottocategorie`)

  // ── 11. Web app raggiungibile ──
  console.log('\n11. Web app')
  try {
    const t0 = performance.now()
    const res = await fetch('https://fixlab-app.web.app/')
    const html = await res.text()
    const ms = Math.round(performance.now() - t0)
    if (res.ok && html.includes('FIXLab')) pass(`Homepage OK (${ms}ms)`)
    else fail(`Homepage HTTP ${res.status}`)
    const verRes = await fetch('https://fixlab-app.web.app/version.json')
    const ver = await verRes.json()
    pass(`Versione deploy: ${ver.version}`)
  } catch (e) {
    fail(`Web app non raggiungibile: ${e.message}`)
  }

  // ── Riepilogo ──
  console.log('\n═══ RIEPILOGO ═══')
  console.log(`✅ Pass: ${results.pass.length}`)
  console.log(`⚠️  Warn: ${results.warn.length}`)
  console.log(`❌ Fail: ${results.fail.length}`)

  if (results.fail.length > 0) {
    console.log('\nFallimenti:')
    results.fail.forEach(f => console.log(`  - ${f}`))
    process.exit(1)
  }
  if (results.warn.length > 0) {
    console.log('\nAvvisi:')
    results.warn.forEach(w => console.log(`  - ${w}`))
  }
  console.log('\nAudit dati completato con successo.\n')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
