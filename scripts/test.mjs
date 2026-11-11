// Static checks for the portfolio, then the admin API tests.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let failed = false;
const fail = msg => { console.error('FAIL:', msg); failed = true; };

for (const file of ['app.js', 'theme.js', 'published.js', 'admin/admin.js', 'scripts/build-admin.mjs']) {
  try { execFileSync('node', ['--check', file], { stdio: 'pipe' }); console.log('ok  syntax', file); }
  catch (e) { fail(`${file}: ${e.stderr}`); }
}

execFileSync('node', ['scripts/build-admin.mjs'], { stdio: 'pipe' });

for (const [page, base] of [['index.html', ''], ['admin-dist/index.html', 'admin-dist']]) {
  const html = readFileSync(page, 'utf8');
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(ref)) continue;
    const path = ref.split(/[?#]/)[0];
    if (path && !existsSync(join(base, path))) fail(`${page} references missing file: ${ref}`);
  }
  console.log('ok  refs', page);
}

for (const required of ['index.html', 'CNAME', '.nojekyll', 'content.json']) {
  if (!existsSync(required)) fail(`missing required file: ${required}`);
}
if (existsSync('CNAME') && readFileSync('CNAME', 'utf8').trim() !== 'ravishkadilshan.com') {
  fail('CNAME must contain ravishkadilshan.com');
}
try {
  if (!Array.isArray(JSON.parse(readFileSync('content.json', 'utf8')))) fail('content.json must be a JSON array');
  else console.log('ok  content.json');
} catch (e) { fail('content.json is not valid JSON'); }

if (failed) process.exit(1);

try {
  console.log(execFileSync('node', ['--test', 'test/admin.test.js'], { encoding: 'utf8', stdio: 'pipe' }).split('\n').filter(l => /^# (tests|pass|fail)/.test(l)).join('\n'));
} catch (e) {
  console.error(e.stdout || e.message);
  process.exit(1);
}
