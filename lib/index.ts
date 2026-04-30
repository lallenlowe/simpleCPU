'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory } from './initial-state';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';

const cycle = (machineState: MachineState): MachineState => {
  const controlWord = getControlWord(machineState.cpuRegisters);

  // eslint-disable-next-line prefer-const
  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(machineState, controlWord);

  if (controlWord.zn) {
    cpuRegisters.status.Z = mainBus.data === 0;
    cpuRegisters.status.N = (mainBus.data & 0x80) !== 0;
  }

  // Real busses are cleared just by having no signals output on them
  mainBus = clearBus(mainBus, controlWord);

  cpuRegisters = setImmediateFlags({ controlWord, cpuRegisters });

  if (controlWord.c1) {
    cpuRegisters.aluB = 1;
  }

  cpuRegisters = alu.operate({ registers: cpuRegisters, controlWord });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  if (controlWord.bra) {
    const offset = cpuRegisters.aluA > 127 ? cpuRegisters.aluA - 256 : cpuRegisters.aluA;
    cpuRegisters.pc = (cpuRegisters.pc + offset) & 0xffff;
  }

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic, controlWord);

  return { cpuRegisters, mainBus, systemMemory };
};

const run = (machineState: MachineState): void => {
  let state = machineState;
  for (;;) {
    const controlWord = getControlWord(state.cpuRegisters);
    state = cycle(state);
    if (controlWord.ht) {
      return;
    }
  }
};

/* ##################################################################### */

const start = () => {
  const binFile = process.argv[2];
  if (!binFile) {
    console.error('Usage: simplecpu <file.bin>');
    process.exit(1);
  }

  const cpuRegisters = setupCpuRegisters();
  const mainBus = setupBus();
  let systemMemory = setupMemory();
  systemMemory = loadBinFileToMemory(systemMemory, binFile);

  run({ cpuRegisters, mainBus, systemMemory });
};

export { start };
