"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadClientDupIndex = loadClientDupIndex;
exports.loadSupplierDupIndex = loadSupplierDupIndex;
exports.resolveSubjectId = resolveSubjectId;
exports.importEasyfattExtract = importEasyfattExtract;
exports.countExtract = countExtract;
exports.isExtractEmpty = isExtractEmpty;
const firestore_1 = require("firebase-admin/firestore");
const firebirdClient_1 = require("./firebirdClient");
const batchWriter_1 = require("./batchWriter");
const documentMapping_1 = require("./documentMapping");
const db = (0, firestore_1.getFirestore)('fixlab');
const DUP_PAGE_SIZE = 400;
async function countStudioCollection(collectionName, studioId) {
    const snap = await db.collection(collectionName).where('studioId', '==', studioId).count().get();
    return snap.data().count;
}
async function paginateStudioCollection(collectionName, studioId, onDoc, orderField = 'createdAt') {
    let count = 0;
    let lastDoc;
    for (;;) {
        let q = db
            .collection(collectionName)
            .where('studioId', '==', studioId)
            .orderBy(orderField, 'desc')
            .limit(DUP_PAGE_SIZE);
        if (lastDoc)
            q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const d of snap.docs) {
            onDoc(d.id, d.data());
            count++;
        }
        if (snap.docs.length < DUP_PAGE_SIZE)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
    }
    return count;
}
async function loadClientDupIndex(studioId) {
    const index = {
        count: 0,
        vat: new Set(),
        code: new Set(),
        name: new Set(),
        codeToId: new Map(),
        nameToId: new Map(),
    };
    index.count = await paginateStudioCollection('clients', studioId, (id, c) => {
        const vat = String(c.vatNumber ?? '').toLowerCase();
        if (vat)
            index.vat.add(vat);
        if (c.code) {
            index.code.add(String(c.code));
            index.codeToId.set(String(c.code), id);
        }
        const name = String(c.name ?? '').toLowerCase();
        if (name) {
            index.name.add(name);
            index.nameToId.set(name, id);
        }
    });
    return index;
}
async function loadSupplierDupIndex(studioId) {
    const index = {
        count: 0,
        vat: new Set(),
        code: new Set(),
        name: new Set(),
        codeToId: new Map(),
        nameToId: new Map(),
    };
    index.count = await paginateStudioCollection('suppliers', studioId, (id, s) => {
        const vat = String(s.vatNumber ?? '').toLowerCase();
        if (vat)
            index.vat.add(vat);
        if (s.code) {
            index.code.add(String(s.code));
            index.codeToId.set(String(s.code), id);
        }
        const name = String(s.name ?? '').toLowerCase();
        if (name) {
            index.name.add(name);
            index.nameToId.set(name, id);
        }
    });
    return index;
}
async function loadProductDupIndex(studioId) {
    const index = { count: 0, code: new Set(), barcode: new Set() };
    index.count = await paginateStudioCollection('products', studioId, (_id, p) => {
        if (p.code)
            index.code.add(String(p.code));
        const barcode = String(p.barcode ?? '');
        if (barcode)
            index.barcode.add(barcode);
    });
    return index;
}
async function loadDocumentDupIndex(studioId) {
    const index = { count: 0, keys: new Set() };
    index.count = await paginateStudioCollection('documents', studioId, (_id, d) => {
        const type = String(d.type ?? '');
        const fullNumber = String(d.fullNumber ?? '');
        const year = Number(d.documentYear);
        if (type && fullNumber && Number.isFinite(year)) {
            index.keys.add(`${type}|${fullNumber}|${year}`);
        }
    });
    return index;
}
function registerClient(index, payload, id) {
    index.count++;
    const vat = String(payload.vatNumber ?? '').toLowerCase();
    if (vat)
        index.vat.add(vat);
    if (payload.code) {
        index.code.add(String(payload.code));
        if (id)
            index.codeToId.set(String(payload.code), id);
    }
    const name = String(payload.name ?? '').toLowerCase();
    if (name) {
        index.name.add(name);
        if (id)
            index.nameToId.set(name, id);
    }
}
function registerSupplier(index, payload, id) {
    index.count++;
    const vat = String(payload.vatNumber ?? '').toLowerCase();
    if (vat)
        index.vat.add(vat);
    if (payload.code) {
        index.code.add(String(payload.code));
        if (id)
            index.codeToId.set(String(payload.code), id);
    }
    const name = String(payload.name ?? '').toLowerCase();
    if (name) {
        index.name.add(name);
        if (id)
            index.nameToId.set(name, id);
    }
}
function registerProduct(index, payload) {
    index.count++;
    if (payload.code)
        index.code.add(String(payload.code));
    const barcode = String(payload.barcode ?? '');
    if (barcode)
        index.barcode.add(barcode);
}
function registerDocument(index, payload) {
    index.count++;
    const type = String(payload.type ?? '');
    const fullNumber = String(payload.fullNumber ?? '');
    const year = Number(payload.documentYear);
    if (type && fullNumber && Number.isFinite(year)) {
        index.keys.add(`${type}|${fullNumber}|${year}`);
    }
}
function tokens(...parts) {
    const set = new Set();
    for (const p of parts) {
        const s = (p ?? '').trim().toLowerCase();
        if (!s)
            continue;
        set.add(s);
        for (const w of s.split(/\s+/)) {
            if (w.length >= 2)
                set.add(w);
        }
    }
    return [...set];
}
function resolveSubjectId(subjectType, codAnagr, subjectName, clientIndex, supplierIndex) {
    const code = codAnagr.trim();
    if (code) {
        const byCode = subjectType === 'client' ? clientIndex.codeToId.get(code) : supplierIndex.codeToId.get(code);
        if (byCode)
            return byCode;
    }
    const name = subjectName.trim().toLowerCase();
    if (!name)
        return undefined;
    return subjectType === 'client' ? clientIndex.nameToId.get(name) : supplierIndex.nameToId.get(name);
}
async function importEasyfattExtract(studioId, data, options, updateJob) {
    const result = {
        imported: { clients: 0, suppliers: 0, products: 0, documents: 0 },
        skipped: { clients: 0, suppliers: 0, products: 0, documents: 0 },
        errors: [],
    };
    const needsDupCheck = options.skipDuplicates;
    await updateJob({ status: 'running', message: 'Caricamento indice duplicati esistenti…' });
    const needClientIndex = options.importDocuments || options.importClients;
    const needSupplierIndex = options.importDocuments || options.importSuppliers;
    const [clientIndex, supplierIndex, productIndex, documentIndex,] = await Promise.all([
        needClientIndex
            ? loadClientDupIndex(studioId)
            : Promise.resolve({
                count: 0,
                vat: new Set(),
                code: new Set(),
                name: new Set(),
                codeToId: new Map(),
                nameToId: new Map(),
            }),
        needSupplierIndex
            ? loadSupplierDupIndex(studioId)
            : Promise.resolve({
                count: 0,
                vat: new Set(),
                code: new Set(),
                name: new Set(),
                codeToId: new Map(),
                nameToId: new Map(),
            }),
        options.importProducts
            ? needsDupCheck
                ? loadProductDupIndex(studioId)
                : countStudioCollection('products', studioId).then(count => ({
                    count,
                    code: new Set(),
                    barcode: new Set(),
                }))
            : Promise.resolve({ count: 0, code: new Set(), barcode: new Set() }),
        options.importDocuments
            ? needsDupCheck
                ? loadDocumentDupIndex(studioId)
                : countStudioCollection('documents', studioId).then(count => ({
                    count,
                    keys: new Set(),
                }))
            : Promise.resolve({ count: 0, keys: new Set() }),
    ]);
    const dupClient = (vat, code, name) => {
        if (!needsDupCheck)
            return false;
        const v = vat.toLowerCase();
        const n = name.toLowerCase();
        if (v && clientIndex.vat.has(v))
            return true;
        if (code && clientIndex.code.has(code))
            return true;
        if (n && clientIndex.name.has(n))
            return true;
        return false;
    };
    const dupSupplier = (vat, code, name) => {
        if (!needsDupCheck)
            return false;
        const v = vat.toLowerCase();
        const n = name.toLowerCase();
        if (v && supplierIndex.vat.has(v))
            return true;
        if (code && supplierIndex.code.has(code))
            return true;
        if (n && supplierIndex.name.has(n))
            return true;
        return false;
    };
    const dupProduct = (code, barcode) => {
        if (!needsDupCheck)
            return false;
        if (code && productIndex.code.has(code))
            return true;
        if (barcode && productIndex.barcode.has(barcode))
            return true;
        return false;
    };
    const dupDoc = (type, fullNumber, year) => needsDupCheck && documentIndex.keys.has(`${type}|${fullNumber}|${year}`);
    const total = (options.importClients ? data.clients.length : 0) +
        (options.importSuppliers ? data.suppliers.length : 0) +
        (options.importProducts ? data.products.length : 0) +
        (options.importDocuments ? data.documents.length : 0);
    let done = 0;
    const writer = new batchWriter_1.AdminBatchWriter();
    const tick = async (phase, message, force = false) => {
        if (!force && done > 0 && done % batchWriter_1.IMPORT_PROGRESS_EVERY !== 0 && done !== total)
            return;
        await updateJob({ status: 'running', phase, done, total, message });
    };
    if (options.importClients) {
        for (const row of data.clients) {
            try {
                const code = (0, firebirdClient_1.str)(row.CodAnagr);
                const name = (0, firebirdClient_1.str)(row.Nome);
                if (!name) {
                    result.skipped.clients++;
                    done++;
                    continue;
                }
                if (options.skipDuplicates && dupClient((0, firebirdClient_1.str)(row.PartitaIva), code, name)) {
                    result.skipped.clients++;
                    done++;
                    continue;
                }
                const payload = {
                    studioId,
                    code: code || String(clientIndex.count + 1).padStart(4, '0'),
                    type: 'client',
                    name,
                    phone: (0, firebirdClient_1.str)(row.Telefono) || undefined,
                    cellPhone: (0, firebirdClient_1.str)(row.Cell) || undefined,
                    fax: (0, firebirdClient_1.str)(row.Fax) || undefined,
                    email: (0, firebirdClient_1.str)(row.Email) || undefined,
                    vatNumber: (0, firebirdClient_1.str)(row.PartitaIva) || undefined,
                    fiscalCode: (0, firebirdClient_1.str)(row.CodFiscale) || undefined,
                    address: (0, firebirdClient_1.str)(row.Indirizzo) || undefined,
                    city: (0, firebirdClient_1.str)(row.Citta) || undefined,
                    province: (0, firebirdClient_1.str)(row.Prov) || undefined,
                    cap: (0, firebirdClient_1.str)(row.Cap) || undefined,
                    nation: 'Italia',
                    paymentMethod: (0, firebirdClient_1.str)(row.Pagamento) || undefined,
                    notes: (0, firebirdClient_1.str)(row.Note) || undefined,
                    searchTokens: tokens(code, name, (0, firebirdClient_1.str)(row.PartitaIva), (0, firebirdClient_1.str)(row.Email)),
                    totalSpent: 0,
                    repairsCount: 0,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                };
                const id = await writer.set('clients', payload);
                registerClient(clientIndex, payload, id);
                result.imported.clients++;
            }
            catch (err) {
                result.errors.push(`Cliente: ${err instanceof Error ? err.message : 'errore'}`);
            }
            done++;
            await tick('clients', `Clienti ${done}/${total}`);
        }
        await writer.flush();
    }
    if (options.importSuppliers) {
        for (const row of data.suppliers) {
            try {
                const code = (0, firebirdClient_1.str)(row.CodAnagr);
                const name = (0, firebirdClient_1.str)(row.Nome);
                if (!name) {
                    result.skipped.suppliers++;
                    done++;
                    continue;
                }
                if (options.skipDuplicates && dupSupplier((0, firebirdClient_1.str)(row.PartitaIva), code, name)) {
                    result.skipped.suppliers++;
                    done++;
                    continue;
                }
                const payload = {
                    studioId,
                    code: code || String(supplierIndex.count + 1).padStart(4, '0'),
                    name,
                    phone: (0, firebirdClient_1.str)(row.Telefono) || undefined,
                    cellPhone: (0, firebirdClient_1.str)(row.Cell) || undefined,
                    email: (0, firebirdClient_1.str)(row.Email) || undefined,
                    vatNumber: (0, firebirdClient_1.str)(row.PartitaIva) || undefined,
                    fiscalCode: (0, firebirdClient_1.str)(row.CodFiscale) || undefined,
                    address: (0, firebirdClient_1.str)(row.Indirizzo) || undefined,
                    city: (0, firebirdClient_1.str)(row.Citta) || undefined,
                    province: (0, firebirdClient_1.str)(row.Prov) || undefined,
                    cap: (0, firebirdClient_1.str)(row.Cap) || undefined,
                    paymentMethod: (0, firebirdClient_1.str)(row.Pagamento) || undefined,
                    notes: (0, firebirdClient_1.str)(row.Note) || undefined,
                    searchTokens: tokens(code, name, (0, firebirdClient_1.str)(row.PartitaIva)),
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                };
                const id = await writer.set('suppliers', payload);
                registerSupplier(supplierIndex, payload, id);
                result.imported.suppliers++;
            }
            catch (err) {
                result.errors.push(`Fornitore: ${err instanceof Error ? err.message : 'errore'}`);
            }
            done++;
            await tick('suppliers', `Fornitori ${done}/${total}`);
        }
        await writer.flush();
    }
    if (options.importProducts) {
        for (const row of data.products) {
            try {
                const code = (0, firebirdClient_1.str)(row.CodArticolo);
                const name = (0, firebirdClient_1.str)(row.Desc);
                if (!name) {
                    result.skipped.products++;
                    done++;
                    continue;
                }
                const barcode = (0, firebirdClient_1.str)(row.CodBarre);
                if (options.skipDuplicates && dupProduct(code, barcode)) {
                    result.skipped.products++;
                    done++;
                    continue;
                }
                const price = (0, firebirdClient_1.num)(row.PrezzoListino1 ?? row.Prezzo);
                const stock = (0, firebirdClient_1.num)(row.Giacenza);
                const payload = {
                    studioId,
                    code: code || String(productIndex.count + 1).padStart(4, '0'),
                    name,
                    barcode: barcode || undefined,
                    brand: (0, firebirdClient_1.str)(row.Produttore) || undefined,
                    categoryName: (0, firebirdClient_1.str)(row.Categoria) || undefined,
                    typology: 'with_stock',
                    unitOfMeasure: (0, firebirdClient_1.str)(row.UM) || 'pz',
                    price,
                    prices: { privati: price },
                    stock,
                    notes: (0, firebirdClient_1.str)(row.Note) || undefined,
                    searchTokens: tokens(code, name, barcode),
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                };
                await writer.set('products', payload);
                registerProduct(productIndex, payload);
                result.imported.products++;
            }
            catch (err) {
                result.errors.push(`Prodotto: ${err instanceof Error ? err.message : 'errore'}`);
            }
            done++;
            await tick('products', `Prodotti ${done}/${total}`);
        }
        await writer.flush();
    }
    if (options.importDocuments) {
        const docLinks = (0, documentMapping_1.mergeDocumentLinks)(data.documentLinks);
        const importedDocs = [];
        const docMeta = new Map();
        for (const row of data.documents) {
            const idDoc = (0, firebirdClient_1.num)(row.IDDoc);
            if (idDoc <= 0)
                continue;
            docMeta.set(idDoc, {
                date: (0, documentMapping_1.parseDocDate)(row.DataDoc),
                type: (0, documentMapping_1.mapDocType)((0, firebirdClient_1.str)(row.TipoDocNome), (0, firebirdClient_1.str)(row.TipoDoc)),
            });
        }
        for (const row of data.documents) {
            try {
                const idDoc = (0, firebirdClient_1.num)(row.IDDoc);
                const typeLabel = (0, firebirdClient_1.str)(row.TipoDocNome);
                const type = (0, documentMapping_1.mapDocType)(typeLabel, (0, firebirdClient_1.str)(row.TipoDoc));
                const number = Math.round((0, firebirdClient_1.num)(row.NumDoc));
                const date = (0, documentMapping_1.parseDocDate)(row.DataDoc);
                const numeraz = (0, firebirdClient_1.str)(row.Numeraz);
                const year = (0, documentMapping_1.docYear)(date);
                const fullNumber = (0, documentMapping_1.buildFullNumber)(number, date, numeraz);
                const subjectName = (0, firebirdClient_1.str)(row.SoggettoNome) || '—';
                const subjectType = (0, documentMapping_1.isPurchaseType)(type) ? 'supplier' : 'client';
                if (options.skipDuplicates && dupDoc(type, fullNumber, year)) {
                    result.skipped.documents++;
                    done++;
                    continue;
                }
                const totalDocument = (0, firebirdClient_1.num)(row.TotDoc);
                const totalNet = (0, firebirdClient_1.num)(row.TotNetto) || totalDocument;
                const totalVat = (0, firebirdClient_1.num)(row.TotIva);
                let rows = (0, documentMapping_1.rowsForDocument)(idDoc, data.documentRows);
                if (rows.length === 0) {
                    rows = (0, documentMapping_1.fallbackRows)(totalDocument, totalNet, totalVat);
                }
                const codAnagr = (0, firebirdClient_1.str)(row.CodAnagr);
                const subjectId = resolveSubjectId(subjectType, codAnagr, subjectName, clientIndex, supplierIndex);
                const cancelled = (0, documentMapping_1.isTruthyFlag)(row.Annullato);
                const hasConclusion = idDoc > 0 && Boolean((0, documentMapping_1.pickPrimaryConclusionLink)(idDoc, docLinks, docMeta));
                const status = (0, documentMapping_1.resolveImportedStatus)(cancelled, hasConclusion);
                const payload = {
                    studioId,
                    type,
                    number,
                    numbering: numeraz || undefined,
                    fullNumber,
                    date,
                    documentYear: year,
                    subjectType,
                    subjectId,
                    subjectName,
                    rows,
                    totalNet,
                    totalVat,
                    totalDocument,
                    paymentMethod: (0, firebirdClient_1.str)(row.Pagamento) || undefined,
                    status,
                    stockCommitted: true,
                    internalNotes: 'Importato da Danea Easyfatt (.bef)',
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                };
                const firestoreId = await writer.set('documents', payload);
                registerDocument(documentIndex, payload);
                result.imported.documents++;
                if (idDoc > 0) {
                    importedDocs.push({ idDoc, firestoreId, type, date });
                }
            }
            catch (err) {
                result.errors.push(`Documento: ${err instanceof Error ? err.message : 'errore'}`);
            }
            done++;
            await tick('documents', `Documenti ${done}/${total}`);
        }
        await writer.flush();
        await updateJob({ status: 'running', phase: 'documents', message: 'Collegamento ordini e conclusioni…' });
        const idDocToFirestore = new Map(importedDocs.map(d => [d.idDoc, d.firestoreId]));
        const typeByIdDoc = new Map(importedDocs.map(d => [d.idDoc, d.type]));
        for (const { idDoc, firestoreId } of importedDocs) {
            const link = (0, documentMapping_1.pickPrimaryConclusionLink)(idDoc, docLinks, docMeta);
            if (!link)
                continue;
            const destFirestoreId = idDocToFirestore.get(link.destIdDoc);
            if (!destFirestoreId)
                continue;
            const destType = typeByIdDoc.get(link.destIdDoc) || docMeta.get(link.destIdDoc)?.type;
            const sourceType = typeByIdDoc.get(idDoc) || docMeta.get(idDoc)?.type;
            if (!destType || !sourceType)
                continue;
            try {
                await writer.update('documents', firestoreId, {
                    linkedDocumentId: destFirestoreId,
                    linkedDocumentType: destType,
                    status: 'completed',
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                await writer.update('documents', destFirestoreId, {
                    linkedDocumentId: firestoreId,
                    linkedDocumentType: sourceType,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            catch (err) {
                result.errors.push(`Collegamento doc ${idDoc}: ${err instanceof Error ? err.message : 'errore'}`);
            }
        }
        await writer.flush();
    }
    await tick('done', 'Importazione completata.', true);
    return result;
}
function countExtract(data) {
    return {
        clients: data.clients.length,
        suppliers: data.suppliers.length,
        products: data.products.length,
        documents: data.documents.length,
    };
}
function isExtractEmpty(data) {
    const c = countExtract(data);
    return c.clients + c.suppliers + c.products + c.documents === 0;
}
//# sourceMappingURL=importRunner.js.map