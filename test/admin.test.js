'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const session = require('../lib/session');

const ORIGIN = 'https://admin.example.test';
const PASSWORD = 'correct horse battery';
process.env.ADMIN_ORIGIN = ORIGIN;
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.ADMIN_PASSWORD_HASH = session.hashPassword(PASSWORD);
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_REPO = 'owner/repo';

// In-memory stand-in for the GitHub Contents API.
const repo = new Map();
let fetchCalls = [];
global.fetch = async (url, options = {}) => {
  const { pathname } = new URL(url);
  const path = decodeURIComponent(pathname.replace('/repos/owner/repo/contents/', ''));
  fetchCalls.push({ method: options.method, path, auth: options.headers?.Authorization });
  const json = (status, body) => ({ status, ok: status < 300, json: async () => body });
  if (options.method === 'GET') {
    if (repo.has(path)) {
      const file = repo.get(path);
      return json(200, { sha: file.sha, content: file.content.toString('base64') });
    }
    const children = [...repo.keys()].filter(key => key.startsWith(path + '/')).map(key => ({ name: key.slice(path.length + 1) }));
    return children.length ? json(200, children) : json(404, {});
  }
  const body = JSON.parse(options.body);
  const existing = repo.get(path);
  if (existing && existing.sha !== body.sha) return json(409, {});
  repo.set(path, { sha: 'sha' + repo.size + Date.now(), content: Buffer.from(body.content, 'base64') });
  return json(200, {});
};

