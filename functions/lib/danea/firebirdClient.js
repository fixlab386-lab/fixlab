"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.str = str;
exports.num = num;
exports.readEasyfattDatabase = readEasyfattDatabase;
exports.testFirebirdConnection = testFirebirdConnection;
const node_firebird_1 = __importDefault(require("node-firebird"));
const firebirdServer_1 = require("./firebirdServer");
const DEFAULT_OPTIONS = {
    host: '127.0.0.1',
    port: 3050,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: false,
    pageSize: 4096,
};
function attach(database) {
    return new Promise((resolve, reject) => {
        node_firebird_1.default.attach({ ...DEFAULT_OPTIONS, database }, (err, db) => {
            if (err)
                reject(err);
            else
                resolve(db);
        });
    });
}
function query(db, sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, [], (err, result) => {
            if (err)
                reject(err);
            else
                resolve((result ?? []));
        });
    });
}
function detach(db) {
    return new Promise((resolve, reject) => {
        db.detach((err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function str(v) {
    if (v == null)
        return '';
    if (v instanceof Date)
        return v.toISOString().slice(0, 10);
    return String(v).trim();
}
function num(v) {
    if (typeof v === 'number')
        return v;
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
}
async function tryQuery(db, sql) {
    try {
        return await query(db, sql);
    }
    catch {
        return [];
    }
}
function parseIdDocLinks(rows, destField, sourceField) {
    const links = [];
    for (const row of rows) {
        const destIdDoc = num(row[destField]);
        const sourceIdDoc = num(row[sourceField]);
        if (destIdDoc > 0 && sourceIdDoc > 0) {
            links.push({ destIdDoc, sourceIdDoc });
        }
    }
    return links;
}
async function loadDocumentLinks(db) {
    const queries = [
        [`SELECT "IDDoc", "IDDocIncluso" FROM "TDocInclusioni"`, 'IDDoc', 'IDDocIncluso'],
        [`SELECT "IDDoc", "IDDocOrig" FROM "TDocInclusioni"`, 'IDDoc', 'IDDocOrig'],
        [`SELECT "IDDoc", "IDDocInclusoIn" FROM "TDocTestate" WHERE COALESCE("IDDocInclusoIn", 0) <> 0`, 'IDDocInclusoIn', 'IDDoc'],
        [
            `SELECT DISTINCT r."IDDoc", r."IDDocIncluso" FROM "TDocRighe" r WHERE COALESCE(r."IDDocIncluso", 0) <> 0`,
            'IDDoc',
            'IDDocIncluso',
        ],
    ];
    const merged = [];
    const seen = new Set();
    for (const [sql, destField, sourceField] of queries) {
        const rows = await tryQuery(db, sql);
        for (const link of parseIdDocLinks(rows, destField, sourceField)) {
            const key = `${link.destIdDoc}|${link.sourceIdDoc}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push(link);
        }
    }
    return merged;
}
async function readEasyfattDatabase(databasePath) {
    await (0, firebirdServer_1.ensureFirebirdServer)();
    (0, firebirdServer_1.prepareDatabaseFile)(databasePath);
    const db = await attach(databasePath);
    try {
        const clients = await tryQuery(db, `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
              "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Sconto", "Pagamento"
       FROM "TAnagrafica"
       WHERE "Cliente" = 1`);
        const clientsAlt = clients.length > 0
            ? clients
            : await tryQuery(db, `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
                    "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Sconto", "Pagamento"
             FROM "TAnagrafica"
             WHERE COALESCE("Cliente", 0) <> 0`);
        const suppliers = await tryQuery(db, `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
              "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Pagamento"
       FROM "TAnagrafica"
       WHERE "Fornitore" = 1`);
        const suppliersAlt = suppliers.length > 0
            ? suppliers
            : await tryQuery(db, `SELECT "CodAnagr", "Nome", "Indirizzo", "Cap", "Citta", "Prov", "PartitaIva", "CodFiscale",
                    "Telefono", "Cell", "Fax", "Email", "Internet", "Note", "Pagamento"
             FROM "TAnagrafica"
             WHERE COALESCE("Fornitore", 0) <> 0`);
        const products = await tryQuery(db, `SELECT "CodArticolo", "Desc", "PrezzoListino1", "PrezzoAcquisto", "Giacenza", "UM",
              "CodBarre", "Produttore", "Note", "Categoria", "Sottocategoria"
       FROM "TArticoli"`);
        const productsAlt = products.length > 0
            ? products
            : await tryQuery(db, `SELECT "CodArticolo", "Desc", "Prezzo", "PrezzoAcq", "Giacenza", "UM",
                    "CodBarre", "Produttore", "Note"
             FROM "TArticoli"`);
        const documents = await tryQuery(db, `SELECT t."IDDoc", t."NumDoc", t."Numeraz", t."DataDoc", t."DescDoc", t."TotDoc", t."TotNetto", t."TotIva",
              t."CodAnagr", t."Annullato", t."Pagamento", t."TipoDoc",
              td."Nome" AS "TipoDocNome", an."Nome" AS "SoggettoNome"
       FROM "TDocTestate" t
       LEFT JOIN "TTipiDoc" td ON t."TipoDoc" = td."TipoDoc"
       LEFT JOIN "TAnagrafica" an ON t."CodAnagr" = an."CodAnagr"`);
        const documentRows = await tryQuery(db, `SELECT r."IDDoc", r."CodArticolo", r."Desc", r."Qta", r."PrezzoNet", r."Prezzo", r."PrezzoIvato",
              r."Iva", r."Sconti", r."UM", r."IDDocIncluso"
       FROM "TDocRighe" r`);
        const documentRowsAlt = documentRows.length > 0
            ? documentRows
            : await tryQuery(db, `SELECT r."IDDoc", r."CodArticolo", r."Desc", r."Qta", r."Prezzo", r."Iva", r."Sconti", r."UM", r."IDDocIncluso"
             FROM "TDocRighe" r`);
        const documentLinks = await loadDocumentLinks(db);
        return {
            clients: clientsAlt,
            suppliers: suppliersAlt,
            products: productsAlt,
            documents,
            documentRows: documentRowsAlt,
            documentLinks,
        };
    }
    finally {
        await detach(db);
    }
}
async function testFirebirdConnection(databasePath) {
    try {
        await (0, firebirdServer_1.ensureFirebirdServer)();
        (0, firebirdServer_1.prepareDatabaseFile)(databasePath);
        const db = await attach(databasePath);
        await query(db, 'SELECT 1 FROM RDB$DATABASE');
        await detach(db);
        return true;
    }
    catch (err) {
        console.error('Firebird test connection failed:', err);
        return false;
    }
}
//# sourceMappingURL=firebirdClient.js.map