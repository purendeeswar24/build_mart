#!/usr/bin/env node
/**
 * Start / stop the local shop + API + admin stack.
 *   node scripts/stack.mjs up
 *   node scripts/stack.mjs down
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = resolve(root, '.dev-pids.json');
const isWin = process.platform === 'win32';

const services = [
  { name: 'api', cmd: 'npm', args: ['run', 'dev', '--workspace=@buildmart/backend'] },
  { name: 'shop', cmd: 'npm', args: ['run', 'web', '--workspace=frontend', '--', '--port', '8081', '--non-interactive'] },
  { name: 'admin', cmd: 'npm', args: ['run', 'dev', '--workspace=@buildmart/admin-web'] },
];

function killPid(pid) {
  if (!pid) return;
  try {
    if (isWin) spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

function down() {
  if (!existsSync(pidFile)) {
    console.log('Nothing to stop (.dev-pids.json missing).');
    return;
  }
  const rows = JSON.parse(readFileSync(pidFile, 'utf8'));
  for (const row of rows) {
    killPid(row.pid);
    console.log(`stopped ${row.name} (pid ${row.pid})`);
  }
  unlinkSync(pidFile);
}

function up() {
  if (existsSync(pidFile)) {
    console.log('Stack already marked running. Use make down first, or delete .dev-pids.json.');
    process.exit(1);
  }
  const rows = [];
  for (const svc of services) {
    const child = spawn(svc.cmd, svc.args, {
      cwd: root,
      stdio: 'inherit',
      shell: isWin,
      env: process.env,
    });
    rows.push({ name: svc.name, pid: child.pid });
    console.log(`started ${svc.name} (pid ${child.pid})`);
  }
  writeFileSync(pidFile, JSON.stringify(rows, null, 2));
  console.log('');
  console.log('Shop   http://localhost:8081');
  console.log('API    http://localhost:4000');
  console.log('Admin  http://localhost:5173');
  console.log('Stop with: make down');
}

const cmd = process.argv[2];
if (cmd === 'up') up();
else if (cmd === 'down') down();
else {
  console.error('Usage: node scripts/stack.mjs up|down');
  process.exit(1);
}