function call(handler, { method = 'POST', url = '/', headers = {}, body = '', cookie } = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const req = Readable.from(payload.length ? [payload] : []);
  Object.assign(req, {
    method,
    url,
    headers: {
      origin: ORIGIN,
      'x-requested-with': 'admin',
      'content-type': 'application/json',
      'content-length': String(payload.length),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
  });
  return new Promise(resolve => {
    const res = { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(data) { resolve({ status: this.statusCode, headers: this.headers, body: data ? JSON.parse(data) : undefined }); } };
    handler(req, res);
  });
}

const login = require('../api/login');
const logout = require('../api/logout');
const content = require('../api/content');
const media = require('../api/media');
const validSession = () => `${session.COOKIE}=${session.createSession(process.env.SESSION_SECRET)}`;
const entry = (over = {}) => ({ id: 'entry-1', section: 'projects', title: 'Lab', body: 'text', url: 'https://example.com', ...over });
const publish = (draft, cookie = validSession()) => call(content, { body: JSON.stringify({ action: 'publish', draft }), cookie });

test('password hashing verifies only the right password', () => {
  assert.equal(session.verifyPassword(PASSWORD, process.env.ADMIN_PASSWORD_HASH), true);
  assert.equal(session.verifyPassword('wrong', process.env.ADMIN_PASSWORD_HASH), false);
  assert.equal(session.verifyPassword(PASSWORD, ''), false);
});

test('login rejects a wrong password and issues a hardened cookie for the right one', async () => {
  login.failures.clear();
  const bad = await call(login, { body: JSON.stringify({ password: 'nope' }) });
  assert.equal(bad.status, 401);
  assert.equal(bad.headers['set-cookie'], undefined);
  const good = await call(login, { body: JSON.stringify({ password: PASSWORD }) });
  assert.equal(good.status, 200);
  const cookie = good.headers['set-cookie'];
  for (const flag of ['__Host-rd_session=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(cookie.includes(flag), flag);
});

test('login locks out after repeated failures', async () => {
  login.failures.clear();
  for (let i = 0; i < 5; i++) await call(login, { body: JSON.stringify({ password: 'bad' }) });
  const locked = await call(login, { body: JSON.stringify({ password: PASSWORD }) });
  assert.equal(locked.status, 429);
  login.failures.clear();
});

test('content API requires a valid session', async () => {
  assert.equal((await call(content, { method: 'GET' })).status, 401);
  const token = session.createSession(process.env.SESSION_SECRET);
  assert.equal((await call(content, { method: 'GET', cookie: `${session.COOKIE}=${token}x` })).status, 401);
  assert.equal((await call(content, { method: 'GET', cookie: `${session.COOKIE}=${session.createSession(process.env.SESSION_SECRET, 0)}` })).status, 401);
  assert.equal((await call(content, { method: 'GET', cookie: `${session.COOKIE}=${session.createSession('y'.repeat(40))}` })).status, 401);
  assert.equal((await call(content, { method: 'GET', cookie: validSession() })).status, 200);
});

test('state-changing requests need the right origin and CSRF header', async () => {
  const body = JSON.stringify({ action: 'publish', draft: entry() });
  assert.equal((await call(content, { body, cookie: validSession(), headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call(content, { body, cookie: validSession(), headers: { origin: '' } })).status, 403);
  assert.equal((await call(content, { body, cookie: validSession(), headers: { 'x-requested-with': '' } })).status, 403);
  assert.equal((await call(content, { body, cookie: validSession(), headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await call(content, { method: 'DELETE', cookie: validSession() })).status, 405);
});

test('publish validates input and commits content.json to the repo', async () => {
  repo.clear();
  assert.equal((await publish(entry({ url: 'javascript:alert(1)' }))).status, 400);
  assert.equal((await publish(entry({ section: 'unknown' }))).status, 400);
  assert.equal((await publish(entry({ title: '  ' }))).status, 400);
  assert.equal((await publish(entry({ section: 'writeups', platform: 'Other' }))).status, 400);
  assert.equal((await publish(entry({ media: [{ id: '../../x.png', name: 'x' }] }))).status, 400);
  assert.equal((await publish(entry({ media: [{ id: 'a'.repeat(32) + '.png', name: 'missing' }] }))).status, 400);
  assert.equal(repo.size, 0);
  const ok = await publish(entry());
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(repo.get('content.json').content.toString()).length, 1);
  const update = await publish(entry({ title: 'Renamed' }));
  assert.equal(update.body.length, 1);
  assert.equal(update.body[0].title, 'Renamed');
  const removal = await call(content, { body: JSON.stringify({ action: 'unpublish', draft: entry() }), cookie: validSession() });
  assert.deepEqual(removal.body, []);
});

test('only one profile entry is kept', async () => {
  repo.clear();
  await publish(entry({ id: 'p1', section: 'profile', title: 'A' }));
  const second = await publish(entry({ id: 'p2', section: 'profile', title: 'B' }));
  assert.deepEqual(second.body.map(item => item.id), ['p2']);
});

const upload = (name, body, extra = {}) => call(media, { url: '/api/media?name=' + encodeURIComponent(name), headers: { 'content-type': 'application/octet-stream' }, body, cookie: validSession(), ...extra });
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(32)]);

test('media upload checks type, signature and size, then commits the file', async () => {
  repo.clear();
  assert.equal((await upload('x.svg', PNG)).status, 415);
  assert.equal((await upload('x.exe', PNG)).status, 415);
  assert.equal((await upload('x.png', Buffer.from('<html>'))).status, 400);
  assert.equal((await upload('x.png', Buffer.alloc(4 * 1024 * 1024 + 1, 1))).status, 413);
  assert.equal((await upload('x.png', PNG, { cookie: undefined })).status, 401);
  assert.equal(repo.size, 0);
  const ok = await upload('portrait.png', PNG);
  assert.equal(ok.status, 200);
  assert.match(ok.body.id, /^[a-f0-9]{32}\.png$/);
  assert.ok(repo.has('media/' + ok.body.id));
  const withMedia = await publish(entry({ id: 'with-media', media: [ok.body] }));
  assert.equal(withMedia.status, 200);
});

test('the GitHub token is only ever sent to GitHub and never returned', async () => {
  fetchCalls = [];
  const response = await call(content, { method: 'GET', cookie: validSession() });
  assert.ok(fetchCalls.length > 0 && fetchCalls.every(c => c.auth === 'Bearer test-token'));
  assert.ok(!JSON.stringify(response).includes('test-token'));
});

test('logout clears the cookie', async () => {
  const response = await call(logout, { body: '{}' });
  assert.match(response.headers['set-cookie'], /Max-Age=0/);
});
