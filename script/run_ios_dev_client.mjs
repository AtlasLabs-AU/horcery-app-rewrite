import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [portArg, udid, devClientUrl] = process.argv.slice(2);
const port = Number(portArg);

if (!Number.isInteger(port) || port < 1 || port > 65535 || !udid || !devClientUrl) {
  console.error(
    'usage: node script/run_ios_dev_client.mjs <port> <simulator-udid> <dev-client-url>',
  );
  process.exit(2);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
let opening = false;
let checking = false;

// Keep Metro attached to this foreground process so the Codex action terminal
// owns its logs and Ctrl-C lifecycle. We poll the local port only to know when
// the exact installed Horcery client can be deep-linked safely.
const metro = spawn(
  'npx',
  ['expo', 'start', '--dev-client', '--port', String(port), '--clear'],
  {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  },
);

function openDevClient() {
  if (opening) return;
  opening = true;
  clearInterval(readinessTimer);

  const opened = spawnSync('xcrun', ['simctl', 'openurl', udid, devClientUrl], {
    stdio: 'inherit',
  });

  if (opened.status !== 0) {
    console.error('Metro started, but the Horcery development client could not be opened.');
    metro.kill('SIGTERM');
    process.exitCode = opened.status ?? 1;
  }
}

function checkMetro() {
  if (checking || opening) return;
  checking = true;

  const socket = net.createConnection({ host: '127.0.0.1', port });
  socket.setTimeout(500);
  socket.once('connect', () => {
    socket.destroy();
    checking = false;
    openDevClient();
  });
  const unavailable = () => {
    socket.destroy();
    checking = false;
  };
  socket.once('error', unavailable);
  socket.once('timeout', unavailable);
}

const readinessTimer = setInterval(checkMetro, 250);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(readinessTimer);
    if (!metro.killed) metro.kill(signal);
  });
}

metro.once('error', (error) => {
  clearInterval(readinessTimer);
  console.error(`Could not start Expo: ${error.message}`);
  process.exitCode = 1;
});

metro.once('exit', (code, signal) => {
  clearInterval(readinessTimer);
  if (signal) {
    process.exitCode = signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
