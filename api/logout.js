'use strict';
const { reply, route } = require('../lib/http');
const { clearCookie } = require('../lib/session');

module.exports = route({ methods: ['POST'], contentType: 'application/json', session: false }, async (req, res) => {
  res.setHeader('Set-Cookie', clearCookie());
  reply(res, 200, { ok: true });
});
