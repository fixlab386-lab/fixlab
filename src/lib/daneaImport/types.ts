export type DaneaEntityType = 'clients' | 'suppliers' | 'products' | 'documents' | 'unknown' | 'bef'

export type ParsedSpreadsheet = {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
}

export type ClassifiedFile = ParsedSpreadsheet & {
  entityType: DaneaEntityType
  confidence: number
}

export type DaneaImportOptions = {
  importClients: boolean
  importSuppliers: boolean
  importProducts: boolean
  importDocuments: boolean
  skipDuplicates: boolean
}

export type DaneaImportPreview = {
  files: Array<{
    fileName: string
    entityType: DaneaEntityType
    rowCount: number
    sampleLabels: string[]
  }>
  totals: {
    clients: number
    suppliers: number
    products: number
    documents: number
  }
  hasBef: boolean
}

export type DaneaImportProgress = {
  phase: 'index' | 'clients' | 'suppliers' | 'products' | 'documents' | 'done'
  done: number
  total: number
  message: string
}

export type DaneaImportResult = {
  imported: { clients: number; suppliers: number; products: number; documents: number }
  skipped: { clients: number; suppliers: number; products: number; documents: number }
  errors: string[]
}
