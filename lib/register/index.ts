'use strict';

import { outputToBus } from '../bus';
import { Bus, CpuRegisters, getStatusFlagMap } from '../initial-state';
import { ControlWord, baseControl } from '../control';
import { getLeastSignificantBits } from '../common';

type RegisterInterface = {
  bus: Bus;
  register: number;
  output: boolean;
  input: boolean;
};

type RegisterInterfaceOutput = {
  bus: Bus;
  register: number;
};

type CpuRegistersInterface = {
  bus: Bus;
  registers: CpuRegisters;
  output: boolean;
  input: boolean;
  controlWord: ControlWord;
};

type CpuRegistersInterfaceOutput = {
  bus: Bus;
  registers: CpuRegisters;
};

const interfaceRegister = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    const newBus = outputToBus({ bus, data: register });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

const interfaceInstructionRegister = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    // only put the instruction data bits on the bus
    const registerSlice = getLeastSignificantBits(register, 16);
    const newBus = outputToBus({ bus, data: registerSlice });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

const interfaceAllCPURegisters = ({
  bus,
  registers,
  output,
  input,
  controlWord,
}: CpuRegistersInterface): CpuRegistersInterfaceOutput => {
  const cpuRegisters = { ...registers };
  let mainBus = { ...bus };
  ({ bus: mainBus, register: cpuRegisters.x } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.x,
    output: output && controlWord.xo,
    input: input && controlWord.xi,
  }));

  ({ bus: mainBus, register: cpuRegisters.y } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.y,
    output: output && controlWord.yo,
    input: input && controlWord.yi,
  }));

  ({ bus: mainBus, register: cpuRegisters.a } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.a,
    output: output && controlWord.ao,
    input: input && controlWord.ai,
  }));

  ({ bus: mainBus, register: cpuRegisters.s } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.s,
    output: output && controlWord.so,
    input: input && false,
  }));

  ({ bus: mainBus, register: cpuRegisters.i } = interfaceInstructionRegister({
    bus: mainBus,
    register: cpuRegisters.i,
    output: output && controlWord.io,
    input: input && controlWord.ii,
  }));

  ({ bus: mainBus, register: cpuRegisters.pc } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.pc,
    output: output && controlWord.pco,
    input: input && controlWord.pci,
  }));

  ({ bus: mainBus, register: cpuRegisters.sp } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.sp,
    output: output && controlWord.spo,
    input: input && controlWord.spi,
  }));

  ({ bus: mainBus, register: cpuRegisters.o } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.o,
    output: output && false,
    input: input && controlWord.oi,
  }));

  return { bus: mainBus, registers: cpuRegisters };
};

const incrementProgramCounter = (register: number, counterEnable: boolean): number => {
  if (counterEnable) {
    // 16 bit counter, so roll back to zero if it equals 65535
    if (register >= 0b1111111111111111) {
      return 0b0000000000000000;
    }

    return register + 1;
  }

  return register;
};

const incrementInstructionCounter = (register: number, controlWord: ControlWord): number => {
  if (controlWord === baseControl) {
    return 0b000; // reset the instruction counter if we get an empty control word in order to save extra CPU cycles
  }

  if (controlWord.pci) {
    return 0b000; // reset the instruction counter if the program counter was set on this cycle
  }

  // 3 bit counter, so roll back to zero if it equals 7
  if (register >= 0b111) {
    return 0b000;
  }

  return register + 1;
};

// return true or false for given flag
const getStatusFlag = (statusRegister: number, flag: string): boolean => {
  const flagMap = getStatusFlagMap();
  const flagValue = statusRegister & flagMap[flag];
  return flagValue > 0;
};

// return a new statusRegister
const setStatusFlag = ({
  statusRegister,
  flagsInput,
  flag,
  value,
}: {
  statusRegister: number;
  flagsInput: boolean;
  flag: string;
  value: boolean;
}): number => {
  if (flagsInput) {
    const flagMap = getStatusFlagMap();
    if (value) {
      return statusRegister | flagMap[flag];
    }

    const inverseFlagMap = ~flagMap[flag];
    return statusRegister & inverseFlagMap;
  }

  return statusRegister;
};

export {
  interfaceRegister,
  interfaceAllCPURegisters,
  incrementProgramCounter,
  incrementInstructionCounter,
  getStatusFlag,
  setStatusFlag,
};
