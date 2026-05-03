import { spawn } from 'child_process';
import * as path from 'path';

const MAX_TICKS = 200_000_000;
const WALL_TIMEOUT_SECONDS = 180;
const PASS_ADDRESS = 0x3469;
const TEST_BIN = path.join(__dirname, '..', '..', 'programs', 'tests', '6502_functional_test.bin');

const proc = spawn(
  'node',
  [
    path.join(__dirname, '..', 'index.js'),
    '--no-rom',
    '--org', '0000',
    '--start', '0400',
    '--max-ticks', String(MAX_TICKS),
    TEST_BIN,
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

let stderr = '';
proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

const timer = setTimeout(() => {
  proc.kill('SIGKILL');
}, WALL_TIMEOUT_SECONDS * 1000);

proc.on('exit', () => {
  clearTimeout(timer);

  const pcMatch = stderr.match(/\nPC=\$([0-9a-fA-F]{4})\s+\d/);
  const statsMatch = stderr.match(/(\d[\d,]*)\s+microsteps,\s+(\d[\d,]*)\s+instructions/);

  if (!pcMatch) {
    process.stderr.write('FAIL: could not determine final PC from output\n');
    process.stderr.write(stderr);
    process.exit(1);
  }

  const finalPC = parseInt(pcMatch[1], 16);

  if (statsMatch) {
    process.stderr.write(`${statsMatch[0]}\n`);
  }

  if (finalPC === PASS_ADDRESS) {
    process.stderr.write(`PASS: test suite completed at $${finalPC.toString(16).padStart(4, '0')}\n`);
    process.exit(0);
  } else {
    process.stderr.write(`FAIL: stopped at $${finalPC.toString(16).padStart(4, '0')} (expected $${PASS_ADDRESS.toString(16).padStart(4, '0')})\n`);
    process.stderr.write(stderr);
    process.exit(1);
  }
});
