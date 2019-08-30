'use strict';

type Bus = {
  address: number; // 16 bit
  data: number; // 8 bit
};

type CpuRegisters = {
  x: number; // 8 bit x register
  y: number; // 8 bit y register
  a: number; // 8 bit accumulator register
  i: number; // instruction register
  ic: number; // instruction counter
  pc: number; // 16 bit program counter
  sp: number; // 16 bit stack pointer
  status: number; // 7 bit status flags, C, Z, I, D, B, O, N
};

// 7 bit numbers
type StatusFlagMap = {
  [C: string]: number; // Carry
  Z: number; // Zero
  I: number; // Interrupt Disable
  D: number; // Decimal Mode
  B: number; // Break Command
  O: number; // Overflow Flag
  N: number; // Negative Flag
};

type Memory = {
  addressRegister: number;
  data: number[];
};

const setupBus = (): Bus => {
  return {
    address: 0b0000000000000000,
    data: 0b00000000,
  };
};

const setupCpuRegisters = (): CpuRegisters => {
  return {
    x: 0b00000000,
    y: 0b00000000,
    a: 0b00000000,
    i: 0b0000000000000000,
    ic: 0b00000000,
    pc: 0b0000000000000000,
    sp: 0b0000000000000000,
    status: 0b0000000,
  };
};

const getStatusFlagMap = (): StatusFlagMap => {
  return {
    C: 0b1000000,
    Z: 0b0100000,
    I: 0b0010000,
    D: 0b0001000,
    B: 0b0000100,
    O: 0b0000010,
    N: 0b0000001,
  };
};

const setupMemory = (): Memory => {
  return { addressRegister: 0b0000000000000000, data: [0b10101010] };
};

export {
  Bus,
  CpuRegisters,
  StatusFlagMap,
  Memory,
  setupBus,
  setupCpuRegisters,
  getStatusFlagMap,
  setupMemory,
};
