// Assemble the admin UI for Vercel: admin/ plus the shared stylesheet and theme script, copied flat.
import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('admin-dist', { recursive: true, force: true });
mkdirSync('admin-dist');
for (const file of ['admin/index.html', 'admin/admin.css', 'admin/admin.js', 'style.css', 'theme.js']) {
  cpSync(file, 'admin-dist/' + file.split('/').pop());
}
console.log('Built admin-dist/');
