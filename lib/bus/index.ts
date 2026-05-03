'use strict';

import { Bus, CpuRegisters, Memory } from '../initial-state';
import { ControlWord } from '../control';
import { interfaceMemoryAddress, interfaceMemoryData } from '../memory';
import { interfaceAllAddressRegisters, interfaceAllDataRegisters } from '../register';
import { InputDevice } from '../memory/input-device';

type MachineState = {
  cpuRegisters: CpuRegisters;
  mainBus: Bus;
  systemMemory: Memory;
  inputDevice: InputDevice;
};

const outputToDataBus = (bus: Bus, data: number): void => {
  bus.data |= data;
};

const outputToAddressBus = (bus: Bus, address: number): void => {
  bus.address |= address;
};

const dataToAddressHigh = (bus: Bus, enable: boolean): void => {
  if (enable) {
    bus.addressRegister = bus.addressRegister | (bus.data << 8);
  }
};

const dataToAddressLow = (bus: Bus, enable: boolean): void => {
  if (enable) {
    bus.addressRegister = bus.addressRegister | bus.data;
  }
};

const busRegisterToAddress = (bus: Bus, enable: boolean): void => {
  if (enable) {
    bus.address = bus.addressRegister;
  }
};

const clearBus = (bus: Bus): void => {
  const saved = bus.addressRegister;
  bus.addressRegister = 0;
  bus.address = 0;
  bus.data = 0;
  bus.addressRegister = saved;
};

const interfaceAllRegisters = (
  machineState: MachineState,
  controlWord: ControlWord,
): void => {
  const { cpuRegisters, mainBus, systemMemory } = machineState;

  busRegisterToAddress(mainBus, controlWord.bao);

  interfaceAllAddressRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    controlWord,
  });

  interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    controlWord,
    inputDevice: machineState.inputDevice,
  });

  interfaceAllAddressRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    controlWord,
  });

  interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    controlWord,
    inputDevice: machineState.inputDevice,
  });

  interfaceAllDataRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    controlWord,
  });

  interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    controlWord,
    inputDevice: machineState.inputDevice,
  });

  interfaceAllDataRegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    controlWord,
  });

  interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    controlWord,
    inputDevice: machineState.inputDevice,
  });

  if (controlWord.bac) {
    mainBus.addressRegister = 0;
  }

  dataToAddressLow(mainBus, controlWord.dal);
  dataToAddressHigh(mainBus, controlWord.dah);

  if (controlWord.dahc && cpuRegisters.addressCarry) {
    mainBus.addressRegister = (mainBus.addressRegister + 0x100) & 0xffff;
  }

  if (controlWord.bai) {
    mainBus.addressRegister = (mainBus.addressRegister + 1) & 0xffff;
  }

  if (controlWord.irqvec) {
    mainBus.addressRegister = 0xFFFE;
  }
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
