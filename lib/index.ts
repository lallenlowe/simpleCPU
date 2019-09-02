'use strict';

import { setupBus, setupCpuRegisters, setupMemory } from './initial-state';
import { incrementProgramCounter, incrementInstructionCounter, getStatusFlag } from './register';
import { setImmediateFlags, getControlWord } from './control';
import * as alu from './alu';
import { MachineState, clearBus, interfaceAllRegisters } from './bus';

const cycle = (machineState: MachineState) => {
  const controlWord = getControlWord(machineState.cpuRegisters.i, machineState.cpuRegisters.ic);

  let { cpuRegisters, mainBus, systemMemory } = interfaceAllRegisters(machineState, controlWord);

  cpuRegisters.status = setImmediateFlags(controlWord);

  cpuRegisters = alu.operate({ registers: cpuRegisters, controlWord });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic);

  mainBus = clearBus();

  if (controlWord.oi) {
    console.log(cpuRegisters.o);
  }

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  if (!getStatusFlag(cpuRegisters.status, 'K')) {
    setImmediate(() => cycle(newMachineState));
  } else {
    console.log(newMachineState);
  }
};

/* ##################################################################### */

const start = () => {
  const cpuRegisters = setupCpuRegisters();
  const mainBus = setupBus();
  const systemMemory = setupMemory();

  cycle({ cpuRegisters, mainBus, systemMemory });
};

export { start };
