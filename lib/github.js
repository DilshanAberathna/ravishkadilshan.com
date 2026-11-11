'use strict';
// Minimal GitHub Contents API client. The token never leaves the server.
const { HttpError, env } = require('./http');

function settings() {
  const token = env('GITHUB_TOKEN');
  if (!token) throw new HttpError(500, 'Server is not configured');
  return {
    token,
    repo: env('GITHUB_REPO') || 'DilshanAberathna/ravishkadilshan.com',
    branch: env('GITHUB_BRANCH') || 'main',
  };
}

async function call(method, path, body) {
  const { token, repo, branch } = settings();
  const url = new URL(`https://api.github.com/repos/${repo}/contents/${path}`);
  if (method === 'GET') url.searchParams.set('ref', branch);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'portfolio-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify({ ...body, branch }) : undefined,
  });
  return response;
}

async function getFile(path) {
  const response = await call('GET', path);
  if (response.status === 404) return null;
  if (!response.ok) throw new HttpError(502, 'Could not read from the repository');
  const data = await response.json();
  if (Array.isArray(data)) return data;
  return { sha: data.sha, content: Buffer.from(data.content, 'base64') };
}

async function putFile(path, content, message, sha) {
  const response = await call('PUT', path, {
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha ? { sha } : {}),
  });
  if (response.status === 409 || response.status === 422) throw new HttpError(409, 'Content changed elsewhere. Reload and try again.');
  if (!response.ok) throw new HttpError(502, 'Could not write to the repository');
}

module.exports = { getFile, putFile };
