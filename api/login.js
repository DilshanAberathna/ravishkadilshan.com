'use strict';
const { HttpError, env, readJson, reply, route } = require('../lib/http');
const { verifyPassword, createSession, sessionCookie } = require('../lib/session');

// Best-effort per-instance throttle. Add a Vercel Firewall rate-limit rule on /api/login for a hard limit.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function client(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

module.exports = route({ methods: ['POST'], contentType: 'application/json', session: false }, async (req, res) => {
  const stored = env('ADMIN_PASSWORD_HASH');
  if (!stored) throw new HttpError(500, 'Server is not configured');
  const key = client(req);
  const now = Date.now();
  const record = failures.get(key);
  if (record && now - record.first < WINDOW_MS && record.count >= MAX_FAILURES) {
    throw new HttpError(429, 'Too many attempts. Try again later.');
  }
  const { password } = await readJson(req, 2048);
  if (typeof password !== 'string' || !password || password.length > 256 || !verifyPassword(password, stored)) {
    const current = record && now - record.first < WINDOW_MS ? record : { first: now, count: 0 };
    current.count++;
    failures.set(key, current);
    await new Promise(resolve => setTimeout(resolve, 800));
    throw new HttpError(401, 'Incorrect password');
  }
  failures.delete(key);
  res.setHeader('Set-Cookie', sessionCookie(createSession(env('SESSION_SECRET'))));
  reply(res, 200, { ok: true });
});

module.exports.failures = failures;
