"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDocType = mapDocType;
exports.parseDocDate = parseDocDate;
exports.docYear = docYear;
exports.buildFullNumber = buildFullNumber;
exports.isPurchaseType = isPurchaseType;
exports.isTruthyFlag = isTruthyFlag;
exports.mapDocumentRow = mapDocumentRow;
exports.rowsForDocument = rowsForDocument;
exports.fallbackRows = fallbackRows;
exports.mergeDocumentLinks = mergeDocumentLinks;
exports.pickPrimaryConclusionLink = pickPrimaryConclusionLink;
exports.resolveImportedStatus = resolveImportedStatus;
const node_crypto_1 = require("node:crypto");
const firebirdClient_1 = require("./firebirdClient");
const PURCHASE_TYPES = new Set([
    'ordine_fornitore',
    'arrivo_merce',
    'reg_fattura_fornitore',
    'preventivo_fornitore',
]);
function mapDocType(raw, tipoDocCode) {
    const label = raw.trim();
    const code = (tipoDocCode ?? '').trim().toUpperCase();
    const codeMap = {
        A: 'fattura_acconto',
        B: 'vendita_banco',
        C: 'ordine_cliente',
        D: 'ddt',
        E: 'ordine_fornitore',
        F: 'fattura_accomp',
        G: 'rapporto_intervento',
        H: 'arrivo_merce',
        I: 'fattura',
        J: 'fattura_acconto',
        L: 'fattura_proforma',
        Q: 'preventivo',
        R: 'vendita_banco',
        S: 'preventivo_fornitore',
    };
    if (code && codeMap[code])
        return codeMap[code];
    const rules = [
        [/preventivo\s*fornit/i, 'preventivo_fornitore'],
        [/ordine\s*fornit/i, 'ordine_fornitore'],
        [/arrivo\s*merce/i, 'arrivo_merce'],
        [/reg\.?\s*fatt/i, 'reg_fattura_fornitore'],
        [/vendita\s*(al\s*)?banco/i, 'vendita_banco'],
        [/fattura\s*pro[- ]?forma/i, 'fattura_proforma'],
        [/fattura\s*d['']?acconto/i, 'fattura_acconto'],
        [/fattura\s*accomp/i, 'fattura_accomp'],
        [/rapporto\s*d['']?intervento/i, 'rapporto_intervento'],
        [/conferma\s*d['']?ordine/i, 'conferma_ordine'],
        [/ordine\s*cliente/i, 'ordine_cliente'],
        [/doc\.?\s*di\s*trasporto|^ddt$/i, 'ddt'],
        [/^preventivo$/i, 'preventivo'],
        [/^fattura$/i, 'fattura'],
    ];
    for (const [re, type] of rules) {
        if (re.test(label))
            return type;
    }
    return 'preventivo';
}
function parseDocDate(raw) {
    if (raw instanceof Date)
        return raw.toISOString().slice(0, 10);
    const s = (0, firebirdClient_1.str)(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
        return s.slice(0, 10);
    const it = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (it) {
        const y = it[3].length === 2 ? `20${it[3]}` : it[3];
        return `${y}-${it[2].padStart(2, '0')}-${it[1].padStart(2, '0')}`;
    }
    return new Date().toISOString().slice(0, 10);
}
function docYear(date) {
    const y = Number(date.slice(0, 4));
    return Number.isFinite(y) ? y : new Date().getFullYear();
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function buildFullNumber(number, date, numeraz) {
    const suffix = (0, firebirdClient_1.str)(numeraz);
    if (suffix)
        return `${number}/${suffix}`;
    return `${number}/${docYear(date)}`;
}
function isPurchaseType(type) {
    return PURCHASE_TYPES.has(type);
}
function isTruthyFlag(raw) {
    if (raw === true)
        return true;
    if (raw === false || raw == null)
        return false;
    const n = (0, firebirdClient_1.num)(raw);
    if (n !== 0)
        return true;
    const s = (0, firebirdClient_1.str)(raw).toLowerCase();
    return s === 't' || s === 'true' || s === 's' || s === 'si' || s === 'sì' || s === '1';
}
function mapDocumentRow(row) {
    const description = (0, firebirdClient_1.str)(row.Desc ?? row.Descrizione ?? row.Description);
    if (!description)
        return null;
    const qty = (0, firebirdClient_1.num)(row.Qta) || 1;
    const vatRate = (0, firebirdClient_1.num)(row.Iva) || 22;
    const discount = (0, firebirdClient_1.num)(row.Sconti ?? row.Sconto);
    let unitPrice = (0, firebirdClient_1.num)(row.PrezzoNet ?? row.Prezzo);
    const grossUnit = (0, firebirdClient_1.num)(row.PrezzoIvato);
    if (!unitPrice && grossUnit > 0)
        unitPrice = round2(grossUnit / (1 + vatRate / 100));
    const totalNet = round2(unitPrice * qty * (1 - discount / 100));
    const total = round2(totalNet * (1 + vatRate / 100));
    const code = (0, firebirdClient_1.str)(row.CodArticolo);
    return {
        id: (0, node_crypto_1.randomUUID)(),
        productCode: code || undefined,
        description,
        quantity: qty,
        unitOfMeasure: (0, firebirdClient_1.str)(row.UM) || 'pz',
        unitPrice,
        discount: discount || undefined,
        vatRate,
        totalNet,
        total,
    };
}
function rowsForDocument(idDoc, allRows) {
    return allRows
        .filter(r => (0, firebirdClient_1.num)(r.IDDoc) === idDoc)
        .map(mapDocumentRow)
        .filter((r) => r != null);
}
function fallbackRows(totalDocument, totalNet, totalVat) {
    if (totalDocument <= 0 && totalNet <= 0) {
        return [
            {
                id: (0, node_crypto_1.randomUUID)(),
                description: 'Import Danea — documento senza righe',
                quantity: 1,
                unitOfMeasure: 'pz',
                unitPrice: 0,
                vatRate: 22,
                totalNet: 0,
                total: 0,
            },
        ];
    }
    const net = totalNet > 0 ? totalNet : round2(totalDocument - totalVat);
    const gross = totalDocument > 0 ? totalDocument : round2(net + totalVat);
    return [
        {
            id: (0, node_crypto_1.randomUUID)(),
            description: 'Import Danea — totale documento',
            quantity: 1,
            unitOfMeasure: 'pz',
            unitPrice: net,
            vatRate: gross > net ? round2(((gross - net) / net) * 100) : 22,
            totalNet: net,
            total: gross,
        },
    ];
}
function mergeDocumentLinks(...groups) {
    const seen = new Set();
    const out = [];
    for (const group of groups) {
        for (const link of group) {
            if (!link.destIdDoc || !link.sourceIdDoc || link.destIdDoc === link.sourceIdDoc)
                continue;
            const key = `${link.destIdDoc}|${link.sourceIdDoc}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push(link);
        }
    }
    return out;
}
function pickPrimaryConclusionLink(sourceIdDoc, links, docMeta) {
    const candidates = links.filter(l => l.sourceIdDoc === sourceIdDoc);
    if (!candidates.length)
        return undefined;
    const priority = (type) => {
        if (type === 'fattura' || type === 'fattura_accomp')
            return 100;
        if (type === 'vendita_banco')
            return 90;
        if (type === 'ddt' || type === 'rapporto_intervento')
            return 80;
        if (type === 'arrivo_merce')
            return 80;
        if (type === 'reg_fattura_fornitore')
            return 70;
        if (type === 'fattura_proforma' || type === 'fattura_acconto')
            return 60;
        return 10;
    };
    return [...candidates].sort((a, b) => {
        const da = docMeta.get(a.destIdDoc);
        const db = docMeta.get(b.destIdDoc);
        const pa = da ? priority(da.type) : 0;
        const pb = db ? priority(db.type) : 0;
        if (pa !== pb)
            return pb - pa;
        const dateA = da?.date ?? '';
        const dateB = db?.date ?? '';
        return dateB.localeCompare(dateA);
    })[0];
}
function resolveImportedStatus(cancelled, hasConclusion) {
    if (cancelled)
        return 'cancelled';
    if (hasConclusion)
        return 'completed';
    return 'confirmed';
}
//# sourceMappingURL=documentMapping.js.map