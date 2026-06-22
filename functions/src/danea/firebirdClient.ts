import Firebird from 'node-firebird'
import { ensureFirebirdServer, prepareDatabaseFile } from './firebirdServer'

export type FirebirdRow = Record<string, unknown>

type FbDatabase = {
  query(sql: string, params: unknown[], callback: (err: Error | null, result: unknown[]) => void): void
  detach(callback: (err: Error | null) => void): void
}

const DEFAULT_OPTIONS = {
  host: '127.0.0.1',
  port: 3050,
  user: 'SYSDBA',
  password: 'masterkey',
  lowercase_keys: false,
  pageSize: 4096,
}

function attach(database: string): Promise<FbDatabase> {
  return new Promise((resolve, reject) => {
    Firebird.attach({ ...DEFAULT_OPTIONS, database }, (err: Error | null, db: FbDatabase) => {
      if (err) reject(err)
      else resolve(db)
    })
  })
}

function query(db: FbDatabase, sql: string): Promise<FirebirdRow[]> {
  return new Promise((resolve, reject) => {
    db.query(sql, [], (err: Error | null, result: unknown[]) => {
      if (err) reject(err)
      else resolve((result ?? []) as FirebirdRow[])
    })
  })
}

function detach(db: FbDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    db.detach((err: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function str(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

export function num(v: unknown): number {
  if (typeof v === 'number') return v
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export type EasyfattExtract = {
  clients: FirebirdRow[]
  suppliers: FirebirdRow[]
  products: FirebirdRow[]
  documents: FirebirdRow[]
  documentRows: FirebirdRow[]
  documentLinks: Array<{ destIdDoc: number; sourceIdDoc: number }>
}

async function tryQuery(db: FbDatabase, sql: string): Promise<FirebirdRow[]> {
  try {
    return await query(db, sql)
  } catch {
    return []
  }
}

function parseIdDocLinks(rows: FirebirdRow[], destField: string, sourceField: string): Array<{ destIdDoc: number; sourceIdDoc: number }> {
  const links: Array<{ destIdDoc: number; sourceIdDoc: number }> = []
  for (const row of rows) {
    const destIdDoc = num(row[destField])
    const sourceIdDoc = num(row[sourceField])
    if (destIdDoc > 0 && sourceIdDoc > 0) {
      links.push({ destIdDoc, sourceIdDoc })
    }
  }
  return links
}

async function loadDocumentLinks(db: FbDatabase): Promise<Array<{ destIdDoc: number; sourceIdDoc: number }>> {
  const queries: Array<[string, string, string]> = [
    [`SELECT "IDDoc", "IDDocIncluso" FROM "TDocInclusioni"`, 'IDDoc', 'IDDocIncluso'],
    [`SELECT "IDDoc", "IDDocOrig" FROM "TDocInclusioni"`, 'IDDoc', 'IDDocOrig'],
    [`SELECT "IDDoc", "IDDocInclusoIn" FROM "TDocTestate" WHERE COALESCE("IDDocInclusoIn", 0) <> 0`, 'IDDocInclusoIn', 'IDDoc'],
    [
      `SELECT DISTINCT r."IDDoc", r."IDDocIncluso" FROM "TDocRighe" r WHERE COALESCE(r."IDDocIncluso", 0) <> 0`,
      'IDDoc',
      'IDDocIncluso',
    ],
  ]

  const merged: Array<{ destIdDoc: number; sourceIdDoc: number }> = []
  const seen = new Set<string>()
  for (const [sql, destField, sourceField] of queries) {
    const rows = await tryQuery(db, sql)
    for (const link of parseIdDocLinks(rows, destField, sourceField)) {
      const key = `${link.destIdDoc}|${link.sourceIdDoc}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(link)
    }
  }
  return merged
}

export async function readEasyfattDatabase(databasePath: string): Promise<EasyfattExtract> {
  await ensureFirebirdServer()
  prepareDatabaseFile(databasePath)
  const db = await attach(databasePath)
  try {
    const clients = await tryQuery(
      db,
      `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
              "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Sconto", "Pagamento"
       FROM "TAnagrafica"
       WHERE "Cliente" = 1`,
    )
    const clientsAlt =
      clients.length > 0
        ? clients
        : await tryQuery(
            db,
            `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
                    "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Sconto", "Pagamento"
             FROM "TAnagrafica"
             WHERE COALESCE("Cliente", 0) <> 0`,
          )

    const suppliers = await tryQuery(
      db,
      `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
              "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Pagamento"
       FROM "TAnagrafica"
       WHERE "Fornitore" = 1`,
    )
    const suppliersAlt =
      suppliers.length > 0
        ? suppliers
        : await tryQuery(
            db,
            `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
                    "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Pagamento"
             FROM "TAnagrafica"
             WHERE COALESCE("Fornitore", 0) <> 0`,
          )

    const products = await tryQuery(
      db,
      `SELECT "CodArticolo", "Desc", "PrezzoListino1", "PrezzoAcquisto", "Giacenza", "UM",
              "CodBarre", "Produttore", "Note", "Categoria", "Sottocategoria"
       FROM "TArticoli"`,
    )
    const productsAlt =
      products.length > 0
        ? products
        : await tryQuery(
            db,
            `SELECT "CodArticolo", "Desc", "Prezzo", "PrezzoAcq", "Giacenza", "UM",
                    "CodBarre", "Produttore", "Note"
             FROM "TArticoli"`,
          )

    const documents = await tryQuery(
      db,
      `SELECT t."IDDoc", t."NumDoc", t."Numeraz", t."DataDoc", t."DescDoc", t."TotDoc", t."TotNetto", t."TotIva",
              t."CodAnagr", t."Annullato", t."Pagamento", t."TipoDoc",
              td."Nome" AS "TipoDocNome", an."Nome" AS "SoggettoNome"
       FROM "TDocTestate" t
       LEFT JOIN "TTipiDoc" td ON t."TipoDoc" = td."TipoDoc"
       LEFT JOIN "TAnagrafica" an ON t."CodAnagr" = an."CodAnagr"`,
    )

    const documentRows = await tryQuery(
      db,
      `SELECT r."IDDoc", r."CodArticolo", r."Desc", r."Qta", r."PrezzoNet", r."Prezzo", r."PrezzoIvato",
              r."Iva", r."Sconti", r."UM", r."IDDocIncluso"
       FROM "TDocRighe" r`,
    )
    const documentRowsAlt =
      documentRows.length > 0
        ? documentRows
        : await tryQuery(
            db,
            `SELECT r."IDDoc", r."CodArticolo", r."Desc", r."Qta", r."Prezzo", r."Iva", r."Sconti", r."UM", r."IDDocIncluso"
             FROM "TDocRighe" r`,
          )

    const documentLinks = await loadDocumentLinks(db)

    return {
      clients: clientsAlt,
      suppliers: suppliersAlt,
      products: productsAlt,
      documents,
      documentRows: documentRowsAlt,
      documentLinks,
    }
  } finally {
    await detach(db)
  }
}

export async function testFirebirdConnection(databasePath: string): Promise<boolean> {
  try {
    await ensureFirebirdServer()
    prepareDatabaseFile(databasePath)
    const db = await attach(databasePath)
    await query(db, 'SELECT 1 FROM RDB$DATABASE')
    await detach(db)
    return true
  } catch (err) {
    console.error('Firebird test connection failed:', err)
    return false
  }
}
