// ==================== CORE ====================

export interface StudioFeatures {
  warehouse: boolean
  pos: boolean
  whatsapp: boolean
  rtPrinter: boolean
}

export type StudioRepairType =
  | 'telefonia'
  | 'computer'
  | 'elettrodomestici'
  | 'console'
  | 'multi'
  | 'altro'

export interface Subscription {
  plan: 'trial' | 'starter' | 'pro'
  status: 'trial' | 'active' | 'expiring' | 'expired' | 'suspended'
  startDate: string
  expiryDate: string
  trialEndsAt?: string
  lastPaymentDate?: string
  lastPaymentAmount?: number
  paymentMethod?: 'bonifico' | 'paypal' | 'satispay' | 'altro'
  paymentFrequency: 'monthly' | 'yearly'
  monthlyPrice: number
  yearlyPrice: number
  notes?: string
  autoRenew: boolean
}

export interface PaymentConfig {
  iban: string
  ibanHolder: string
  bankName: string
  paypalLink: string
  satispayId: string
  whatsappNumber: string
  supportEmail: string
  trialDays: number
  monthlyPrice: number
  yearlyPrice: number
}

export interface AdminNote {
  id: string
  studioId: string
  studioName: string
  message: string
  type: 'bug' | 'support' | 'payment' | 'feature_request' | 'general'
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: Date
  resolvedAt?: Date
}

export interface Studio {
  id: string
  name: string
  email: string
  ownerId?: string
  phone?: string
  cellPhone?: string
  address?: string
  vatNumber?: string
  fiscalCode?: string
  city?: string
  province?: string
  cap?: string
  nation?: string
  subtitle?: string
  rtModel?: string
  rtIp?: string
  bankName?: string
  bankIban?: string
  disclaimer?: string
  logoUrl?: string
  onboardingCompleted?: boolean
  features?: StudioFeatures
  repairType?: StudioRepairType[]
  subscription?: Subscription
  /** Shortcut: abbonamento attivo (trial o pagato non scaduto). */
  isActive?: boolean
  lastLoginAt?: Date
  aruba?: {
    enabled?: boolean
    environment?: 'demo' | 'production'
    username?: string
    hasPassword?: boolean
    regimeFiscale?: string
    lastTestOk?: boolean
    lastTestMessage?: string
    configuredAt?: unknown
    lastTestAt?: unknown
  }
  createdAt: Date
}

export type MembershipRole = 'owner' | 'admin' | 'technician' | 'cashier'

/** Riferimento membership denormalizzato sul profilo utente (Fase 1, scrivibile con regole attuali). */
export interface UserStudioMembershipRef {
  studioId: string
  role: MembershipRole
}

/** Documento canonico user↔studio (Fase 2 rules: memberships/{userId}_{studioId}). */
export interface StudioMembership {
  id: string
  userId: string
  studioId: string
  role: MembershipRole
  createdAt?: Date
}

export interface UserProfile {
  id: string
  /** Archivio principale legacy (= uid al signup). Resta per retrocompatibilità rules Fase 1. */
  studioId: string
  email: string
  name: string
  role: 'admin' | 'technician' | 'cashier'
  lang: 'it' | 'en'
  /** Elenco archivi accessibili (multi-officina). */
  memberships?: UserStudioMembershipRef[]
  /** Preferenza studio attivo persistita su Firestore. */
  defaultStudioId?: string
  /** true solo per nuove registrazioni email/password finché l'email non è verificata. */
  emailVerificationPending?: boolean
}

// ==================== CATEGORIES ====================

export interface Category {
  id: string
  studioId: string
  name: string
  emoji: string
  parentId?: string        // for nested subcategories (undefined = root)
  level: number            // 0 = root, 1+ = nested depth
  path: string             // e.g. "Accessori » Appendiabiti » Ferro"
  order: number
  createdAt: Date
}

// ==================== PRODUCTS ====================

export interface ProductPrices {
  privati: number
  aziende?: number
  convenzionati?: number
  vip?: number
}

export interface Product {
  id: string
  studioId: string
  code: string             // codice prodotto (e.g. "0042")
  name: string
  description?: string
  categoryId: string
  categoryName: string     // full path: "Accessori » Appendiabiti"
  subcategoryId?: string
  subcategoryName?: string
  brand: string
  model: string
  typology: 'with_stock' | 'service' | 'generic'  // Art. con magazzino / Servizio / Generico
  unitOfMeasure: string    // pz, kg, m, lt, etc.
  prices: ProductPrices
  price: number            // main price (backward compat = prices.privati)
  purchasePrice?: number   // prezzo d'acquisto dal fornitore
  stock: number
  minStock?: number        // soglia scorta minima
  color?: string
  weight?: string
  dimensions?: string
  supplierId?: string      // fornitore di riferimento
  supplierName?: string
  notes?: string
  variants?: string        // varianti testuali
  attachments?: string[]   // URLs Firebase Storage
  imageUrl?: string
  barcode?: string
  /** Token per ricerca full-catalog via array-contains. */
  searchTokens?: string[]
  createdAt: Date
  updatedAt?: Date
}

