'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory, LOAD_ADDRESS } from './initial-state';
import { instructionMap } from './control';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';
import { createInputDevice, setupStdin, teardownStdin } from './memory/input-device';

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

const run = (machineState: MachineState): void => {
  let state = machineState;
  let cycles = 0;
  const startTime = process.hrtime.bigint();
  for (;;) {
    const controlWord = getControlWord(state.cpuRegisters);
    state = cycle(state);
    cycles++;
    if (controlWord.ht) {
      const elapsed = Number(process.hrtime.bigint() - startTime) / 1e9;
      const mhz = (cycles / elapsed) / 1e6;
      process.stderr.write(`\n${cycles} cycles in ${elapsed.toFixed(3)}s (${mhz.toFixed(2)} MHz)\n`);
      teardownStdin(state.inputDevice);
      return;
    }
  }
};

/* ##################################################################### */

const start = () => {
  debugMode = process.argv.includes('--debug');
  const binFile = process.argv.find((arg) => arg !== '--debug' && !arg.includes('node') && !arg.includes('index.js'));
  if (!binFile) {
    console.error('Usage: simplecpu <file.bin> [--debug]');
    process.exit(1);
  }

  const cpuRegisters = setupCpuRegisters();
  cpuRegisters.pc = LOAD_ADDRESS;
  const mainBus = setupBus();
  let systemMemory = setupMemory();
  systemMemory = loadBinFileToMemory(systemMemory, binFile);
  const inputDevice = createInputDevice();
  setupStdin(inputDevice);

  run({ cpuRegisters, mainBus, systemMemory, inputDevice });
};

export { start };
