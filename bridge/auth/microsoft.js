// Server-side validation of Microsoft Entra ID tokens (ID token obtained by MSAL in the browser).
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const TENANT_ID = process.env.AZURE_TENANT_ID || process.env.VITE_AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.VITE_AZURE_CLIENT_ID;
const KEYS_TTL_MS = 6 * 60 * 60 * 1000;

let cachedKeys = null;
let cachedAt = 0;

const fetchSigningKeys = async (forceRefresh = false) => {
    if (!forceRefresh && cachedKeys && Date.now() - cachedAt < KEYS_TTL_MS) return cachedKeys;
    const url = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot download Microsoft signing keys (${response.status})`);
    const { keys } = await response.json();
    cachedKeys = new Map(keys.map(k => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
    cachedAt = Date.now();
    return cachedKeys;
};

/**
 * Verifies signature, audience, issuer and expiry of a Microsoft ID token.
 * Returns the normalized e-mail of the signed-in account.
 */
export const verifyMicrosoftIdToken = async (idToken) => {
    if (!TENANT_ID || !CLIENT_ID) {
        throw new Error('AZURE_TENANT_ID / AZURE_CLIENT_ID are not configured on the server.');
    }
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded?.header?.kid) throw new Error('Invalid Microsoft token format.');

    let keys = await fetchSigningKeys();
    if (!keys.has(decoded.header.kid)) keys = await fetchSigningKeys(true); // key rotation
    const publicKey = keys.get(decoded.header.kid);
    if (!publicKey) throw new Error('Unknown Microsoft signing key.');

    const claims = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    });

    const email = (claims.preferred_username || claims.email || claims.upn || '').toLowerCase().trim();
    if (!email) throw new Error('Microsoft token has no e-mail claim.');
    return email;
};
