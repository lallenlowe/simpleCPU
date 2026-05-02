'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory, DEFAULT_LOAD_ADDRESS } from './initial-state';
import { instructionMap } from './control';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';
import { createInputDevice, setupStdin, teardownStdin, checkInterrupt } from './memory/input-device';
import { startGraphics, stopGraphics } from './graphics';

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

const CYCLES_PER_BATCH = 50_000;

const run = (machineState: MachineState): void => {
  let state = machineState;
  let cycles = 0;
  const startTime = process.hrtime.bigint();

  const batch = () => {
    for (let i = 0; i < CYCLES_PER_BATCH; i++) {
      const controlWord = getControlWord(state.cpuRegisters);
      state = cycle(state);
      cycles++;
      if (controlWord.ht) {
        const elapsed = Number(process.hrtime.bigint() - startTime) / 1e9;
        const mhz = (cycles / elapsed) / 1e6;
        process.stderr.write(`\n${cycles} cycles in ${elapsed.toFixed(3)}s (${mhz.toFixed(2)} MHz)\n`);
        stopGraphics();
        teardownStdin(state.inputDevice);
        return;
      }
    }
    if (checkInterrupt(state.inputDevice)) {
      stopGraphics();
      teardownStdin(state.inputDevice);
      return;
    }
    setImmediate(batch);
  };

  batch();
};

/* ##################################################################### */

const parseOrg = (args: string[]): number => {
  const orgIndex = args.indexOf('--org');
  if (orgIndex === -1 || orgIndex + 1 >= args.length) return DEFAULT_LOAD_ADDRESS;
  return parseInt(args[orgIndex + 1], 16);
};

const start = () => {
  debugMode = process.argv.includes('--debug');
  const skipArgs = new Set(['--debug', '--org']);
  let skipNext = false;
  const binFile = process.argv.slice(2).find((arg) => {
    if (skipNext) { skipNext = false; return false; }
    if (arg === '--org') { skipNext = true; return false; }
    return !skipArgs.has(arg);
  });
  if (!binFile) {
    console.error('Usage: simplecpu <file.bin> [--org XXXX] [--debug]');
    process.exit(1);
  }

  const loadAddress = parseOrg(process.argv);
  const cpuRegisters = setupCpuRegisters();
  cpuRegisters.pc = loadAddress;
  const mainBus = setupBus();
  let systemMemory = setupMemory();
  systemMemory = loadBinFileToMemory(systemMemory, binFile, loadAddress);
  const inputDevice = createInputDevice();
  setupStdin(inputDevice);
  startGraphics(systemMemory.data);

  process.on('SIGINT', () => {
    stopGraphics();
    teardownStdin(inputDevice);
    process.exit(0);
  });

  run({ cpuRegisters, mainBus, systemMemory, inputDevice });
};

export { start };
