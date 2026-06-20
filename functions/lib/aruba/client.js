"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arubaEndpoints = arubaEndpoints;
exports.arubaSignIn = arubaSignIn;
exports.arubaUploadInvoice = arubaUploadInvoice;
const ENDPOINTS = {
    demo: {
        auth: 'https://demoauth.fatturazioneelettronica.aruba.it',
        api: 'https://demows.fatturazioneelettronica.aruba.it',
    },
    production: {
        auth: 'https://auth.fatturazioneelettronica.aruba.it',
        api: 'https://ws.fatturazioneelettronica.aruba.it',
    },
};
function arubaEndpoints(environment) {
    return ENDPOINTS[environment];
}
async function arubaSignIn(environment, username, password) {
    const { auth } = arubaEndpoints(environment);
    const body = new URLSearchParams({
        grant_type: 'password',
        username,
        password,
    });
    const res = await fetch(`${auth}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
    });
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = {};
    }
    if (!res.ok) {
        const msg = (typeof data.error_description === 'string' && data.error_description) ||
            (typeof data.error === 'string' && data.error) ||
            text ||
            `Autenticazione Aruba fallita (${res.status}).`;
        throw new Error(msg);
    }
    const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
    if (!accessToken)
        throw new Error('Aruba non ha restituito un token di accesso.');
    return {
        accessToken,
        expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
    };
}
async function arubaUploadInvoice(environment, accessToken, xmlContent, signed = false) {
    const { api } = arubaEndpoints(environment);
    const path = signed ? '/services/invoice/uploadSigned' : '/services/invoice/upload';
    const dataFile = Buffer.from(xmlContent, 'utf8').toString('base64');
    const res = await fetch(`${api}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
            dataFile,
            credential: '',
            domain: '',
            senderPIVA: '',
            skipExtraSchema: false,
        }),
    });
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch {
        data = {};
    }
    if (!res.ok) {
        const msg = (typeof data.errorDescription === 'string' && data.errorDescription) ||
            (typeof data.message === 'string' && data.message) ||
            text ||
            `Upload fattura Aruba fallito (${res.status}).`;
        throw new Error(msg);
    }
    return {
        uploadFileName: typeof data.uploadFileName === 'string' ? data.uploadFileName : undefined,
        errorDescription: typeof data.errorDescription === 'string' ? data.errorDescription : undefined,
    };
}
//# sourceMappingURL=client.js.map