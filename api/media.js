'use strict';
const crypto = require('node:crypto');
const path = require('node:path');
const { HttpError, readBody, reply, route } = require('../lib/http');
const { putFile } = require('../lib/github');
const { MEDIA_TYPES, contentMatchesType } = require('../lib/validate');

// Vercel functions accept request bodies up to 4.5 MB.
const LIMIT = 4 * 1024 * 1024;

module.exports = route({ methods: ['POST'], contentType: 'application/octet-stream' }, async (req, res) => {
  const name = new URL(req.url, 'http://localhost').searchParams.get('name') || '';
  const extension = path.extname(name).toLowerCase();
  if (!name || name.length > 255 || !MEDIA_TYPES.has(extension)) throw new HttpError(415, 'Unsupported media format');
  const body = await readBody(req, LIMIT);
  if (!body.length) throw new HttpError(400, 'Empty file');
  if (!contentMatchesType(extension, body)) throw new HttpError(400, 'File content does not match its type');
  const id = crypto.randomBytes(16).toString('hex') + extension;
  await putFile(`media/${id}`, body, 'media: upload');
  reply(res, 200, { id, name });
});
