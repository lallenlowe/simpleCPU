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

type CpuRegistersInterface = {
  bus: Bus;
  registers: CpuRegisters;
  output: boolean;
  input: boolean;
  controlWord: ControlWord;
};

const interfaceRegisterAddress = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): number => {
  if (output) {
    outputToAddressBus(bus, register);
  }
  if (input) {
    return bus.address;
  }
  return register;
};

const interfaceRegisterData = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): number => {
  if (output) {
    outputToDataBus(bus, register);
  }
  if (input) {
    return bus.data;
  }
  return register;
};

const interfaceInstructionRegisterAddress = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): number => {
  if (output) {
    const registerSlice = getLeastSignificantBits(register, 16);
    outputToAddressBus(bus, registerSlice);
  }
  if (input) {
    return bus.address;
  }
  return register;
};

const interfaceInstructionRegisterData = ({
  bus,
  register,
  output,
  input,
}: RegisterInterface): number => {
  if (output) {
    const registerSlice = getLeastSignificantBits(register, 16);
    outputToDataBus(bus, registerSlice);
  }
  if (input) {
    return bus.data;
  }
  return register;
};

const interfaceAllAddressRegisters = ({
  bus,
  registers,
  output,
  input,
  controlWord,
}: CpuRegistersInterface): void => {
  registers.i = interfaceInstructionRegisterAddress({
    bus,
    register: registers.i,
    output: output && controlWord.iao,
    input: input && controlWord.iai,
  });

  registers.pc = interfaceRegisterAddress({
    bus,
    register: registers.pc,
    output: output && controlWord.pco,
    input: input && controlWord.pcai,
  });

  if (output && controlWord.spo) {
    outputToAddressBus(bus, 0x0100 | registers.sp);
  }
};

const interfaceAllDataRegisters = ({
  bus,
  registers,
  output,
  input,
  controlWord,
}: CpuRegistersInterface): void => {
  registers.x = interfaceRegisterData({
    bus,
    register: registers.x,
    output: output && controlWord.xo,
    input: input && controlWord.xi,
  });

  registers.y = interfaceRegisterData({
    bus,
    register: registers.y,
    output: output && controlWord.yo,
    input: input && controlWord.yi,
  });

  registers.a = interfaceRegisterData({
    bus,
    register: registers.a,
    output: output && controlWord.ao,
    input: input && controlWord.ai,
  });

  registers.s = interfaceRegisterData({
    bus,
    register: registers.s,
    output: output && controlWord.so,
    input: input && false,
  });

  registers.i = interfaceInstructionRegisterData({
    bus,
    register: registers.i,
    output: output && controlWord.ido,
    input: input && controlWord.idi,
  });

  registers.o = interfaceRegisterData({
    bus,
    register: registers.o,
    output: output && false,
    input: input && controlWord.oi,
  });

  registers.aluA = interfaceRegisterData({
    bus,
    register: registers.aluA,
    output: output && controlWord.lao,
    input: input && controlWord.la,
  });

  registers.aluB = interfaceRegisterData({
    bus,
    register: registers.aluB,
    output: output && false,
    input: input && controlWord.lb,
  });

  if (output && controlWord.pcho) {
    outputToDataBus(bus, (registers.pc >> 8) & 0xff);
  }
  if (output && controlWord.pclo) {
    outputToDataBus(bus, registers.pc & 0xff);
  }
  if (output && controlWord.spdo) {
    outputToDataBus(bus, registers.sp);
  }
  if (output && controlWord.sto) {
    outputToDataBus(bus, statusToByte(registers.status));
  }

  if (input && controlWord.spdi) {
    registers.sp = bus.data;
  }
  if (input && controlWord.sti) {
    registers.status = byteToStatus(bus.data);
  }
};

const statusToByte = (status: CpuRegisters['status']): number => {
  return (
    (status.N ? 0x80 : 0) |
    (status.O ? 0x40 : 0) |
    0x20 |
    (status.B ? 0x10 : 0) |
    (status.D ? 0x08 : 0) |
    (status.I ? 0x04 : 0) |
    (status.Z ? 0x02 : 0) |
    (status.C ? 0x01 : 0)
  );
};

const byteToStatus = (byte: number): CpuRegisters['status'] => {
  return {
    N: (byte & 0x80) !== 0,
    O: (byte & 0x40) !== 0,
    B: (byte & 0x10) !== 0,
    D: (byte & 0x08) !== 0,
    I: (byte & 0x04) !== 0,
    Z: (byte & 0x02) !== 0,
    C: (byte & 0x01) !== 0,
  };
};

const incrementProgramCounter = (register: number, counterEnable: boolean): number => {
  if (counterEnable) {
    if (register >= 0b1111111111111111) {
      return 0b0000000000000000;
    }

    return register + 1;
  }

  return register;
};

const incrementInstructionCounter = (register: number, controlWord: ControlWord): number => {
  if (controlWord === baseControl) {
    return 0b000;
  }

  if (controlWord.pcai) {
    return 0b000;
  }

  if (register >= 0b1111) {
    return 0b0000;
  }

  return register + 1;
};

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
}): void => {
  if (flagsInput) {
    cpuRegisters.status[flag] = value;
  }
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
