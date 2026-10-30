// Server-side validation of Microsoft Entra ID tokens + OAuth 2.0 Device Code flow for tunnel/mobile domains.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const TENANT_ID = process.env.AZURE_TENANT_ID || process.env.VITE_AZURE_TENANT_ID || 'bioeel.onmicrosoft.com';
const CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.VITE_AZURE_CLIENT_ID || 'f8b3f745-453b-4b44-90fb-5b4fd4823986';
const DEVICE_FLOW_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';
const BIOEEL_TENANT_GUID = '73649f89-db7d-4b62-8447-1339361e77be';
const KEYS_TTL_MS = 6 * 60 * 60 * 1000;

let cachedKeys = null;
let cachedIssuer = null;
let cachedAt = 0;

const fetchSigningKeys = async (forceRefresh = false) => {
    if (!forceRefresh && cachedKeys && Date.now() - cachedAt < KEYS_TTL_MS) return cachedKeys;
    const oidcUrl = `https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration`;
    const oidcRes = await fetch(oidcUrl);
    let jwksUrl = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;
    if (oidcRes.ok) {
        const oidc = await oidcRes.json();
        if (oidc.issuer) cachedIssuer = oidc.issuer;
        if (oidc.jwks_uri) jwksUrl = oidc.jwks_uri;
    }
    const response = await fetch(jwksUrl);
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

    const allowedIssuers = [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://login.microsoftonline.com/${BIOEEL_TENANT_GUID}/v2.0`,
        cachedIssuer,
    ].filter(Boolean);

    const claims = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: [CLIENT_ID, DEVICE_FLOW_CLIENT_ID],
        issuer: allowedIssuers,
    });

    const email = (claims.preferred_username || claims.email || claims.upn || '').toLowerCase().trim();
    if (!email) throw new Error('Microsoft token has no e-mail claim.');
    return email;
};

export const startMicrosoftDeviceFlow = async () => {
    const body = new URLSearchParams({
        client_id: DEVICE_FLOW_CLIENT_ID,
        scope: 'openid profile email User.Read',
    });
    const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/devicecode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.device_code) {
        throw new Error(data.error_description || 'Eroare la inițierea autentificării Microsoft Device Code.');
    }
    return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri || 'https://login.microsoft.com/device',
        expiresIn: data.expires_in || 900,
        interval: data.interval || 5,
    };
};

export const pollMicrosoftDeviceFlow = async (deviceCode) => {
    const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: DEVICE_FLOW_CLIENT_ID,
        device_code: String(deviceCode || ''),
    });
    const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
        if (data.error === 'authorization_pending' || data.error === 'slow_down') {
            return { pending: true };
        }
        throw new Error(data.error_description || 'Sesiunea de autentificare Microsoft a expirat.');
    }
    if (!data.id_token) {
        throw new Error('Răspunsul Microsoft nu conține id_token.');
    }
    return { pending: false, idToken: data.id_token };
};
