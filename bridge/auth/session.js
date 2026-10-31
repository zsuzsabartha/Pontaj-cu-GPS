// Server-side session handling: signed JWT in an httpOnly cookie, user + roles re-loaded from DB on every request.
// Includes 2FA enrollment challenge + single-device binding (pontaj_device httpOnly cookie) for PIN logins.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { connectDB } from '../db.js';

export const SESSION_COOKIE = 'pontaj_session';
export const DEVICE_COOKIE = 'pontaj_device';
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days persistent session (sliding renewal on app open)
const DEVICE_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year trusted device

// AUTH_MODE=report  -> violations are logged but requests continue (rollout / safety net)
// AUTH_MODE=enforce -> violations are rejected with 401/403
export const AUTH_MODE = (process.env.AUTH_MODE || 'report').toLowerCase() === 'enforce' ? 'enforce' : 'report';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
    console.warn('[AUTH] JWT_SECRET missing or shorter than 32 characters. Using a random secret: all sessions will be lost on restart. Set a long JWT_SECRET in .env.');
    jwtSecret = crypto.randomBytes(48).toString('hex');
}

const PUBLIC_API_PATHS = new Set([
    '/api/v1/health',
    '/api/v1/ping',
    '/api/v1/auth/login-pin',
    '/api/v1/auth/verify-2fa',
    '/api/v1/auth/login-microsoft',
    '/api/v1/auth/microsoft-device/start',
    '/api/v1/auth/microsoft-device/poll',
    '/api/v1/auth/logout', // must work even with an expired session
]);

const safeJsonArray = (value) => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
};

export const encodeUserAltSchedules = (altIds = [], allowWeekendWork = false, jobFunction = null) => {
    const clean = (Array.isArray(altIds) ? altIds : []).filter(x => typeof x === 'string' && !x.startsWith('__ALLOW_WEEKEND__') && !x.startsWith('__FUNC__:'));
    if (allowWeekendWork) clean.push('__ALLOW_WEEKEND__');
    if (jobFunction) clean.push(`__FUNC__:${String(jobFunction).trim()}`);
    return JSON.stringify(clean);
};
/** Maps a `users` DB row to the API shape used by the frontend (never includes PIN or device secret hashes). */
export const mapUserRow = (u) => {
    // eslint-disable-next-line no-unused-vars
    const { pin, pin_hash, trusted_device_hash, totp_secret, ...rest } = u;
    const rawAlt = safeJsonArray(u.alternative_schedule_ids);
    const allowWeekendFromAlt = rawAlt.includes('__ALLOW_WEEKEND__');
    const funcTag = rawAlt.find(x => typeof x === 'string' && x.startsWith('__FUNC__:'));
    const cleanAlt = rawAlt.filter(x => typeof x === 'string' && !x.startsWith('__ALLOW_WEEKEND__') && !x.startsWith('__FUNC__:'));
    return {
        ...rest,
        roles: safeJsonArray(u.roles),
        alternativeScheduleIds: cleanAlt,
        companyId: u.company_id,
        departmentId: u.department_id,
        assignedOfficeId: u.assigned_office_id,
        mainScheduleId: u.main_schedule_id,
        contractHours: u.contract_hours,
        isValidated: u.is_validated,
        requiresGPS: u.requires_gps,
        erpId: u.erp_id,
        authType: u.auth_type,
        employmentStatus: u.employment_status,
        timekeeperId: u.timekeeper_id,
        firstName: u.first_name,
        lastName: u.last_name,
        hireDate: u.hire_date,
        terminationDate: u.termination_date,
        source: u.source,
        allowWeekendWork: Boolean(u.allow_weekend_work || allowWeekendFromAlt),
        jobFunction: u.job_function || (funcTag ? funcTag.slice('__FUNC__:'.length) : undefined),
        hasTrustedDevice: !!trusted_device_hash,
        trustedDeviceLabel: u.trusted_device_label || undefined,
        trustedDeviceEnrolledAt: u.trusted_device_enrolled_at instanceof Date
            ? u.trusted_device_enrolled_at.toISOString()
            : (u.trusted_device_enrolled_at || undefined),
    };
};

export const parseCookies = (header = '') =>
    Object.fromEntries(
        header.split(';')
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => {
                const i = p.indexOf('=');
                return i === -1 ? [p, ''] : [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
            })
    );

export const issueSession = (req, res, userId) => {
    const token = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: SESSION_TTL_SECONDS });
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure,
        path: '/',
        maxAge: SESSION_TTL_SECONDS * 1000,
    });
};

export const clearSession = (req, res) => {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
};

export const hashDeviceToken = (token) =>
    crypto.createHash('sha256').update(String(token)).digest('hex');

export const readDeviceCookie = (req) =>
    parseCookies(req.headers?.cookie || '')[DEVICE_COOKIE] || null;

export const issueDeviceCookie = (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = hashDeviceToken(token);
    res.cookie(DEVICE_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure,
        path: '/',
        maxAge: DEVICE_TTL_SECONDS * 1000,
    });
    return { token, hash };
};

export const sign2FAChallenge = (userId) =>
    jwt.sign({ sub: userId, purpose: '2fa_enroll' }, jwtSecret, { expiresIn: '10m' });

export const verify2FAChallenge = (challengeToken) => {
    const payload = jwt.verify(String(challengeToken || ''), jwtSecret);
    if (payload.purpose !== '2fa_enroll' || !payload.sub) {
        throw new Error('Invalid 2FA challenge token');
    }
    return payload.sub;
};

export const describeUserAgent = (ua = '', now = new Date()) => {
    const os = /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(ua)
        ? 'iOS'
        : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS/i.test(ua)
        ? 'macOS'
        : /Linux/i.test(ua)
        ? 'Linux'
        : 'Dispozitiv';
    const browser = /Edg\//i.test(ua)
        ? 'Edge'
        : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
        ? 'Safari'
        : 'Browser';
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${os} • ${browser} (${d}.${m}.${y})`;
};

const loadActiveUser = async (userId) => {
    const pool = await connectDB();
    const result = await pool.request().input('id', userId).query('SELECT * FROM users WHERE id = @id');
    const row = result.recordset[0];
    if (!row || row.employment_status === 'TERMINATED' || row.employment_status === 'SUSPENDED') return null;
    return mapUserRow(row);
};

/**
 * Logs an authorization violation. In enforce mode it also sends the error response and returns true
 * (the caller must stop). In report mode it returns false and the request continues as before.
 */
export const deny = (req, res, status, reason) => {
    console.warn(`[AUTHZ-VIOLATION] mode=${AUTH_MODE} user=${req.user?.id || 'anonymous'} ${req.method} ${req.originalUrl} reason="${reason}"`);
    if (AUTH_MODE !== 'enforce') return false;
    res.status(status).json({ error: status === 401 ? 'Sesiune expirată sau inexistentă.' : 'Acces interzis.', reason });
    return true;
};

/** Attaches req.user from the session cookie; rejects (or reports) anonymous calls to protected API routes. */
export const sessionMiddleware = async (req, res, next) => {
    try {
        req.user = null;
        // Static assets / SPA routes do not need a session (avoids a DB lookup per file).
        if (!req.path.startsWith('/api/')) return next();
        const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
        if (token) {
            try {
                const payload = jwt.verify(token, jwtSecret);
                req.user = await loadActiveUser(payload.sub);
            } catch {
                req.user = null; // expired or tampered token
            }
        }
        if (!PUBLIC_API_PATHS.has(req.path) && !req.user) {
            if (deny(req, res, 401, 'no valid session')) return;
        }
        next();
    } catch (e) {
        next(e);
    }
};
