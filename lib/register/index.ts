'use strict';

import { outputToAddressBus, outputToDataBus } from '../bus';
import { Bus, CpuRegisters } from '../initial-state';
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

const interfaceRegisterAddress = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    const newBus = outputToAddressBus({ bus, address: register });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.address };
  }

  return { bus, register };
};

const interfaceRegisterData = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    const newBus = outputToDataBus({ bus, data: register });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

const interfaceInstructionRegisterAddress = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    // only put the instruction data bits on the bus
    const registerSlice = getLeastSignificantBits(register, 16);
    const newBus = outputToAddressBus({ bus, address: registerSlice });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.address };
  }

  return { bus, register };
};

const interfaceInstructionRegisterData = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): RegisterInterfaceOutput => {
  if (output) {
    // only put the instruction data bits on the bus
    const registerSlice = getLeastSignificantBits(register, 16);
    const newBus = outputToDataBus({ bus, data: registerSlice });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

const interfaceAllAddressRegisters = ({
  bus,
  registers,
  output,
  input,
  controlWord,
}: CpuRegistersInterface): CpuRegistersInterfaceOutput => {
  const cpuRegisters = { ...registers };
  let mainBus = { ...bus };

  ({ bus: mainBus, register: cpuRegisters.i } = interfaceInstructionRegisterAddress({
    bus: mainBus,
    register: cpuRegisters.i,
    output: output && controlWord.iao,
    input: input && controlWord.iai,
  }));

  ({ bus: mainBus, register: cpuRegisters.pc } = interfaceRegisterAddress({
    bus: mainBus,
    register: cpuRegisters.pc,
    output: output && controlWord.pco,
    input: input && controlWord.pcai,
  }));

  ({ bus: mainBus, register: cpuRegisters.sp } = interfaceRegisterAddress({
    bus: mainBus,
    register: cpuRegisters.sp,
    output: output && controlWord.spo,
    input: input && controlWord.spi,
  }));

  return { bus: mainBus, registers: cpuRegisters };
};

const interfaceAllDataRegisters = ({
  bus,
  registers,
  output,
  input,
  controlWord,
}: CpuRegistersInterface): CpuRegistersInterfaceOutput => {
  const cpuRegisters = { ...registers };
  let mainBus = { ...bus };
  ({ bus: mainBus, register: cpuRegisters.x } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.x,
    output: output && controlWord.xo,
    input: input && controlWord.xi,
  }));

  ({ bus: mainBus, register: cpuRegisters.y } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.y,
    output: output && controlWord.yo,
    input: input && controlWord.yi,
  }));

  ({ bus: mainBus, register: cpuRegisters.a } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.a,
    output: output && controlWord.ao,
    input: input && controlWord.ai,
  }));

  ({ bus: mainBus, register: cpuRegisters.s } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.s,
    output: output && controlWord.so,
    input: input && false,
  }));

  ({ bus: mainBus, register: cpuRegisters.i } = interfaceInstructionRegisterData({
    bus: mainBus,
    register: cpuRegisters.i,
    output: output && controlWord.ido,
    input: input && controlWord.idi,
  }));

  ({ bus: mainBus, register: cpuRegisters.o } = interfaceRegisterData({
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

  if (controlWord.pcai) {
    return 0b000; // reset the instruction counter if the program counter was set on this cycle
  }

  // 3 bit counter, so roll back to zero if it equals 7
  if (register >= 0b111) {
    return 0b000;
  }

  return register + 1;
};

// return a new statusRegister
const setStatusFlag = ({
  cpuRegisters,
  flagsInput,
  flag,
  value,
}: {
  cpuRegisters: CpuRegisters;
  flagsInput: boolean;
  flag: string;
  value: boolean;
}): CpuRegisters => {
  if (flagsInput) {
    const newCpuRegisters = { ...cpuRegisters };
    newCpuRegisters.status[flag] = value;

    return newCpuRegisters;
  }

  return cpuRegisters;
};

export {
  interfaceRegisterAddress,
  interfaceRegisterData,
  interfaceAllAddressRegisters,
  interfaceAllDataRegisters,
  incrementProgramCounter,
  incrementInstructionCounter,
  setStatusFlag,
};
