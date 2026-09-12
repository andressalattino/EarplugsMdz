import { hashPassword } from '../server/security.js';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

if (!process.stdin.isTTY) { console.error('Ejecutá este comando en una terminal interactiva.'); process.exit(1); }
const silentOutput = new Writable({ write(chunk, encoding, callback) { callback(); } });
const readline = createInterface({ input: process.stdin, output: silentOutput, terminal: true });
process.stdout.write('Contraseña del administrador (no se mostrará): ');
readline.question('', password => {
  readline.close(); process.stdout.write('\n');
  if (password.length < 12 || password.length > 256) { console.error('Usá entre 12 y 256 caracteres.'); process.exitCode = 1; return; }
  console.log(`ADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=${hashPassword(password)}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nANALYTICS_SECRET=${randomBytes(32).toString('hex')}`);
  console.log('\nCopiá estos valores a las variables privadas de Vercel o .env.local. No los subas a Git.');
});
