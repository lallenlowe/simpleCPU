'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory, DEFAULT_LOAD_ADDRESS, Memory } from './initial-state';
import { instructionMap } from './control';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';
import { createInputDevice, setupStdin, teardownStdin, checkInterrupt } from './memory/input-device';
import { startGraphics, stopGraphics } from './graphics';
import { startSound, stopSound } from './sound';
import * as path from 'path';

const opcodeNames: Map<number, string> = new Map(
  Object.entries(instructionMap).map(([name, opcode]) => [opcode, name]),
);

const formatStatus = (status: { [key: string]: boolean }): string => {
  return ['N', 'O', 'B', 'D', 'I', 'Z', 'C']
    .map((f) => (status[f] ? f : f.toLowerCase()))
    .join('');
};

let debugMode = false;

const cycle = (machineState: MachineState): MachineState => {
  const controlWord = getControlWord(machineState.cpuRegisters);

  if (debugMode && machineState.cpuRegisters.ic === 0) {
    const r = machineState.cpuRegisters;
    const opcode = machineState.systemMemory.data[r.pc] ?? 0;
    const name = opcodeNames.get(opcode) ?? `???($${opcode.toString(16).padStart(2, '0')})`;
    process.stderr.write(
      `PC=$${r.pc.toString(16).padStart(4, '0')} ${name.padEnd(5)} ` +
      `A=$${r.a.toString(16).padStart(2, '0')} X=$${r.x.toString(16).padStart(2, '0')} ` +
      `Y=$${r.y.toString(16).padStart(2, '0')} SP=$${r.sp.toString(16).padStart(2, '0')} ` +
      `[${formatStatus(r.status)}]\n`,
    );
  }

  let currentState = machineState;
  if (controlWord.spu) {
    currentState = {
      ...currentState,
      cpuRegisters: { ...currentState.cpuRegisters, sp: (currentState.cpuRegisters.sp + 1) & 0xff },
    };
  }

  // eslint-disable-next-line prefer-const
  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(currentState, controlWord);

  if (controlWord.zn) {
    cpuRegisters.status.Z = mainBus.data === 0;
    cpuRegisters.status.N = (mainBus.data & 0x80) !== 0;
  }

  // Real busses are cleared just by having no signals output on them
  mainBus = clearBus(mainBus);

  cpuRegisters = setImmediateFlags({ controlWord, cpuRegisters });

  if (controlWord.c1) {
    cpuRegisters.aluB = 1;
  }

  cpuRegisters = alu.operate({ registers: cpuRegisters, controlWord });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  if (controlWord.spd) {
    cpuRegisters.sp = (cpuRegisters.sp - 1) & 0xff;
  }

  if (controlWord.bra) {
    const offset = cpuRegisters.aluA > 127 ? cpuRegisters.aluA - 256 : cpuRegisters.aluA;
    cpuRegisters.pc = (cpuRegisters.pc + offset) & 0xffff;
  }

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic, controlWord);

  return { cpuRegisters, mainBus, systemMemory, inputDevice: machineState.inputDevice };
};

const SPRITE_PATTERNS_START = 0x7e00;
const FRAMEBUFFER_END = 0xc000;
const MODE_REGISTER = 0xfe04;
const VSYNC_REGISTER = 0xfe05;
const SOUND_START = 0xfe06;
const SOUND_END = 0xfe14;
const SPRITE_REG_START = 0xfe20;
const SPRITE_REG_END = 0xfe40;
const SYNC_INTERVAL = 50_000;

const syncSharedMemory = (memory: Memory) => {
  memory.data[VSYNC_REGISTER] = memory.shared[VSYNC_REGISTER];
  for (let i = SPRITE_PATTERNS_START; i < FRAMEBUFFER_END; i++) {
    memory.shared[i] = memory.data[i] ?? 0;
  }
  memory.shared[MODE_REGISTER] = memory.data[MODE_REGISTER] ?? 0;
  memory.shared[VSYNC_REGISTER] = memory.data[VSYNC_REGISTER] ?? 0;
  for (let i = SOUND_START; i < SOUND_END; i++) {
    memory.shared[i] = memory.data[i] ?? 0;
  }
  for (let i = SPRITE_REG_START; i < SPRITE_REG_END; i++) {
    memory.shared[i] = memory.data[i] ?? 0;
  }
};

let clockTicks = 0;
let runStartTime = BigInt(0);

const run = async (machineState: MachineState): Promise<void> => {
  let state = machineState;
  clockTicks = 0;
  let running = true;
  runStartTime = process.hrtime.bigint();

  const onSigInt = () => { running = false; };
  process.on('SIGINT', onSigInt);

  while (running) {
    const controlWord = getControlWord(state.cpuRegisters);
    state = cycle(state);
    clockTicks++;

    if (controlWord.ht) {
      break;
    }

    if (clockTicks % SYNC_INTERVAL === 0) {
      syncSharedMemory(state.systemMemory);
      if (checkInterrupt(state.inputDevice)) {
        break;
      }
    }
  }

  process.removeListener('SIGINT', onSigInt);
  syncSharedMemory(state.systemMemory);
  await Promise.all([stopGraphics(), stopSound()]);
  teardownStdin(state.inputDevice);
};

/* ##################################################################### */

const parseOrg = (args: string[]): number => {
  const orgIndex = args.indexOf('--org');
  if (orgIndex === -1 || orgIndex + 1 >= args.length) return DEFAULT_LOAD_ADDRESS;
  return parseInt(args[orgIndex + 1], 16);
};

const parseRom = (args: string[]): string => {
  const idx = args.indexOf('--rom');
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return path.join(__dirname, '..', '..', 'programs', 'ehbasic.bin');
};

const start = async () => {
  debugMode = process.argv.includes('--debug');
  const skipArgs = new Set(['--debug', '--org', '--rom']);
  let skipNext = false;
  const binFile = process.argv.slice(2).find((arg) => {
    if (skipNext) { skipNext = false; return false; }
    if (arg === '--org' || arg === '--rom') { skipNext = true; return false; }
    return !skipArgs.has(arg);
  });

  const romFile = parseRom(process.argv);
  const loadAddress = binFile ? parseOrg(process.argv) : 0xC000;
  const cpuRegisters = setupCpuRegisters();
  cpuRegisters.pc = loadAddress;
  const mainBus = setupBus();
  let systemMemory = setupMemory();
  systemMemory = loadBinFileToMemory(systemMemory, romFile, 0xC000);
  if (binFile) {
    systemMemory = loadBinFileToMemory(systemMemory, binFile, loadAddress);
  }
  const inputDevice = createInputDevice();
  setupStdin(inputDevice);
  startGraphics(systemMemory.shared.buffer as SharedArrayBuffer);
  startSound(systemMemory.shared.buffer as SharedArrayBuffer);
  await new Promise((resolve) => setImmediate(resolve));
  await run({ cpuRegisters, mainBus, systemMemory, inputDevice });

  const elapsed = Number(process.hrtime.bigint() - runStartTime) / 1e9;
  const mhz = (clockTicks / elapsed) / 1e6;
  process.stderr.write(`\n${clockTicks} cycles in ${elapsed.toFixed(3)}s (${mhz.toFixed(2)} MHz)\n`);
};

export { start };
