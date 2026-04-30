'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory } from './initial-state';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';

const cycle = (machineState: MachineState) => {
  const controlWord = getControlWord(machineState.cpuRegisters);

  // eslint-disable-next-line prefer-const
  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(machineState, controlWord);

  // Real busses are cleared just by having no signals output on them
  mainBus = clearBus(mainBus, controlWord);

  cpuRegisters = setImmediateFlags({ controlWord, cpuRegisters });

  if (controlWord.c1) {
    cpuRegisters.aluB = 1;
  }

  cpuRegisters = alu.operate({ registers: cpuRegisters, controlWord });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic, controlWord);

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  if (!controlWord.ht) {
    setTimeout(() => cycle(newMachineState), 10);
  } else {
    process.exit(0);
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

  cycle({ cpuRegisters, mainBus, systemMemory });
};

export { start };
