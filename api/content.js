'use strict';
const { readJson, reply, route } = require('../lib/http');
const { getFile, putFile } = require('../lib/github');
const { validEntry } = require('../lib/validate');

async function loadContent() {
  const file = await getFile('content.json');
  if (!file) return { sha: undefined, content: [] };
  const content = JSON.parse(file.content.toString('utf8'));
  return { sha: file.sha, content: Array.isArray(content) ? content : [] };
}

module.exports = route({ methods: ['GET', 'POST'], contentType: 'application/json' }, async (req, res) => {
  if (req.method === 'GET') {
    const { content } = await loadContent();
    return reply(res, 200, content);
  }
  const { action, draft } = await readJson(req, 150_000);
  if (!['publish', 'unpublish'].includes(action)) return reply(res, 400, { error: 'Invalid portfolio entry' });
  const entry = validEntry(draft);
  if (action === 'publish' && entry.media.length) {
    const listing = await getFile('media');
    const present = new Set((Array.isArray(listing) ? listing : []).map(item => item.name));
    if (entry.media.some(item => !present.has(item.id))) return reply(res, 400, { error: 'Invalid portfolio entry' });
  }
  const { sha, content } = await loadContent();
  const position = content.findIndex(item => item.id === entry.id);
  let next = content.filter(item => item.id !== entry.id);
  if (action === 'publish') {
    if (entry.section === 'profile' || entry.section === 'contact') next = next.filter(item => item.section !== entry.section);
    next.splice(position === -1 ? next.length : Math.min(position, next.length), 0, entry);
  }
  const label = entry.title.replace(/[\r\n]+/g, ' ').slice(0, 60);
  await putFile('content.json', JSON.stringify(next, null, 2) + '\n', `content: ${action} "${label}"`, sha);
  reply(res, 200, next);
});
