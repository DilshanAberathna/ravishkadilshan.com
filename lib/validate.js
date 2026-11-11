'use strict';
const { HttpError } = require('./http');

const SECTIONS = new Set(['profile', 'projects', 'blogs', 'writeups', 'achievements', 'career', 'background', 'toolkit', 'github', 'contact', 'sections']);
const FIELDS = { id: 100, section: 30, title: 120, body: 50000, url: 2048, platform: 40, role: 120, github: 300 };
const MEDIA_TYPES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.pdf', '.doc', '.docx', '.txt', '.odt']);
const MEDIA_ID = /^[a-f0-9]{32}\.[a-z]+$/;

function webUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validEntry(draft) {
  const bad = () => new HttpError(400, 'Invalid portfolio entry');
  if (!draft || typeof draft !== 'object') throw bad();
  const entry = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const value = draft[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw bad();
    entry[key] = value;
  }
  if (!SECTIONS.has(entry.section) || !entry.id || !entry.title.trim()) throw bad();
  if (!/^[a-zA-Z0-9-]+$/.test(entry.id)) throw bad();
  if (entry.url && !webUrl(entry.url)) throw bad();
  if (entry.github && !webUrl(entry.github)) throw bad();
  if (entry.section === 'writeups' && !['Hack The Box', 'TryHackMe'].includes(entry.platform)) throw bad();
  const media = draft.media ?? [];
  if (!Array.isArray(media) || media.length > 20) throw bad();
  entry.media = media.map(item => {
    if (!item || typeof item !== 'object') throw bad();
    const { id, name } = item;
    if (typeof id !== 'string' || !MEDIA_ID.test(id) || !MEDIA_TYPES.has(id.slice(id.indexOf('.')))) throw bad();
    if (typeof name !== 'string' || !name.length || name.length > 255) throw bad();
    return { id, name };
  });
  return entry;
}

const SIGNATURES = {
  '.jpg': buf => buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  '.jpeg': buf => buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  '.png': buf => buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  '.gif': buf => buf.subarray(0, 4).toString('latin1') === 'GIF8',
  '.webp': buf => buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP',
  '.pdf': buf => buf.subarray(0, 4).toString('latin1') === '%PDF',
  '.mp4': buf => buf.subarray(4, 8).toString('latin1') === 'ftyp',
  '.webm': buf => buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  '.docx': buf => buf.subarray(0, 2).toString('latin1') === 'PK',
  '.odt': buf => buf.subarray(0, 2).toString('latin1') === 'PK',
  '.doc': buf => buf.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
  '.txt': buf => !buf.includes(0),
};

function contentMatchesType(extension, buffer) {
  return Boolean(SIGNATURES[extension]?.(buffer));
}

module.exports = { MEDIA_TYPES, MEDIA_ID, validEntry, contentMatchesType };
