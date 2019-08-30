'use strict';

import {
  Bus,
  CpuRegisters,
  Memory,
  setupBus,
  setupCpuRegisters,
  setupMemory,
} from './initial-state';
import { interfaceMemory } from './memory';
import {
  interfaceAllCPURegisters,
  incrementProgramCounter,
  incrementInstructionCounter,
} from './register';
import { getControlWord } from './control';
import * as alu from './alu';
import { clearBus } from './bus';

type MachineState = {
  cpuRegisters: CpuRegisters;
  mainBus: Bus;
  systemMemory: Memory;
};

const cycle = (machineState: MachineState) => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;
  const controlWord = getControlWord(cpuRegisters.i, cpuRegisters.ic);

  /* Output pass first since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    controlWord,
  }));

  /* Input pass next since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    controlWord,
  }));

  cpuRegisters = alu.operate({ registers: cpuRegisters /* control word */ });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, controlWord.pce);

  cpuRegisters.ic = incrementInstructionCounter(cpuRegisters.ic);

  mainBus = clearBus();

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  // setImmediate(() => cycle(newMachineState));
  setTimeout(() => cycle(newMachineState), 1000);
  // if (cpuRegisters.pc % 10000 === 0) {
  console.log(newMachineState);
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
