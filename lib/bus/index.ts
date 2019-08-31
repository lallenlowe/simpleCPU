'use strict';

import { Bus, CpuRegisters, Memory, setupBus } from '../initial-state';
import { ControlWord } from '../control';
import { interfaceMemory } from '../memory';
import { interfaceAllCPURegisters } from '../register';

type MachineState = {
  cpuRegisters: CpuRegisters;
  mainBus: Bus;
  systemMemory: Memory;
};

const outputToBus = ({ bus, data }: { bus: Bus; data: number }) => {
  const newBus = { ...bus };
  newBus.data |= data;

  return newBus;
};

const clearBus = setupBus;

const interfaceAllRegisters = (
  machineState: MachineState,
  controlWord: ControlWord,
): MachineState => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;

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

  return { cpuRegisters, mainBus, systemMemory };
};

export { MachineState, interfaceAllRegisters, outputToBus, clearBus };
