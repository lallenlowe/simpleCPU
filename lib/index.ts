'use strict';

import { setupBus, setupCpuRegisters, setupMemory } from './initial-state';
import { incrementProgramCounter, incrementInstructionCounter } from './register';
import { getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';

const cycle = (machineState: MachineState) => {
  const controlWord = getControlWord(machineState.cpuRegisters.i, machineState.cpuRegisters.ic);

  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(machineState, controlWord);

  cpuRegisters = alu.operate({ registers: cpuRegisters /* control word */ });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic);

  mainBus = clearBus();

  if (controlWord.oi) {
    console.log(cpuRegisters.o);
    process.exit();
  }

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  setImmediate(() => cycle(newMachineState));
  //setTimeout(() => cycle(newMachineState), 1000);
  // if (cpuRegisters.pc % 10000 === 0) {
  //console.log(newMachineState);
  // }
};

/* ##################################################################### */

const start = () => {
  const cpuRegisters = setupCpuRegisters();
  const mainBus = setupBus();
  const systemMemory = setupMemory();

  cycle({ cpuRegisters, mainBus, systemMemory });
};

export { start };
