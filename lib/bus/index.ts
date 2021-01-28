'use strict';

import { Bus, CpuRegisters, Memory, setupBus } from '../initial-state';
import { ControlWord } from '../control';
import { interfaceMemoryAddress, interfaceMemoryData } from '../memory';
import { interfaceAllAddressRegisters, interfaceAllDataRegisters } from '../register';

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

const outputToAddressBus = ({ bus, address }: { bus: Bus; address: number }): Bus => {
  const newBus = { ...bus };
  newBus.address |= address;

  return newBus;
};

const dataToAddressHigh = (bus: Bus, enable: boolean): Bus => {
  if (enable) {
    const newBus = { ...bus };
    newBus.addressRegister = bus.addressRegister | (bus.data << 8);

    return newBus;
  }

  return bus;
};

const dataToAddressLow = (bus: Bus, enable: boolean): Bus => {
  if (enable) {
    const newBus = { ...bus };
    newBus.addressRegister = bus.addressRegister | bus.data;

    return newBus;
  }

  return bus;
};

const busRegisterToAddress = (bus: Bus, enable: boolean): Bus => {
  if (enable) {
    const newBus = { ...bus };
    newBus.address = bus.addressRegister;

    return newBus;
  }

  return bus;
};

const clearBus = (bus: Bus, controlWord: ControlWord) => {
  const newBus = setupBus();
  if (!controlWord.bac) {
    newBus.addressRegister = bus.addressRegister;
  }

  return newBus;
};

const interfaceAllRegisters = (
  machineState: MachineState,
  controlWord: ControlWord,
): MachineState => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;

  mainBus = busRegisterToAddress(mainBus, controlWord.bao);

  /* Output pass first since real hardware is parallel and this is synchronous */
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllAddressRegisters({
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
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllAddressRegisters({
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
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllDataRegisters({
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
  ({ registers: cpuRegisters, bus: mainBus } = interfaceAllDataRegisters({
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

  mainBus = dataToAddressLow(mainBus, controlWord.dal);
  mainBus = dataToAddressHigh(mainBus, controlWord.dah);

  return { cpuRegisters, mainBus, systemMemory };
};

export {
  MachineState,
  interfaceAllRegisters,
  outputToAddressBus,
  outputToDataBus,
  dataToAddressHigh,
  dataToAddressLow,
  busRegisterToAddress,
  clearBus,
};
