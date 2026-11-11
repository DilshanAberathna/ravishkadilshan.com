// Static checks for the portfolio: JS syntax, Python syntax, and local asset references.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let failed = false;
const fail = msg => { console.error('FAIL:', msg); failed = true; };

for (const file of ['app.js', 'theme.js', 'published.js', 'admin/admin.js']) {
  try { execFileSync('node', ['--check', file], { stdio: 'pipe' }); console.log('ok  syntax', file); }
  catch (e) { fail(`${file}: ${e.stderr}`); }
}

try { execFileSync('python3', ['-m', 'py_compile', 'server.py'], { stdio: 'pipe' }); console.log('ok  syntax server.py'); }
catch (e) { fail(`server.py: ${e.stderr}`); }

for (const page of ['index.html', 'admin/index.html']) {
  const base = page.includes('/') ? page.slice(0, page.lastIndexOf('/')) : '';
  const html = readFileSync(page, 'utf8');
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(ref)) continue;
    const path = ref.split(/[?#]/)[0];
    if (!path) continue;
    const target = path.startsWith('/') ? path.slice(1) : join(base, path);
    if (!existsSync(target)) fail(`${page} references missing file: ${ref}`);
  }
  console.log('ok  refs', page);
}

for (const required of ['index.html', 'CNAME', '.nojekyll']) {
  if (!existsSync(required)) fail(`missing required file: ${required}`);
}
if (existsSync('CNAME') && readFileSync('CNAME', 'utf8').trim() !== 'ravishkadilshan.com') {
  fail('CNAME must contain ravishkadilshan.com');
}

process.exit(failed ? 1 : 0);
