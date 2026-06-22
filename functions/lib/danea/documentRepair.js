"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocumentIdIndex = buildDocumentIdIndex;
exports.repairDocumentsInFirestore = repairDocumentsInFirestore;
exports.repairDocumentsFromExtract = repairDocumentsFromExtract;
exports.mapFirestoreDoc = mapFirestoreDoc;
const firestore_1 = require("firebase-admin/firestore");
const documentMapping_1 = require("./documentMapping");
const firebirdClient_1 = require("./firebirdClient");
const importRunner_1 = require("./importRunner");
const CONCLUSION_TYPES = {
    preventivo: ['ordine_cliente', 'ddt', 'rapporto_intervento', 'fattura', 'vendita_banco'],
    ordine_cliente: ['ddt', 'rapporto_intervento', 'fattura', 'fattura_accomp', 'fattura_acconto', 'fattura_proforma', 'vendita_banco'],
    preventivo_fornitore: ['ordine_fornitore', 'arrivo_merce'],
    ordine_fornitore: ['arrivo_merce'],
    ddt: ['fattura', 'fattura_accomp', 'fattura_acconto', 'vendita_banco'],
    rapporto_intervento: ['ddt', 'fattura', 'fattura_accomp'],
    arrivo_merce: ['reg_fattura_fornitore'],
};
function documentMatchKeys(type, number, date, numeraz) {
    const year = (0, documentMapping_1.docYear)(date);
    const keys = new Set();
    keys.add(`${type}|${(0, documentMapping_1.buildFullNumber)(number, date, numeraz)}|${year}`);
    keys.add(`${type}|${number}/${year}|${year}`);
    if (numeraz)
        keys.add(`${type}|${number}/${numeraz}|${year}`);
    return [...keys];
}
function buildDocumentIdIndex(docs) {
    const index = new Map();
    for (const doc of docs) {
        const year = doc.documentYear ?? (0, documentMapping_1.docYear)(doc.date);
        index.set(`${doc.type}|${doc.fullNumber}|${year}`, doc.id);
        index.set(`${doc.type}|${doc.number}/${year}|${year}`, doc.id);
        if (doc.fullNumber.includes('/')) {
            const suffix = doc.fullNumber.split('/').slice(1).join('/');
            if (suffix && suffix !== String(year)) {
                index.set(`${doc.type}|${doc.number}/${suffix}|${year}`, doc.id);
            }
        }
    }
    return index;
}
function docReferencesSource(child, source) {
    const needles = [
        source.fullNumber,
        `Ordine cliente ${source.number}`,
        `ordine cliente ${source.number}`,
        `Ordine fornitore ${source.number}`,
        `Rif. ${source.fullNumber}`,
        `** Rif.`,
        String(source.number),
    ]
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);
    const haystack = [
        child.internalNotes ?? '',
        ...(child.rows ?? []).map(r => r.description ?? ''),
    ]
        .join('\n')
        .toLowerCase();
    return needles.some(n => haystack.includes(n));
}
function scoreConclusion(source, candidate) {
    if (candidate.id === source.id)
        return -1;
    if (candidate.status === 'cancelled')
        return -1;
    if (source.subjectId && candidate.subjectId && source.subjectId !== candidate.subjectId)
        return -1;
    if (source.subjectId && candidate.subjectId && source.subjectId === candidate.subjectId) {
        // ok
    }
    else if (source.subjectName.trim().toLowerCase() !== candidate.subjectName.trim().toLowerCase()) {
        return -1;
    }
    let score = 0;
    if (docReferencesSource(candidate, source))
        score += 120;
    if (candidate.linkedDocumentId === source.id)
        score += 100;
    if (source.linkedDocumentId === candidate.id)
        score += 100;
    if (candidate.date >= source.date)
        score += 15;
    else
        score -= 20;
    const diff = Math.abs((candidate.totalDocument || 0) - (source.totalDocument || 0));
    const base = Math.max(source.totalDocument || 0, 1);
    if (diff < 0.02)
        score += 35;
    else if (diff / base < 0.05)
        score += 20;
    else if (diff / base < 0.15)
        score += 5;
    return score;
}
function pickConclusionCandidate(source, allDocs) {
    const allowed = CONCLUSION_TYPES[source.type];
    if (!allowed?.length)
        return undefined;
    if (source.status === 'cancelled')
        return undefined;
    const scored = allDocs
        .filter(d => allowed.includes(d.type))
        .map(d => ({ doc: d, score: scoreConclusion(source, d) }))
        .filter(x => x.score >= 25)
        .sort((a, b) => b.score - a.score);
    return scored[0]?.doc;
}
async function repairDocumentsInFirestore(docs, clientIndex, supplierIndex, writer) {
    const result = {
        subjectsLinked: 0,
        documentLinks: 0,
        statusesUpdated: 0,
        documentsUpdated: 0,
        errors: [],
    };
    const byId = new Map(docs.map(d => [d.id, d]));
    for (const doc of docs) {
        if (doc.subjectId || !doc.subjectName?.trim())
            continue;
        const subjectType = doc.subjectType === 'supplier' ? 'supplier' : 'client';
        const subjectId = (0, importRunner_1.resolveSubjectId)(subjectType, '', doc.subjectName, clientIndex, supplierIndex);
        if (!subjectId)
            continue;
        try {
            await writer.update('documents', doc.id, {
                subjectId,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            doc.subjectId = subjectId;
            result.subjectsLinked++;
            result.documentsUpdated++;
        }
        catch (err) {
            result.errors.push(`Cliente/fornitore ${doc.fullNumber}: ${err instanceof Error ? err.message : 'errore'}`);
        }
    }
    const linkedPairs = new Set();
    for (const source of docs) {
        if (source.status === 'cancelled')
            continue;
        let dest;
        if (source.linkedDocumentId) {
            dest = byId.get(source.linkedDocumentId);
        }
        if (!dest) {
            dest = pickConclusionCandidate(source, docs);
        }
        if (!dest || dest.id === source.id)
            continue;
        const pairKey = [source.id, dest.id].sort().join('|');
        if (linkedPairs.has(pairKey))
            continue;
        linkedPairs.add(pairKey);
        try {
            const sourcePatch = {
                linkedDocumentId: dest.id,
                linkedDocumentType: dest.type,
                status: 'completed',
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            };
            await writer.update('documents', source.id, sourcePatch);
            source.linkedDocumentId = dest.id;
            source.linkedDocumentType = dest.type;
            source.status = 'completed';
            result.documentLinks++;
            result.statusesUpdated++;
            result.documentsUpdated++;
            if (!dest.linkedDocumentId || dest.linkedDocumentId === source.id) {
                await writer.update('documents', dest.id, {
                    linkedDocumentId: source.id,
                    linkedDocumentType: source.type,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                dest.linkedDocumentId = source.id;
                dest.linkedDocumentType = source.type;
                result.documentsUpdated++;
            }
        }
        catch (err) {
            result.errors.push(`Collegamento ${source.fullNumber}: ${err instanceof Error ? err.message : 'errore'}`);
        }
    }
    await writer.flush();
    return result;
}
async function repairDocumentsFromExtract(data, existingDocs, clientIndex, supplierIndex, writer) {
    const result = {
        subjectsLinked: 0,
        documentLinks: 0,
        statusesUpdated: 0,
        documentsUpdated: 0,
        errors: [],
    };
    const idIndex = buildDocumentIdIndex(existingDocs);
    const docLinks = (0, documentMapping_1.mergeDocumentLinks)(data.documentLinks);
    const docMeta = new Map();
    const idDocToFirestore = new Map();
    for (const row of data.documents) {
        const idDoc = (0, firebirdClient_1.num)(row.IDDoc);
        if (idDoc <= 0)
            continue;
        const type = (0, documentMapping_1.mapDocType)((0, firebirdClient_1.str)(row.TipoDocNome), (0, firebirdClient_1.str)(row.TipoDoc));
        const date = (0, documentMapping_1.parseDocDate)(row.DataDoc);
        docMeta.set(idDoc, { date, type });
    }
    for (const row of data.documents) {
        try {
            const idDoc = (0, firebirdClient_1.num)(row.IDDoc);
            const type = (0, documentMapping_1.mapDocType)((0, firebirdClient_1.str)(row.TipoDocNome), (0, firebirdClient_1.str)(row.TipoDoc));
            const number = Math.round((0, firebirdClient_1.num)(row.NumDoc));
            const date = (0, documentMapping_1.parseDocDate)(row.DataDoc);
            const numeraz = (0, firebirdClient_1.str)(row.Numeraz);
            const keys = documentMatchKeys(type, number, date, numeraz);
            let firestoreId;
            for (const key of keys) {
                firestoreId = idIndex.get(key);
                if (firestoreId)
                    break;
            }
            if (!firestoreId)
                continue;
            const subjectType = (0, documentMapping_1.isPurchaseType)(type) ? 'supplier' : 'client';
            const subjectName = (0, firebirdClient_1.str)(row.SoggettoNome) || '—';
            const codAnagr = (0, firebirdClient_1.str)(row.CodAnagr);
            const subjectId = (0, importRunner_1.resolveSubjectId)(subjectType, codAnagr, subjectName, clientIndex, supplierIndex);
            const totalDocument = (0, firebirdClient_1.num)(row.TotDoc);
            const totalNet = (0, firebirdClient_1.num)(row.TotNetto) || totalDocument;
            const totalVat = (0, firebirdClient_1.num)(row.TotIva);
            let rows = (0, documentMapping_1.rowsForDocument)(idDoc, data.documentRows);
            if (rows.length === 0)
                rows = (0, documentMapping_1.fallbackRows)(totalDocument, totalNet, totalVat);
            const cancelled = (0, documentMapping_1.isTruthyFlag)(row.Annullato);
            const hasConclusion = idDoc > 0 && Boolean((0, documentMapping_1.pickPrimaryConclusionLink)(idDoc, docLinks, docMeta));
            const status = (0, documentMapping_1.resolveImportedStatus)(cancelled, hasConclusion);
            const patch = {
                rows,
                totalNet,
                totalVat,
                totalDocument,
                status,
                fullNumber: (0, documentMapping_1.buildFullNumber)(number, date, numeraz),
                numbering: numeraz || undefined,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            };
            if (subjectId)
                patch.subjectId = subjectId;
            await writer.update('documents', firestoreId, patch);
            result.documentsUpdated++;
            if (subjectId)
                result.subjectsLinked++;
            if (status === 'completed')
                result.statusesUpdated++;
            if (idDoc > 0)
                idDocToFirestore.set(idDoc, firestoreId);
        }
        catch (err) {
            result.errors.push(`Aggiornamento: ${err instanceof Error ? err.message : 'errore'}`);
        }
    }
    await writer.flush();
    for (const row of data.documents) {
        const idDoc = (0, firebirdClient_1.num)(row.IDDoc);
        if (idDoc <= 0)
            continue;
        const firestoreId = idDocToFirestore.get(idDoc);
        if (!firestoreId)
            continue;
        const link = (0, documentMapping_1.pickPrimaryConclusionLink)(idDoc, docLinks, docMeta);
        if (!link)
            continue;
        const destFirestoreId = idDocToFirestore.get(link.destIdDoc);
        if (!destFirestoreId)
            continue;
        const destType = docMeta.get(link.destIdDoc)?.type;
        const sourceType = docMeta.get(idDoc)?.type;
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
            result.documentLinks++;
            result.statusesUpdated++;
            result.documentsUpdated += 2;
        }
        catch (err) {
            result.errors.push(`Link ${idDoc}: ${err instanceof Error ? err.message : 'errore'}`);
        }
    }
    await writer.flush();
    return result;
}
function mapFirestoreDoc(id, data) {
    return {
        id,
        type: String(data.type ?? ''),
        status: String(data.status ?? 'confirmed'),
        date: String(data.date ?? ''),
        number: Number(data.number ?? 0),
        fullNumber: String(data.fullNumber ?? ''),
        documentYear: Number(data.documentYear) || undefined,
        subjectId: data.subjectId ? String(data.subjectId) : undefined,
        subjectType: data.subjectType === 'supplier' ? 'supplier' : 'client',
        subjectName: String(data.subjectName ?? ''),
        totalDocument: Number(data.totalDocument ?? 0),
        linkedDocumentId: data.linkedDocumentId ? String(data.linkedDocumentId) : undefined,
        linkedDocumentType: data.linkedDocumentType ? String(data.linkedDocumentType) : undefined,
        rows: Array.isArray(data.rows) ? data.rows : [],
        internalNotes: data.internalNotes ? String(data.internalNotes) : undefined,
    };
}
//# sourceMappingURL=documentRepair.js.map