/**
 * Starts the local MongoDB server (mongod) used for development.
 * Runs: npm run db
 *
 * The MongoDB binaries live outside the repo at
 *   %USERPROFILE%/mongodb/server7/mongodb-win32-x86_64-windows-7.0.40/bin/mongod.exe
 * with data at %USERPROFILE%/mongodb/data/db.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const home = process.env.USERPROFILE || process.env.HOME;
const binDir = join(
  home,
  'mongodb',
  'server7',
  'mongodb-win32-x86_64-windows-7.0.40',
  'bin'
);
const mongod = join(binDir, 'mongod.exe');
const dbPath = join(home, 'mongodb', 'data', 'db');

if (!existsSync(mongod)) {
  console.error(`mongod not found at ${mongod}`);
  console.error('Download MongoDB 7.0.40 (community, windows x86_64) and extract it to:');
  console.error(join(home, 'mongodb', 'server7'));
  process.exit(1);
}

mkdirSync(dbPath, { recursive: true });

const child = spawn(
  mongod,
  ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1'],
  { stdio: 'inherit' }
);

child.on('exit', (code) => {
  console.log(`mongod exited with code ${code}`);
  process.exit(code ?? 0);
});
