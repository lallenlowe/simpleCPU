'use strict';

import { setupBus, setupCpuRegisters, setupMemory, loadBinFileToMemory } from './initial-state';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';

const cycle = (machineState: MachineState) => {
  const controlWord = getControlWord(machineState.cpuRegisters);

  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(machineState, controlWord);

  // Real busses are cleared just by having no signals output on them
  mainBus = clearBus(mainBus, controlWord);

  cpuRegisters = setImmediateFlags({ controlWord, cpuRegisters });

  cpuRegisters = alu.operate({ registers: cpuRegisters, controlWord });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic, controlWord);

  if (controlWord.oi) {
    console.log(cpuRegisters.o + (cpuRegisters.status.C ? 256 : 0));
  }

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  if (!controlWord.ht) {
    setTimeout(() => cycle(newMachineState), 10);
  } else {
    console.log(newMachineState);
  }
};

/* ##################################################################### */

const start = () => {
  const cpuRegisters = setupCpuRegisters();
  const mainBus = setupBus();
  let systemMemory = setupMemory();
  systemMemory = loadBinFileToMemory(systemMemory, './add1.bin');

  cycle({ cpuRegisters, mainBus, systemMemory });
};

export { start };
