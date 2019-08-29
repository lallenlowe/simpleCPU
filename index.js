'use strict';

// This is an experiment in simulating a very simple CPU.
// It is VERY loosely based on the classic 6502 Processor.
// It will not run 6502 code, but hopefully I can get it to run something similar someday.

const bin2dec = (bin) => {
  return parseInt(bin, 2).toString(10);
};

const dec2bin = (dec) => {
  return (dec >>> 0).toString(2);
};

const mainBus = {
  address: 0b0000000000000000, // js numbers always 32 bit signed integer when used with bitwise operators
  data: 0b00000000,
};

const cpuRegisters = {
  x: 0b00000000, // x register
  y: 0b00000000, // y register
  a: 0b00000000, // accumulator register
  pc: 0b00000000, // program counter
  sp: 0b0000000000000000, // stack pointer
  status: 0b0000000, // status flags, C, Z, I, D, B, O, N
};

const statusFlagMap = {
  C: 0b1000000, // Carry
  Z: 0b0100000, // Zero
  I: 0b0010000, // Interrupt Disable
  D: 0b0001000, // Decimal Mode
  B: 0b0000100, // Break Command
  O: 0b0000010, // Overflow Flag
  N: 0b0000001, // Negative Flag
};

const systemMemory = [];

const interfaceMemory = ({ bus, memory, read, write }) => {
  if (read) {
    const newBus = { ...bus };
    newBus.data = memory[bus.address];
    return { bus: newBus, memory };
  }

  if (write) {
    const newMemory = [...memory];
    newMemory[bus.address] = bus.data;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceRegister = ({ bus, register, read, write }) => {
  if (read) {
    const newBus = { ...bus };
    newBus.data = register;
    return { bus: newBus, register };
  }

  if (write) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

// return true or false for given flag
const getStatusFlag = (statusRegister, flagMap, flag) => {
  const flagValue = statusRegister & flagMap[flag];
  return flagValue > 0;
};

// return a new statusRegister
const setStatusFlag = ({ statusRegister, flagMap, flag, value }) => {
  if (value) {
    return statusRegister | flagMap[flag];
  }

  const inverseFlagMap = ~flagMap[flag];
  return statusRegister & inverseFlagMap;
};

/* ##################################################################### */
cpuRegisters.status = setStatusFlag({
  statusRegister: cpuRegisters.status,
  flagMap: statusFlagMap,
  flag: 'Z',
  value: true,
});

console.log(getStatusFlag(cpuRegisters.status, statusFlagMap, 'Z'));

cpuRegisters.status = setStatusFlag({
  statusRegister: cpuRegisters.status,
  flagMap: statusFlagMap,
  flag: 'C',
  value: true,
});

cpuRegisters.status = setStatusFlag({
  statusRegister: cpuRegisters.status,
  flagMap: statusFlagMap,
  flag: 'B',
  value: true,
});

cpuRegisters.status = setStatusFlag({
  statusRegister: cpuRegisters.status,
  flagMap: statusFlagMap,
  flag: 'B',
  value: false,
});

console.log(getStatusFlag(cpuRegisters.status, statusFlagMap, 'C'));

console.log(dec2bin(cpuRegisters.status));

const { bus, memory } = interfaceMemory({
  bus: mainBus,
  memory: systemMemory,
  read: false,
  write: true,
});

const { bus: newBus, memory: newMemory } = interfaceMemory({
  bus,
  memory,
  read: true,
  write: false,
});

console.log(newBus, newMemory);