// ==================== REPAIRS ====================

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface RepairPhoto {
  url: string
  path: string
  name: string
  type: 'before' | 'after'
  timestamp: number
}

export interface RepairProduct {
  productId?: string
  code?: string
  name: string
  model?: string
  description?: string
  price: number
  qty: number
  discount?: number
  vatPercent?: number
  amount?: number
}

export interface Repair {
  id: string
  studioId: string
  ticketNumber?: string
  clientId?: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  clientAddress?: string
  clientCity?: string
  clientProvince?: string
  clientCap?: string
  deviceType: string
  deviceBrand: string
  deviceModel: string
  deviceColor?: string
  imei?: string
  devicePin?: string
  deviceLockCode?: string
  deviceAccount?: string
  devicePassword?: string
  deviceCondition?: string
  problem: string
  diagnosis?: string
  status: 'waiting' | 'accepted' | 'in_progress' | 'ready' | 'completed' | 'on_hold'
  priority: 'normal' | 'urgent' | 'express'
  estimatedTime: string
  deadline?: string
  warrantyDays: number
  laborCost: number
  products: RepairProduct[]
  totalCost: number
  deposit?: number
  assignedTo?: string
  notes?: string
  deviceId?: string
  acceptanceDate?: string
  repairSequence?: number
  repairYear?: number
  photos?: RepairPhoto[]
  checklistPre: ChecklistItem[]
  checklistPost: ChecklistItem[]
  /** Ordine cliente collegato (note dispositivo / conferma ordine). */
  linkedDocumentId?: string
  linkedDocumentType?: DocumentType
  createdAt: Date
  updatedAt: Date
}

// ==================== CLIENTS ====================

