'use strict';

type Bus = {
  data: number; // 16 bit
};

type CpuRegisters = {
  x: number; // 8 bit x register
  y: number; // 8 bit y register
  a: number; // 8 bit accumulator register
  i: number; // instruction register
  ic: number; // instruction counter
  pc: number; // 16 bit program counter
  sp: number; // 16 bit stack pointer
  o: number; // 8 bit output register
  status: number; // 7 bit status flags, C, Z, I, D, B, O, N
};

// 7 bit numbers
type StatusFlagMap = {
  [K: string]: number; // Kill
  C: number; // Carry
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
    data: 0b0000000000000000,
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
    o: 0b00000000,
    status: 0b0000000,
  };
};

const getStatusFlagMap = (): StatusFlagMap => {
  return {
    K: 0b10000000,
    C: 0b01000000,
    Z: 0b00100000,
    I: 0b00010000,
    D: 0b00001000,
    B: 0b00000100,
    O: 0b00000010,
    N: 0b00000001,
  };
};

const setupMemory = (): Memory => {
  // put a command and some data in memory for now for testing.
  const mem = {
    addressRegister: 0b0000000000000000,
    data: [0xa2000f, 0xa00010, 0x010000, 0x85000f, 0xa2000f, 0xa00010, 0x010000, 0x000000],
  };
  mem.data[15] = 16;
  mem.data[16] = 54;
  return mem;
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
