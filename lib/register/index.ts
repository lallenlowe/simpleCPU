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

  if (output && controlWord.spo) {
    mainBus = outputToAddressBus({ bus: mainBus, address: 0x0100 | cpuRegisters.sp });
  }

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

  ({ bus: mainBus, register: cpuRegisters.aluA } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.aluA,
    output: output && controlWord.lao,
    input: input && controlWord.la,
  }));

  ({ bus: mainBus, register: cpuRegisters.aluB } = interfaceRegisterData({
    bus: mainBus,
    register: cpuRegisters.aluB,
    output: output && false,
    input: input && controlWord.lb,
  }));

  if (output && controlWord.pcho) {
    mainBus = outputToDataBus({ bus: mainBus, data: (cpuRegisters.pc >> 8) & 0xff });
  }
  if (output && controlWord.pclo) {
    mainBus = outputToDataBus({ bus: mainBus, data: cpuRegisters.pc & 0xff });
  }
  if (output && controlWord.spdo) {
    mainBus = outputToDataBus({ bus: mainBus, data: cpuRegisters.sp });
  }
  if (output && controlWord.sto) {
    mainBus = outputToDataBus({ bus: mainBus, data: statusToByte(cpuRegisters.status) });
  }

  if (input && controlWord.spdi) {
    cpuRegisters.sp = mainBus.data;
  }
  if (input && controlWord.sti) {
    cpuRegisters.status = byteToStatus(mainBus.data);
  }

  return { bus: mainBus, registers: cpuRegisters };
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

  // 4 bit counter, so roll back to zero if it equals 15
  if (register >= 0b1111) {
    return 0b0000;
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
