/**
 * Popola Firestore (database fixlab) con dati di test massivi per stress-test FIXLab.
 * Eseguire UNA SOLA VOLTA per studio.
 *
 * Uso:
 *   npx tsx scripts/seedTestData.ts <serviceAccount.json>
 *   npx tsx scripts/seedTestData.ts <serviceAccount.json> testnegozio@gmail.com
 *   npx tsx scripts/seedTestData.ts <serviceAccount.json> testnegozio@gmail.com --dry-run
 *   npx tsx scripts/seedTestData.ts <serviceAccount.json> testnegozio@gmail.com --force
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomInt } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'))
const { Firestore, FieldValue } = require(join(__dirname, '..', 'functions', 'node_modules', '@google-cloud', 'firestore'))

const PROJECT_ID = 'fixlab-app'
const DATABASE_ID = 'fixlab'
const BATCH_LIMIT = 400

type PriceList = 'privati' | 'aziende' | 'convenzionati' | 'vip'

const CATEGORY_TREE = [
  { name: 'Ricambi telefono', emoji: '📱', subs: ['Vetri temperati', 'Display OLED', 'Connettori di ricarica', 'Altoparlanti', 'Fotocamere'] },
  { name: 'Cover e custodie', emoji: '🛡️', subs: ['Custodie silicone', 'Cover rigide', 'Flip cover', 'Bumper'] },
  { name: 'Accessori', emoji: '🎧', subs: ['Pellicole protettive', 'Supporti auto', 'Power bank', 'Adattatori'] },
  { name: 'Cavi e caricatori', emoji: '🔌', subs: ['USB-C', 'Lightning', 'Micro USB', 'Caricatori rapidi'] },
  { name: 'Batterie', emoji: '🔋', subs: ['Smartphone', 'Tablet', 'Power bank'] },
  { name: 'Display e LCD', emoji: '🖥️', subs: ['LCD', 'OLED', 'Incell', 'Originali'] },
  { name: 'Audio', emoji: '🔊', subs: ['Casse Bluetooth', 'Microfoni', 'Speaker ricambio', 'Cuffie'] },
  { name: 'Componenti PC', emoji: '💻', subs: ['RAM', 'SSD', 'Alimentatori', 'Schede video'] },
] as const

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google Pixel', 'Sony', 'OPPO', 'Motorola', 'Realme'] as const
const MODELS: Record<string, string[]> = {
  Apple: ['iPhone 16', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 13', 'iPad Air'],
  Samsung: ['Galaxy S24 Ultra', 'Galaxy S24', 'Galaxy S23', 'Galaxy A54', 'Galaxy A34', 'Galaxy Tab S9'],
  Xiaomi: ['Redmi Note 13 Pro', 'Redmi Note 12', 'Mi 13', 'POCO X6', 'Redmi Pad SE'],
  Huawei: ['P60 Pro', 'Nova 12', 'Mate 50', 'P50 Lite', 'MatePad 11'],
  OnePlus: ['12', '11', 'Nord 4', 'Nord CE 3', 'Pad Go'],
  'Google Pixel': ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel 7'],
  Sony: ['Xperia 1 V', 'Xperia 10 V', 'Xperia 5 V'],
  OPPO: ['Find X6', 'Reno 11', 'A78'],
  Motorola: ['Edge 40', 'Moto G84', 'Razr 40'],
  Realme: ['GT 5', '11 Pro', 'C55'],
}

const COLORS = ['Nero', 'Bianco', 'Blu', 'Verde', 'Rosa', 'Trasparente', 'Argento']

const ITALIAN_LOCATIONS = [
  { city: 'Milano', province: 'MI', cap: '20121' },
  { city: 'Roma', province: 'RM', cap: '00185' },
  { city: 'Torino', province: 'TO', cap: '10121' },
  { city: 'Napoli', province: 'NA', cap: '80132' },
  { city: 'Bologna', province: 'BO', cap: '40121' },
  { city: 'Firenze', province: 'FI', cap: '50122' },
  { city: 'Padova', province: 'PD', cap: '35139' },
  { city: 'Verona', province: 'VR', cap: '37121' },
  { city: 'Bari', province: 'BA', cap: '70121' },
  { city: 'Palermo', province: 'PA', cap: '90133' },
  { city: 'Genova', province: 'GE', cap: '16121' },
  { city: 'Modena', province: 'MO', cap: '41121' },
  { city: 'Parma', province: 'PR', cap: '43121' },
  { city: 'Reggio Emilia', province: 'RE', cap: '42121' },
  { city: 'Catania', province: 'CT', cap: '95124' },
  { city: 'Bergamo', province: 'BG', cap: '24121' },
  { city: 'Salerno', province: 'SA', cap: '84121' },
]

const SUPPLIER_NAMES = [
  'TechParts Italia Srl',
  'DisplayWorld Sas',
  'BatteryPro Srl',
  'iFixit Europe GmbH',
  'China Mobile Parts Co.',
  'Mobile Components Italia',
  'EuroDisplay Ricambi',
  'PhoneSupply Group',
  'Global Spare Parts',
  'Italia Ricambi Cellulari',
  'Accessori Phone Store',
  'Wholesale Mobile Srl',
  'Ricambi Express',
  'Componenti Digitali',
  'PhoneLab Forniture',
  'SmartParts Hub',
  'Cellular Trade Italia',
  'Display & Glass Srl',
  'PowerCell Distributore',
  'Cover Factory Italia',
  'Audio Mobile Parts',
  'Cavi & Connettori Pro',
  'Ricambi Digital Store',
  'SpareTech Distribution',
  'Phone Service Supply',
]

const FIRST_NAMES = ['Mario', 'Luigi', 'Giulia', 'Francesca', 'Marco', 'Alessandro', 'Sara', 'Luca', 'Elena', 'Andrea', 'Chiara', 'Davide', 'Valentina', 'Matteo', 'Federica']
const LAST_NAMES = ['Rossi', 'Bianchi', 'Verdi', 'Ferrari', 'Russo', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini']
const COMPANY_SUFFIX = ['Srl', 'Snc', 'Sas', 'Srls', 'Spa']

const REPAIR_STATUSES = ['waiting', 'accepted', 'in_progress', 'ready', 'completed', 'on_hold'] as const
const REPAIR_PRIORITIES = ['normal', 'urgent', 'express'] as const
const DEVICE_TYPES = ['smartphone', 'tablet', 'pc', 'console', 'smartwatch'] as const

const DOC_PLAN: { type: string; count: number; supplier?: boolean }[] = [
  { type: 'preventivo', count: 15 },
  { type: 'conferma_ordine', count: 10 },
  { type: 'ordine_cliente', count: 8 },
  { type: 'rapporto_intervento', count: 5 },
  { type: 'ddt', count: 10 },
  { type: 'vendita_banco', count: 15 },
  { type: 'fattura', count: 10 },
  { type: 'preventivo_fornitore', count: 3, supplier: true },
  { type: 'ordine_fornitore', count: 5, supplier: true },
  { type: 'arrivo_merce', count: 2, supplier: true },
  { type: 'reg_fattura_fornitore', count: 2, supplier: true },
]

const DOC_STATUSES = ['draft', 'confirmed', 'completed', 'cancelled', 'sent'] as const

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length)]!
}

function padCode(n: number, len = 4): string {
  return String(n).padStart(len, '0')
}

function randomVat(): string {
  return String(randomInt(10000000000, 99999999999))
}

function randomFiscal(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return `${pick(FIRST_NAMES).slice(0, 1)}${pick(LAST_NAMES).slice(0, 3)}${randomInt(80, 99)}${pick(['A', 'B', 'C', 'D', 'E', 'F', 'H', 'L', 'M', 'P', 'R', 'S', 'T'])}${randomInt(100, 999)}${letters[randomInt(0, 26)]}`
}

function randomIban(): string {
  return `IT${randomInt(10, 99)}X${randomInt(10000, 99999)}${randomInt(10000, 99999)}${randomInt(100000000000, 999999999999)}`
}

function randomPhone(): string {
  return `3${randomInt(10, 99)}${randomInt(1000000, 9999999)}`
}

function randomImei(): string {
  return Array.from({ length: 15 }, () => String(randomInt(0, 10))).join('')
}

function randomDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - randomInt(0, daysBack))
  return d.toISOString().slice(0, 10)
}

function extractTokens(...parts: (string | undefined | null)[]): string[] {
  const set = new Set<string>()
  for (const part of parts) {
    if (!part?.trim()) continue
    const normalized = part.trim().toLowerCase()
    set.add(normalized)
    for (const word of normalized.split(/[\s\-_/.,]+/).filter(w => w.length >= 2)) {
      set.add(word)
    }
  }
  return [...set].slice(0, 40)
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key]
  }
  return out
}

function calcRow(qty: number, unitPrice: number, discount = 0, vatRate = 22): { totalNet: number; total: number } {
  const totalNet = Math.round(qty * unitPrice * (1 - discount / 100) * 100) / 100
  const total = Math.round(totalNet * (1 + vatRate / 100) * 100) / 100
  return { totalNet, total }
}

async function commitBatches(db: Firestore, ops: Array<(batch: { set: (...args: unknown[]) => void; update: (...args: unknown[]) => void }) => void>): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch)
    await batch.commit()
  }
}

async function resolveStudioId(auth: admin.auth.Auth, db: Firestore, email: string): Promise<string> {
  const user = await auth.getUserByEmail(email)
  const profile = await db.collection('users').doc(user.uid).get()
  if (!profile.exists) throw new Error(`Profilo users/${user.uid} non trovato per ${email}`)
  const studioId = profile.data()?.studioId as string | undefined
  if (!studioId) throw new Error(`studioId mancante per ${email}`)
  return studioId
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const saPath = args[0]
  const email = args[1] || 'testnegozio@gmail.com'
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')

  if (!saPath || !existsSync(saPath)) {
    console.error('Uso: npm run seed:test -- <serviceAccount.json> [email] [--dry-run] [--force]')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
  process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID })
  const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID })
  const auth = admin.auth()

  const studioId = await resolveStudioId(auth, db, email)
  console.log(`Studio: ${studioId} (${email})`)

  const markerRef = db.collection('studios').doc(studioId)
  const marker = await markerRef.get()
  if (marker.data()?.seedTestDataAt && !force) {
    console.error('Seed già eseguito (studios.seedTestDataAt). Usa --force per ripetere.')
    process.exit(1)
  }

  const now = FieldValue.serverTimestamp()
  const ops: Array<(batch: { set: (...args: unknown[]) => void; update: (...args: unknown[]) => void }) => void> = []

  // ── Categorie ──
  const categoryIds: { rootId: string; rootName: string; subs: { id: string; name: string }[] }[] = []
  let catOrder = 0
  for (const root of CATEGORY_TREE) {
    const rootRef = db.collection('categories').doc()
    const rootId = rootRef.id
    const subs: { id: string; name: string }[] = []
    ops.push(batch => {
      batch.set(rootRef, {
        studioId,
        name: root.name,
        emoji: root.emoji,
        level: 0,
        path: root.name,
        order: catOrder++,
        createdAt: now,
      })
    })
    let subOrder = 0
    for (const subName of root.subs) {
      const subRef = db.collection('categories').doc()
      subs.push({ id: subRef.id, name: subName })
      ops.push(batch => {
        batch.set(subRef, {
          studioId,
          name: subName,
          emoji: root.emoji,
          parentId: rootId,
          level: 1,
          path: `${root.name} » ${subName}`,
          order: subOrder++,
          createdAt: now,
        })
      })
    }
    categoryIds.push({ rootId, rootName: root.name, subs })
  }

  // ── Prodotti (≥200) ──
  const productRefs: { id: string; code: string; name: string; brand: string; model: string; price: number; stock: number }[] = []
  let productCode = 1
  for (const cat of categoryIds) {
    for (const sub of cat.subs) {
      const count = randomInt(5, 10)
      for (let i = 0; i < count; i++) {
        const brand = pick(BRANDS)
        const model = pick(MODELS[brand] || MODELS.Apple)
        const color = pick(COLORS)
        const code = padCode(productCode++)
        const typologyRoll = randomInt(0, 99)
        const typology = typologyRoll < 80 ? 'with_stock' : typologyRoll < 95 ? 'service' : 'generic'
        const um = pick(['pz', 'pz', 'pz', 'kit', 'set'])
        const name = `${sub.name} ${brand} ${model} ${color}`
        const privati = randomInt(500, 25000) / 100
        const purchase = Math.round(privati * (0.4 + randomInt(0, 20) / 100) * 100) / 100
        const stockRoll = randomInt(0, 99)
        const stock = stockRoll < 30 ? 0 : stockRoll < 50 ? randomInt(1, 3) : randomInt(5, 100)
        const ref = db.collection('products').doc()
        const prices = {
          privati,
          aziende: Math.round(privati * 0.8 * 100) / 100,
          convenzionati: Math.round(privati * 0.7 * 100) / 100,
          vip: Math.round(privati * 0.6 * 100) / 100,
        }
        const productData = {
          studioId,
          code,
          name,
          description: randomInt(0, 1) ? `Ricambio compatibile ${brand} ${model}, colore ${color.toLowerCase()}.` : undefined,
          categoryId: sub.id,
          categoryName: `${cat.rootName} » ${sub.name}`,
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          brand,
          model,
          color,
          typology,
          unitOfMeasure: um,
          prices,
          price: privati,
          purchasePrice: purchase,
          stock,
          minStock: randomInt(3, 5),
          barcode: `${randomInt(8000000000000, 8999999999999)}`,
          variants: randomInt(0, 4) === 0 ? `${color}, ${pick(['S', 'M', 'L'])}` : undefined,
          notes: randomInt(0, 4) === 0 ? 'Verificare compatibilità prima dell\'installazione.' : undefined,
          searchTokens: extractTokens(code, name, brand, model, cat.rootName, sub.name),
          createdAt: now,
        }
        productRefs.push({ id: ref.id, code, name, brand, model, price: privati, stock })
        ops.push(batch => batch.set(ref, omitUndefined(productData)))
      }
    }
  }
  console.log(`Prodotti pianificati: ${productRefs.length}`)

  // ── Clienti (≥100) ──
  const clientRefs: { id: string; name: string; code: string }[] = []
  for (let i = 1; i <= 150; i++) {
    const isCompany = i % 3 === 0 || i % 10 === 0
    const loc = pick(ITALIAN_LOCATIONS)
    const name = isCompany
      ? `${pick(LAST_NAMES)} ${pick(['Tech', 'Mobile', 'Digital', 'Phone', 'Service'])} ${pick(COMPANY_SUFFIX)}`
      : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    const code = padCode(i, 5)
    const ref = db.collection('clients').doc()
    const priceList: PriceList = isCompany ? 'aziende' : pick(['privati', 'privati', 'convenzionati', 'vip'])
    const clientData = {
      studioId,
      code,
      type: 'client',
      name,
      phone: randomPhone(),
      cellPhone: randomPhone(),
      email: isCompany ? `info@${name.toLowerCase().replace(/\s+/g, '')}.it` : `${name.split(' ')[0]?.toLowerCase()}.${i}@email.it`,
      vatNumber: isCompany ? randomVat() : undefined,
      fiscalCode: !isCompany ? randomFiscal() : undefined,
      address: `Via ${pick(LAST_NAMES)} ${randomInt(1, 120)}`,
      city: loc.city,
      province: loc.province,
      cap: loc.cap,
      nation: 'IT',
      contactPerson: isCompany ? `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}` : undefined,
      pec: isCompany ? `pec@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.it` : undefined,
      priceList,
      paymentMethod: pick(['Bonifico', 'Contanti', 'Carta', '']),
      totalSpent: randomInt(0, 5000),
      repairsCount: randomInt(0, 50),
      notes: randomInt(0, 4) === 0 ? pick(['Cliente abituale', 'Preferisce contanti', 'Richiede fattura', 'Consegna in negozio']) : undefined,
      searchTokens: extractTokens(code, name, loc.city),
      createdAt: now,
    }
    clientRefs.push({ id: ref.id, name, code })
    ops.push(batch => batch.set(ref, omitUndefined(clientData)))
  }
  console.log(`Clienti pianificati: ${clientRefs.length}`)

  // ── Fornitori (≥20) ──
  const supplierRefs: { id: string; name: string; code: string }[] = []
  for (let i = 0; i < SUPPLIER_NAMES.length; i++) {
    const loc = pick(ITALIAN_LOCATIONS)
    const name = SUPPLIER_NAMES[i]!
    const code = padCode(i + 1, 4)
    const ref = db.collection('suppliers').doc()
    const supplierData = {
      studioId,
      code,
      name,
      vatNumber: randomVat(),
      address: `Via Industria ${randomInt(1, 50)}`,
      city: loc.city,
      province: loc.province,
      cap: loc.cap,
      nation: 'Italia',
      contactPerson: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      phone: `0${randomInt(2, 9)}${randomInt(1000000, 9999999)}`,
      email: `ordini@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.it`,
      fax: randomInt(0, 1) ? `0${randomInt(2, 9)}${randomInt(1000000, 9999999)}` : undefined,
      pec: `pec@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.it`,
      paymentTerms: pick(['30 gg data fattura', '60 gg fine mese', 'Rimessa diretta', 'Anticipato']),
      bankName: pick(['Intesa Sanpaolo', 'UniCredit', 'BPM', 'BNL', 'Credem']),
      bankIban: randomIban(),
      searchTokens: extractTokens(code, name, loc.city),
      createdAt: now,
    }
    supplierRefs.push({ id: ref.id, name, code })
    ops.push(batch => batch.set(ref, omitUndefined(supplierData)))
  }
  console.log(`Fornitori pianificati: ${supplierRefs.length}`)

  if (dryRun) {
    console.log(`[dry-run] ${ops.length} operazioni batch — nessuna scrittura.`)
    process.exit(0)
  }

  console.log('Scrittura categorie, prodotti, clienti, fornitori…')
  await commitBatches(db, ops)

  // Documenti, riparazioni, pagamenti, movimenti — batch separati dopo commit prodotti/clienti
  const docOps: Array<(batch: { set: (...args: unknown[]) => void; update: (...args: unknown[]) => void }) => void> = []
  const docRefs: { id: string; type: string; number: number; fullNumber: string; date: string; subjectName: string; subjectId?: string; subjectType: string; rows: unknown[]; totalNet: number; totalVat: number; totalDocument: number }[] = []
  const typeCounters: Record<string, number> = {}
  const year = new Date().getFullYear()

  function statusForDoc(type: string, index: number): (typeof DOC_STATUSES)[number] {
    if (type === 'preventivo') {
      if (index <= 5) return 'draft'
      if (index <= 10) return 'confirmed'
      if (index <= 13) return 'completed'
      return 'cancelled'
    }
    if (type === 'vendita_banco') return 'confirmed'
    if (type === 'fattura') return index % 3 === 0 ? 'sent' : 'confirmed'
    return pick(['draft', 'confirmed', 'confirmed', 'completed'] as const)
  }

  function pushDocument(
    docType: string,
    num: number,
    isSupplierDoc: boolean,
    status: (typeof DOC_STATUSES)[number],
    linked?: { id: string; type: string },
  ): void {
    const subject = isSupplierDoc ? pick(supplierRefs) : pick(clientRefs)
    const rowCount = randomInt(1, 5)
    const rows = []
    let totalNet = 0
    let totalVat = 0
    for (let r = 0; r < rowCount; r++) {
      const prod = pick(productRefs)
      const qty = randomInt(1, 10)
      const discount = pick([0, 0, 0, 5, 10, 15])
      const vatRate = 22
      const { totalNet: rn, total: rt } = calcRow(qty, prod.price, discount, vatRate)
      totalNet += rn
      totalVat += rt - rn
      rows.push({
        id: `row-${docType}-${num}-${r}`,
        productId: prod.id,
        productCode: prod.code,
        description: prod.name,
        quantity: qty,
        unitOfMeasure: 'pz',
        unitPrice: prod.price,
        discount,
        vatRate,
        totalNet: rn,
        total: rt,
      })
    }
    const shippingCost = randomInt(0, 2) ? randomInt(500, 2000) / 100 : 0
    const shippingVat = shippingCost * 0.22
    totalNet += shippingCost
    totalVat += shippingVat
    const totalDocument = Math.round((totalNet + totalVat) * 100) / 100
    const ref = db.collection('documents').doc()
    const date = randomDate(365)
    const numbering = randomInt(0, 4) === 0 ? pick(['A', 'B', '']) : ''
    const fullNumber = numbering ? `${num}/${numbering}` : String(num)
    docRefs.push({
      id: ref.id,
      type: docType,
      number: num,
      fullNumber,
      date,
      subjectName: subject.name,
      subjectId: subject.id,
      subjectType: isSupplierDoc ? 'supplier' : 'client',
      rows,
      totalNet: Math.round(totalNet * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      totalDocument,
    })
    docOps.push(batch =>
      batch.set(ref, omitUndefined({
        studioId,
        type: docType,
        number: num,
        numbering: numbering || undefined,
        fullNumber,
        date,
        documentYear: parseInt(date.slice(0, 4), 10) || year,
        subjectType: isSupplierDoc ? 'supplier' : 'client',
        subjectId: subject.id,
        subjectName: subject.name,
        subjectVat: randomVat(),
        subjectAddress: `Via ${pick(LAST_NAMES)} ${randomInt(1, 120)}, ${pick(ITALIAN_LOCATIONS).city}`,
        rows,
        totalNet: Math.round(totalNet * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        totalDocument,
        priceList: pick(['privati', 'privati', 'aziende', 'convenzionati', 'vip']),
        paymentMethod: pick(['Bonifico', 'Contanti', 'Carta di credito']),
        paymentTerms: '30 gg data fattura',
        bankName: 'Intesa Sanpaolo',
        bankIban: randomIban(),
        shippingCost: shippingCost || undefined,
        shippingVatRate: shippingCost ? 22 : undefined,
        shippingDescription: shippingCost ? pick(['Spese trasporto', 'Spese imballo']) : undefined,
        status,
        stockCommitted: status === 'confirmed' || status === 'completed' || status === 'sent',
        linkedDocumentId: linked?.id,
        linkedDocumentType: linked?.type as string | undefined,
        createdAt: now,
      })),
    )
  }

  for (const plan of DOC_PLAN) {
    for (let i = 1; i <= plan.count; i++) {
      typeCounters[plan.type] = i
      pushDocument(plan.type, i, Boolean(plan.supplier), statusForDoc(plan.type, i))
    }
  }

  // Collegamenti preventivo → fattura e DDT → fattura
  const preventivi = docRefs.filter(d => d.type === 'preventivo' && d.number <= 3)
  for (const prev of preventivi) {
    const fNum = (typeCounters.fattura || 0) + 1
    typeCounters.fattura = fNum
    const fattRef = db.collection('documents').doc()
    docOps.push(batch =>
      batch.set(fattRef, omitUndefined({
        studioId,
        type: 'fattura',
        number: fNum,
        fullNumber: String(fNum),
        date: randomDate(90),
        documentYear: year,
        subjectType: prev.subjectType,
        subjectId: prev.subjectId,
        subjectName: prev.subjectName,
        rows: prev.rows,
        totalNet: prev.totalNet,
        totalVat: prev.totalVat,
        totalDocument: prev.totalDocument,
        status: 'confirmed',
        linkedDocumentId: prev.id,
        linkedDocumentType: 'preventivo',
        stockCommitted: true,
        createdAt: now,
      })),
    )
    docOps.push(batch =>
      batch.update(db.collection('documents').doc(prev.id), {
        linkedDocumentId: fattRef.id,
        linkedDocumentType: 'fattura',
        status: 'completed',
        updatedAt: now,
      }),
    )
  }

  const ddts = docRefs.filter(d => d.type === 'ddt').slice(0, 3)
  for (const ddt of ddts) {
    const fNum = (typeCounters.fattura || 0) + 1
    typeCounters.fattura = fNum
    const fattRef = db.collection('documents').doc()
    docOps.push(batch =>
      batch.set(fattRef, omitUndefined({
        studioId,
        type: 'fattura',
        number: fNum,
        fullNumber: String(fNum),
        date: randomDate(60),
        documentYear: year,
        subjectType: ddt.subjectType,
        subjectId: ddt.subjectId,
        subjectName: ddt.subjectName,
        rows: ddt.rows,
        totalNet: ddt.totalNet,
        totalVat: ddt.totalVat,
        totalDocument: ddt.totalDocument,
        status: 'confirmed',
        linkedDocumentId: ddt.id,
        linkedDocumentType: 'ddt',
        stockCommitted: true,
        createdAt: now,
      })),
    )
    docOps.push(batch =>
      batch.update(db.collection('documents').doc(ddt.id), {
        linkedDocumentId: fattRef.id,
        linkedDocumentType: 'fattura',
        status: 'completed',
        updatedAt: now,
      }),
    )
  }

  console.log(`Documenti pianificati: ${docRefs.length}+`)

  console.log('Scrittura documenti…')
  await commitBatches(db, docOps)

  const repairStatusPlan: (typeof REPAIR_STATUSES)[number][] = [
    ...Array(5).fill('waiting'),
    ...Array(8).fill('accepted'),
    ...Array(10).fill('in_progress'),
    ...Array(7).fill('ready'),
    ...Array(8).fill('completed'),
    ...Array(2).fill('on_hold'),
  ] as (typeof REPAIR_STATUSES)[number][]

  const repairOps: Array<(batch: { set: (...args: unknown[]) => void }) => void> = []
  for (let i = 1; i <= repairStatusPlan.length; i++) {
    const status = repairStatusPlan[i - 1]!
    const client = pick(clientRefs)
    const loc = pick(ITALIAN_LOCATIONS)
    const brand = pick(BRANDS)
    const model = pick(MODELS[brand] || MODELS.Apple)
    const prodCount = randomInt(0, 3)
    const products = []
    let partsCost = 0
    for (let p = 0; p < prodCount; p++) {
      const prod = pick(productRefs)
      const qty = 1
      const price = prod.price
      partsCost += price * qty
      products.push({ productId: prod.id, code: prod.code, name: prod.name, model: prod.model, price, qty })
    }
    const laborCost = randomInt(2000, 12000) / 100
    const totalCost = Math.round((laborCost + partsCost) * 100) / 100
    const ref = db.collection('repairs').doc()
    repairOps.push(batch =>
      batch.set(
        ref,
        omitUndefined({
          studioId,
          ticketNumber: `REP-${padCode(i, 3)}`,
          clientId: client.id,
          clientName: client.name,
          clientPhone: `+39 ${randomPhone()}`,
          clientEmail: `cliente${i}@email.it`,
          clientAddress: `Via ${pick(LAST_NAMES)} ${randomInt(1, 120)}`,
          clientCity: loc.city,
          clientProvince: loc.province,
          clientCap: loc.cap,
          deviceType: pick(DEVICE_TYPES),
          deviceBrand: brand,
          deviceModel: model,
          deviceColor: pick(COLORS),
          imei: randomImei(),
          devicePin: String(randomInt(1000, 999999)),
          deviceLockCode: `LOCK${randomInt(1000, 9999)}`,
          deviceAccount: `${pick(FIRST_NAMES).toLowerCase()}@icloud.com`,
          devicePassword: `Pwd${randomInt(1000, 9999)}`,
          deviceCondition: pick(['Buono', 'Discreto', 'Graffiato', 'Schermo rotto', 'Batteria gonfia']),
          problem: pick(['Schermo rotto', 'Batteria scarica', 'Non carica', 'Speaker rotto', 'Vetro posteriore rotto', 'Bootloop', 'Connettore danneggiato']),
          diagnosis: status === 'waiting' || status === 'accepted' ? undefined : pick(['Display da sostituire', 'Batteria da cambiare', 'Connettore saldato', 'Ripristino software']),
          status,
          priority: pick(['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'urgent', 'urgent', 'express'] as const),
          estimatedTime: pick(['1 ora', '2-3 ore', '1 giorno', '2-3 giorni']),
          deadline:
            status !== 'completed'
              ? (() => {
                  const d = new Date()
                  d.setDate(d.getDate() + randomInt(1, 30))
                  return d.toISOString().slice(0, 10)
                })()
              : undefined,
          warrantyDays: pick([30, 60, 90, 180]),
          laborCost,
          products,
          totalCost,
          deposit: randomInt(0, 9) < 4 ? randomInt(1000, 5000) / 100 : undefined,
          assignedTo: randomInt(0, 9) < 7 ? pick(['Tecnico 1', 'Tecnico 2', 'Mario']) : undefined,
          notes: randomInt(0, 1) ? pick(['Cliente urgente', 'Attendere conferma preventivo', 'Ricambio ordinato']) : undefined,
          checklistPre: [
            { id: '1', label: 'Schermo funzionante', checked: randomInt(0, 1) === 1 },
            { id: '2', label: 'Touch reattivo', checked: randomInt(0, 1) === 1 },
            { id: '3', label: 'Fotocamera OK', checked: randomInt(0, 1) === 1 },
            { id: '4', label: 'Carica batteria', checked: randomInt(0, 1) === 1 },
            { id: '5', label: 'Connettori puliti', checked: randomInt(0, 1) === 1 },
          ],
          checklistPost: status === 'completed'
            ? [
                { id: '1', label: 'Test funzionalità', checked: true },
                { id: '2', label: 'Pulizia dispositivo', checked: true },
              ]
            : [],
          createdAt: now,
          updatedAt: now,
        }),
      ),
    )
  }

  const paymentOps: Array<(batch: { set: (...args: unknown[]) => void }) => void> = []
  for (let i = 1; i <= 50; i++) {
    const isIn = i <= 30
    const amount = randomInt(500, 50000) / 100
    const doc = randomInt(0, 1) ? pick(docRefs) : null
    const ref = db.collection('payments').doc()
    paymentOps.push(batch =>
      batch.set(
        ref,
        omitUndefined({
          studioId,
          date: randomDate(120),
          resource: pick(['cassa_contanti', 'cassa_contanti', 'pos', 'pos', 'pos', 'banca', 'banca', 'altro']),
          subjectType: doc?.subjectType || 'client',
          subjectId: doc?.subjectId,
          subjectName: doc?.subjectName || pick(clientRefs).name,
          description: doc ? `Pagamento doc. ${doc.fullNumber}` : pick(['Acconto riparazione', 'Saldo fattura', 'Acquisto ricambi', 'Spese generali']),
          paymentMethod: pick(['Contanti', 'Carta di credito', 'Bonifico bancario', 'Assegno']),
          amountIn: isIn ? amount : undefined,
          amountOut: isIn ? undefined : amount,
          settled: i <= 35,
          settledDate: i <= 35 ? randomDate(60) : undefined,
          linkedDocumentId: doc?.id,
          linkedDocumentType: doc?.type,
          linkedDocumentNumber: doc?.fullNumber,
          createdAt: now,
        }),
      ),
    )
  }

  const movementOps: Array<(batch: { set: (...args: unknown[]) => void }) => void> = []
  for (let i = 1; i <= 80; i++) {
    const prod = pick(productRefs)
    const qty = randomInt(1, 20)
    const typeRoll = randomInt(0, 99)
    const movType = typeRoll < 50 ? 'load' : typeRoll < 90 ? 'unload' : typeRoll < 95 ? 'committed' : 'incoming'
    const doc = randomInt(0, 1) ? pick(docRefs) : null
    const ref = db.collection('stockMovements').doc()
    movementOps.push(batch =>
      batch.set(
        ref,
        omitUndefined({
          studioId,
          date: randomDate(120),
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          type: movType,
          loaded: movType === 'load' ? qty : undefined,
          unloaded: movType === 'unload' ? qty : undefined,
          committed: movType === 'committed' ? qty : undefined,
          incoming: movType === 'incoming' ? qty : undefined,
          stockUpdated: movType === 'load' || movType === 'unload',
          cause: doc ? `${doc.type} ${doc.fullNumber} del ${doc.date.split('-').reverse().join('/')}` : pick(['Inventario iniziale', 'Rettifica inventario', 'Carico manuale', `Riparazione REP-${padCode(randomInt(1, 40), 3)}`]),
          subjectType: movType === 'load' ? 'supplier' : 'client',
          subjectId: doc?.subjectId,
          subjectName: doc?.subjectName || (movType === 'load' ? pick(supplierRefs).name : pick(clientRefs).name),
          linkedDocumentId: doc?.id,
          linkedDocumentType: doc?.type,
          createdAt: now,
        }),
      ),
    )
  }

  console.log('Scrittura riparazioni, pagamenti, movimenti…')
  await commitBatches(db, [...repairOps, ...paymentOps, ...movementOps])

  await markerRef.set(
    {
      seedTestDataAt: FieldValue.serverTimestamp(),
      seedTestDataCounts: {
        products: productRefs.length,
        clients: clientRefs.length,
        suppliers: supplierRefs.length,
        documents: docRefs.length,
        repairs: repairStatusPlan.length,
        payments: 50,
        stockMovements: 80,
      },
    },
    { merge: true },
  )

  console.log('\n✓ Seed completato:')
  console.log(`  Prodotti:    ${productRefs.length}`)
  console.log(`  Clienti:     ${clientRefs.length}`)
  console.log(`  Fornitori:   ${supplierRefs.length}`)
  console.log(`  Documenti:   ${docRefs.length}`)
  console.log(`  Riparazioni: ${repairStatusPlan.length}`)
  console.log(`  Pagamenti:   50`)
  console.log(`  Movimenti:   80`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
