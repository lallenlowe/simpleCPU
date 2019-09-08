'use strict';

import { Bus, CpuRegisters, Memory, setupBus } from '../initial-state';
import { ControlWord } from '../control';
import { interfaceMemoryAddress, interfaceMemoryData } from '../memory';
import { interfaceAllCPUAddressRegisters, interfaceAllCPUDataRegisters } from '../register';

type MachineState = {
  cpuRegisters: CpuRegisters;
  mainBus: Bus;
  systemMemory: Memory;
};

const outputToDataBus = ({ bus, data }: { bus: Bus; data: number }) => {
  const newBus = { ...bus };
  newBus.data |= data;

  return newBus;
};

const outputToAddressBus = ({ bus, address }: { bus: Bus; address: number }) => {
  const newBus = { ...bus };
  newBus.address |= address;

  return newBus;
};

const clearBus = setupBus;

const interfaceAllRegisters = (
  machineState: MachineState,
  controlWord: ControlWord,
): MachineState => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;
  /* Output pass first since real hardware is parallel and this is synchronous */
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllCPUAddressRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    controlWord,
  }));

  /* Input pass next since real hardware is parallel and this is synchronous */
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllCPUAddressRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    controlWord,
  }));

  /* Another output pass since we have 2 busses, data and address */
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllCPUDataRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    controlWord,
  }));

  /* Another input pass since we have 2 busses, data and address */
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllCPUDataRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    controlWord,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    controlWord,
  }));

  return { cpuRegisters, mainBus, systemMemory };
};

export { MachineState, interfaceAllRegisters, outputToAddressBus, outputToDataBus, clearBus };