export interface ClientExtraIndirizzo {
  denominazione: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

export interface ClientExtraContatto {
  label: string
  telefono?: string
  cellulare?: string
  email?: string
}

export interface ClientExtraData {
  sedeLegale?: ClientExtraIndirizzo
  sediAmmin?: ClientExtraIndirizzo[]
  sediExtra?: ClientExtraIndirizzo[]
  contattiExtra?: ClientExtraContatto[]
}

export interface Client {
  id: string
  studioId: string
  code?: string            // codice cliente
  type: 'client' | 'supplier' | 'both'  // flag come FIXLab
  name: string
  phone: string
  email?: string
  pec?: string
  vatNumber?: string       // P.IVA
  fiscalCode?: string      // Cod. fiscale
  // Sede operativa
  address?: string
  city?: string
  province?: string
  cap?: string
  nation?: string
  // Contatti aggiuntivi
  contactPerson?: string   // referente
  cellPhone?: string
  fax?: string
  // Dati commerciali
  priceList?: 'privati' | 'aziende' | 'convenzionati' | 'vip'
  paymentMethod?: string
  notes?: string
  /** Campi estesi sezione Clienti FIXLab */
  agent?: string
  discount?: string
  bankAccount?: string
  destinationCode?: string
  adminRef?: string
  website?: string
  /** Dati estesi anagrafica (sedi extra, contatti aggiuntivi) */
  extraData?: ClientExtraData
  totalSpent: number
  repairsCount: number
  /** Token per ricerca full-catalog via array-contains. */
  searchTokens?: string[]
  createdAt: Date
  updatedAt?: Date
}

// ==================== SUPPLIERS ====================

export interface Supplier {
  id: string
  studioId: string
  code: string
  name: string
  vatNumber?: string
  fiscalCode?: string
  // Sede operativa
  address?: string
  city?: string
  province?: string
  cap?: string
  nation?: string
  // Contatti
  contactPerson?: string
  phone?: string
  cellPhone?: string
  fax?: string
  email?: string
  pec?: string
  website?: string
  // Dati commerciali (allineati a Clienti FIXLab)
  paymentTerms?: string
  paymentMethod?: string
  priceList?: Client['priceList']
  agent?: string
  discount?: string
  bankName?: string
  bankIban?: string
  bankAccount?: string
  destinationCode?: string
  adminRef?: string
  extraData?: ClientExtraData
  notes?: string
  /** Token per ricerca full-catalog via array-contains. */
  searchTokens?: string[]
  createdAt: Date
  updatedAt?: Date
}

// ==================== DOCUMENTS ====================

export type DocumentType =
  | 'preventivo'           // Preventivo
  | 'conferma_ordine'      // Conferma d'ordine
  | 'ordine_cliente'       // Ordine cliente
  | 'rapporto_intervento'  // Rapporto d'intervento
  | 'ddt'                  // Doc. di trasporto
  | 'vendita_banco'        // Vendita al banco
  | 'fattura_proforma'     // Fattura pro-forma
  | 'fattura_acconto'      // Fattura d'acconto
  | 'fattura_accomp'       // Fattura accompagnatoria
  | 'fattura'              // Fattura
  | 'preventivo_fornitore' // Preventivo fornitore
  | 'ordine_fornitore'     // Ordine fornitore
  | 'arrivo_merce'         // Arrivo merce
  | 'reg_fattura_fornitore' // Registrazione fattura fornitore

export interface DocumentRow {
  id: string
  productId?: string
  productCode?: string
  description: string
  tagliaColore?: string
  quantity: number
  unitOfMeasure: string
  unitPrice: number
  discount?: number        // percentuale sconto (effettiva)
  discountExpr?: string    // sconto digitato dall'utente (es. "2+1")
  vatRate: number           // aliquota IVA (22, 10, 4, 0)
  totalNet: number          // prezzo netto riga
  total: number             // totale con IVA
  campoFE?: string          // codice campo fattura elettronica
}

export interface DocRecord {
  id: string
  studioId: string
  type: DocumentType
  number: number           // numero progressivo
  numbering?: string       // numerazione (e.g. "A", "B")
  fullNumber: string       // numero completo (e.g. "7", "3/A")
  date: string             // data documento (YYYY-MM-DD)
  // Soggetto (cliente o fornitore)
  subjectType: 'client' | 'supplier'
  subjectId?: string
  subjectName: string
  subjectVat?: string
  subjectAddress?: string
  // Contenuto
  rows: DocumentRow[]
  // Totali
  totalNet: number
  totalVat: number
  totalDocument: number
  // Spese aggiuntive
  shippingCost?: number
  shippingVatRate?: number
  shippingDescription?: string
  // Pagamento
  paymentMethod?: string
  paymentTerms?: string       // condizioni di pagamento (es: "30 gg data fattura")
  paymentNotes?: string
  bankName?: string            // banca d'appoggio
  bankIban?: string            // IBAN per bonifici
  // Indirizzo di consegna (se diverso dal soggetto)
  deliveryAddress?: string
  deliveryCity?: string
  deliveryProvince?: string
  deliveryCap?: string
  // Opzioni
  priceList?: 'privati' | 'aziende' | 'convenzionati' | 'vip'
  pricesVatIncluded?: boolean  // true = griglia in prezzi ivati, false = netti
  agentName?: string
  internalNotes?: string
  // Informazioni dispositivo (riquadro stampa ordine/conferma)
  deviceImei?: string
  deviceLockCode?: string
  deviceAccount?: string
  deviceNotes?: string
  validityDays?: number        // validità preventivo (gg)
  followUpDoc?: boolean        // seguirà documento di vendita
  // Stato e collegamenti
  status: 'draft' | 'confirmed' | 'sent' | 'cancelled' | 'completed'
  documentYear?: number        // anno numerazione (es. 2026)
  stockCommitted?: boolean     // true se lo scarico magazzino è già stato eseguito
  linkedDocumentId?: string    // per generare fattura da preventivo ecc.
  linkedDocumentType?: DocumentType
  /** Riparazione collegata (ordine cliente con note dispositivo). */
  repairId?: string
  /** Riferimento documento per FatturaPA (tab Proprietà fattura elettr. Danea) */
  electronicInvoiceRef?: {
    tipo?: '' | 'ordine_acquisto' | 'contratto' | 'convenzione' | 'ricezione' | 'fattura_collegata' | 'ddt'
    numero?: string
    data?: string
    cig?: string
    cup?: string
    commessaConvenzione?: string
  }
  aruba?: {
    status?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'error'
    environment?: 'demo' | 'production'
    progressivoInvio?: string
    uploadFileName?: string
    sentAt?: unknown
    sentBy?: string
    errorMessage?: string
  }
  // Allegati
  attachments?: string[]       // URLs Firebase Storage
  // Timestamps
  createdAt: Date
  updatedAt?: Date
}

// ==================== PAYMENTS ====================

export type PaymentResourceType = 'cash' | 'bank' | 'card'

export interface PaymentResource {
  id: string
  studioId: string
  name: string
  type: PaymentResourceType
  initialBalance?: number
  isDefault?: boolean
  sortOrder?: number
  homeBankingUrl?: string
  notes?: string
  createdAt: Date
  updatedAt?: Date
}

export interface PaymentExpenseLine {
  id: string
  importoNetto: number
  contoCodice: string
  contoDescrizione: string
  descrizione: string
}

export interface Payment {
  id: string
  studioId: string
  date: string              // YYYY-MM-DD (data scadenza)
  resource: 'cassa_contanti' | 'banca' | 'pos' | 'altro'
  resourceId?: string       // riferimento a paymentResources
  resourceName?: string     // denormalizzato per lista/storico
  // Soggetto
  subjectType?: 'client' | 'supplier'
  subjectId?: string
  subjectName?: string
  description: string
  paymentMethod?: string    // Bonifico, Ri.Ba., Contanti, Carta, etc.
  // Importi
  amountIn?: number         // entrata
  amountOut?: number        // uscita
  // Stato
  settled: boolean          // saldato
  settledDate?: string
  // Collegamento documento
  linkedDocumentId?: string
  linkedDocumentType?: DocumentType
  linkedDocumentNumber?: string
  notes?: string
  // Registrazione spese (Danea)
  registrationDate?: string
  protocolNumber?: number
  paymentNumbering?: string
  expenseDescription?: string
  internalComment?: string
  documentProtected?: boolean
  expenseLines?: PaymentExpenseLine[]
  createdAt: Date
  updatedAt?: Date
}

// ==================== STOCK MOVEMENTS ====================

export type StockMovementType = 'load' | 'unload' | 'adjust' | 'committed' | 'incoming'

export interface StockMovement {
  id: string
  studioId: string
  date: string              // YYYY-MM-DD
  productId: string
  productCode: string
  productName: string
  // Soggetto
  subjectType?: 'client' | 'supplier'
  subjectId?: string
  subjectName?: string
  // Quantità
  type: StockMovementType
  loaded?: number           // caricato
  unloaded?: number         // scaricato
  committed?: number        // impegnato
  incoming?: number         // in arrivo
  adjustTo?: number         // rettifica: valore assoluto giacenza
  adjustDelta?: number      // rettifica: variazione (+/−)
  previousStock?: number    // giacenza prima del movimento (per storno)
  stockUpdated?: boolean    // true se products.stock è stato modificato
  // Causale
  cause?: string            // e.g. "Fatt. 29 del 30/9/22", "DDT 37 del 16/10/22"
  linkedDocumentId?: string
  linkedDocumentType?: DocumentType
  notes?: string
  operatorId?: string
  operatorName?: string
  createdAt: Date
}

// ==================== DEVICES (IMEI / SERIAL TRACKING) ====================

export interface DeviceRepairEntry {
  repairId: string
  ticketNumber?: string
  date: string              // YYYY-MM-DD
  problem: string
  status: string
  totalCost: number
}

export interface DeviceSaleEntry {
  documentId: string
  documentType: string
  date: string
  buyerName: string
  price: number
}

export interface Device {
  id: string
  studioId: string
  // Identificativi
  imei?: string              // IMEI (15 cifre) — telefoni
  serial?: string            // Numero seriale — qualsiasi dispositivo
  barcode?: string           // Codice a barre EAN/UPC se presente
  // Dispositivo
  type: string               // Smartphone, Tablet, Laptop, Console, Altro
  brand: string              // Apple, Samsung, Xiaomi, Huawei...
  model: string              // iPhone 15, Galaxy S24...
  color?: string
  storage?: string           // 128GB, 256GB...
  // Proprietario attuale
  clientId?: string
  clientName?: string
  clientPhone?: string
  // Stato
  status: 'in_store' | 'in_repair' | 'sold' | 'returned' | 'client_owned'
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'broken'
  // Garanzia
  warrantyExpiry?: string    // YYYY-MM-DD
  purchaseDate?: string      // data acquisto (dal fornitore o dal cliente precedente)
  purchasePrice?: number     // prezzo d'acquisto
  // Storico (denormalizzato per velocità)
  repairsHistory: DeviceRepairEntry[]
  salesHistory: DeviceSaleEntry[]
  totalRepairs: number
  totalSpentOnRepairs: number
  // Note
  notes?: string
  // Timestamps
  createdAt: Date
  updatedAt?: Date
}

// ==================== ENTERPRISE CONFIG ====================

export interface Agent {
  id: string
  studioId: string
  name: string
  email?: string
  phone?: string
  /** Percentuale unica (se non si usa la matrice per listino). */
  commissionPercent?: number
  notes?: string
  /** Matrice provvigioni: classe → listino → % (es. principale.privati = 12). */
  commissionMatrix?: Record<string, Record<string, number>>
  isActive?: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface Warehouse {
  id: string
  studioId: string
  name: string
  code?: string
  isDefault?: boolean
  address?: string
  createdAt: Date
  updatedAt?: Date
}

export interface PriceListConfig {
  id: string
  studioId: string
  name: string
  code: string
  isDefault?: boolean
  sortOrder?: number
  vatIncluded?: boolean
  createdAt: Date
  updatedAt?: Date
}