// Create the ADMIN_PASSWORD_HASH value for Vercel. The password is typed hidden and never stored.
import { createRequire } from 'node:module';
const { hashPassword } = createRequire(import.meta.url)('../lib/session.js');

function ask(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', function onData(char) {
      for (const c of char) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f') value = value.slice(0, -1);
        else value += c;
      }
    });
  });
}

const password = await ask('New admin password (min 12 characters): ');
if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
if (password !== await ask('Repeat password: ')) {
  console.error('Passwords do not match.');
  process.exit(1);
}
console.log('\nADMIN_PASSWORD_HASH=' + hashPassword(password));
