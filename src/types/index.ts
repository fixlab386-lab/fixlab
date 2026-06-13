// ==================== CORE ====================

export interface StudioFeatures {
  warehouse: boolean
  pos: boolean
  devices: boolean
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

export interface Studio {
  id: string
  name: string
  email: string
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
}

// ==================== CATEGORIES ====================

export interface Category {
  id: string
  studioId: string
  name: string
  emoji: string
  parentId?: string        // for subcategories (null = root)
  level: number            // 0 = root, 1 = sub, 2 = sub-sub
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
  | 'fattura'              // Fattura
  | 'preventivo_fornitore' // Preventivo fornitore
  | 'ordine_fornitore'     // Ordine fornitore
  | 'arrivo_merce'         // Arrivo merce

export interface DocumentRow {
  id: string
  productId?: string
  productCode?: string
  description: string
  tagliaColore?: string
  quantity: number
  unitOfMeasure: string
  unitPrice: number
  discount?: number        // percentuale sconto
  vatRate: number           // aliquota IVA (22, 10, 4, 0)
  totalNet: number          // prezzo netto riga
  total: number             // totale con IVA
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
  agentName?: string
  internalNotes?: string
  validityDays?: number        // validità preventivo (gg)
  followUpDoc?: boolean        // seguirà documento di vendita
  // Stato e collegamenti
  status: 'draft' | 'confirmed' | 'sent' | 'cancelled' | 'completed'
  documentYear?: number        // anno numerazione (es. 2026)
  stockCommitted?: boolean     // true se lo scarico magazzino è già stato eseguito
  linkedDocumentId?: string    // per generare fattura da preventivo ecc.
  linkedDocumentType?: DocumentType
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
  createdAt: Date
  updatedAt?: Date
}

export interface Payment {
  id: string
  studioId: string
  date: string              // YYYY-MM-DD
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
  commissionPercent?: number
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