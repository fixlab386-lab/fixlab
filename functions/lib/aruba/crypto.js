"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = require("crypto");
const SALT = 'fixlab-aruba-secrets-v1';
function secretKey(raw) {
    const key = raw || process.env.ARUBA_SECRETS_KEY;
    if (!key || key.length < 16) {
        throw new Error('ARUBA_SECRETS_KEY non configurata sul server.');
    }
    return (0, crypto_1.scryptSync)(key, SALT, 32);
}
function encryptSecret(plain, keyRaw) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', secretKey(keyRaw), iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}
function decryptSecret(payload, keyRaw) {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex)
        throw new Error('Credenziale Aruba non valida.');
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', secretKey(keyRaw), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return plain.toString('utf8');
}
//# sourceMappingURL=crypto.js.map