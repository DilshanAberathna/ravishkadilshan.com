'use strict';
// Request guard shared by every admin API route: method, origin, CSRF header, content type, session.
const { COOKIE, readCookie, verifySession } = require('./session');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function env(name) {
  return process.env[name] || '';
}

function allowedOrigin(req) {
  return env('ADMIN_ORIGIN') || `https://${req.headers.host}`;
}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (body === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

async function readBody(req, limit) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, 'Request too large');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limit) {
  const body = await readBody(req, limit);
  try {
    const value = JSON.parse(body.toString('utf8'));
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function checkRequest(req, { methods, contentType, session = true }) {
  if (!methods.includes(req.method)) throw new HttpError(405, 'Method not allowed');
  if (req.method !== 'GET') {
    // Browsers always send Origin on cross-site POSTs; the custom header cannot be sent cross-site without CORS.
    if (req.headers.origin !== allowedOrigin(req)) throw new HttpError(403, 'Forbidden');
    if (req.headers['x-requested-with'] !== 'admin') throw new HttpError(403, 'Forbidden');
    if (contentType && String(req.headers['content-type'] || '').split(';')[0].trim() !== contentType) {
      throw new HttpError(415, 'Unsupported content type');
    }
  }
  if (session) {
    const token = readCookie(req.headers.cookie, COOKIE);
    if (!verifySession(token, env('SESSION_SECRET'))) throw new HttpError(401, 'Sign in required');
  }
}

function route(options, handler) {
  return async (req, res) => {
    try {
      if (env('SESSION_SECRET').length < 32) throw new HttpError(500, 'Server is not configured');
      checkRequest(req, options);
      await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) return reply(res, error.status, { error: error.message });
      console.error(error);
      return reply(res, 500, { error: 'Server error' });
    }
  };
}

module.exports = { HttpError, env, reply, readBody, readJson, route };
