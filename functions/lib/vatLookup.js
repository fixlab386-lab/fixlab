"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupVat = void 0;
const https_1 = require("firebase-functions/v2/https");
const VIES_ENDPOINT = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';
const REQUEST_TIMEOUT_MS = 12_000;
/** Normalizza la P.IVA: rimuove spazi/punti e separa eventuale prefisso nazione. */
function splitVatNumber(raw) {
    const cleaned = String(raw || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    const prefixMatch = cleaned.match(/^([A-Z]{2})(\d.*)$/);
    if (prefixMatch) {
        return { countryCode: prefixMatch[1], vatNumber: prefixMatch[2] };
    }
    return { countryCode: 'IT', vatNumber: cleaned };
}
/** Estrae indirizzo / CAP / città / provincia dall'indirizzo testuale VIES (formato italiano). */
function parseItalianAddress(raw) {
    const text = String(raw || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text)
        return {};
    const capMatch = text.match(/\b(\d{5})\b/);
    if (!capMatch || capMatch.index === undefined) {
        return { address: text };
    }
    const cap = capMatch[1];
    const address = text
        .slice(0, capMatch.index)
        .replace(/[,;\s]+$/, '')
        .trim();
    let after = text.slice(capMatch.index + cap.length).trim();
    let province;
    const provMatch = after.match(/\b([A-Z]{2})\b\s*$/);
    if (provMatch && provMatch.index !== undefined) {
        province = provMatch[1];
        after = after.slice(0, provMatch.index).trim();
    }
    const city = after.replace(/[,;\s]+$/, '').trim();
    return {
        address: address || undefined,
        cap,
        city: city || undefined,
        province,
    };
}
async function queryVies(countryCode, vatNumber) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(VIES_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ countryCode, vatNumber }),
            signal: controller.signal,
        });
        if (!res.ok) {
            throw new https_1.HttpsError('unavailable', 'Servizio di verifica P.IVA non raggiungibile. Riprova più tardi.');
        }
        return (await res.json());
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('unavailable', 'Verifica P.IVA non riuscita: servizio non raggiungibile.');
    }
    finally {
        clearTimeout(timeout);
    }
}
exports.lookupVat = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const { countryCode, vatNumber } = splitVatNumber(request.data?.vatNumber ?? '');
    if (vatNumber.length < 8) {
        throw new https_1.HttpsError('invalid-argument', 'Inserisci una Partita IVA valida.');
    }
    const data = await queryVies(countryCode, vatNumber);
    const valid = Boolean(data.isValid ?? data.valid);
    if (!valid) {
        return { valid: false, vatNumber, countryCode, source: 'vies' };
    }
    const rawName = (data.name ?? data.traderName ?? '').trim();
    const rawAddress = (data.address ?? data.traderAddress ?? '').trim();
    const name = rawName && rawName !== '---' ? rawName : undefined;
    const parsed = countryCode === 'IT' ? parseItalianAddress(rawAddress) : { address: rawAddress || undefined };
    return {
        valid: true,
        vatNumber,
        countryCode,
        name,
        ...parsed,
        source: 'vies',
    };
});
//# sourceMappingURL=vatLookup.js.map