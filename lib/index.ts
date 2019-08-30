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
import { interfaceAllCPURegisters, incrementProgramCounter } from './register';
import * as alu from './alu';

type MachineState = {
  cpuRegisters: CpuRegisters;
  mainBus: Bus;
  systemMemory: Memory;
};

const cycle = (machineState: MachineState) => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;

  /* Output pass first since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    /* pass control word for setting input/output flags */
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    /* pass control word for setting input/output flags */
  }));

  /* Input pass next since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    /* pass control word for setting input/output flags */
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    /* pass control word for setting input/output flags */
  }));

  cpuRegisters = alu.operate({ registers: cpuRegisters /* control word */ });

  cpuRegisters.pc = incrementProgramCounter(cpuRegisters.pc, true); // control code for counter enable

  const newMachineState: MachineState = { cpuRegisters, mainBus, systemMemory };
  setImmediate(() => cycle(newMachineState));
  if (cpuRegisters.pc % 10000 === 0) {
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
