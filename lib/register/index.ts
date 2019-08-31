'use strict';

import { outputToBus } from '../bus';
import { Bus, CpuRegisters, StatusFlagMap } from '../initial-state';
import { ControlWord } from '../control';
import { getLeastSignificantBits } from '../common';

type RegisterInterface = {
  bus: Bus;
  register: number;
  output: Boolean;
  input: Boolean;
};

type RegisterInterfaceOutput = {
  bus: Bus;
  register: number;
};

type CpuRegistersInterface = {
  bus: Bus;
  registers: CpuRegisters;
  output: Boolean;
  input: Boolean;
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

const incrementProgramCounter = (register: number, counterEnable: Boolean): number => {
  if (counterEnable) {
    // 16 bit counter, so roll back to zero if it equals 65535
    if (register >= 0b1111111111111111) {
      return 0b0000000000000000;
    }

    return register + 1;
  }

  return register;
};

const incrementInstructionCounter = (register: number): number => {
  // 3 bit counter, so roll back to zero if it equals 7
  if (register >= 0b111) {
    return 0b000;
  }

  return register + 1;
};

// return true or false for given flag
const getStatusFlag = (statusRegister: number, flagMap: StatusFlagMap, flag: string): Boolean => {
  const flagValue = statusRegister & flagMap[flag];
  return flagValue > 0;
};

// return a new statusRegister
const setStatusFlag = ({
  statusRegister,
  flagMap,
  flag,
  value,
}: {
  statusRegister: number;
  flagMap: StatusFlagMap;
  flag: string;
  value: Boolean;
}): number => {
  if (value) {
    return statusRegister | flagMap[flag];
  }

  const inverseFlagMap = ~flagMap[flag];
  return statusRegister & inverseFlagMap;
};

export {
  interfaceRegister,
  interfaceAllCPURegisters,
  incrementProgramCounter,
  incrementInstructionCounter,
  getStatusFlag,
  setStatusFlag,
};
