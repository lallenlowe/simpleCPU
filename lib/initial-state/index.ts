'use strict';

import * as fs from 'fs';

type Byte = boolean[];

type Bus = {
  address: number; // 16 bit
  data: number; // 8 bit
};

type CpuRegisters = {
  x: number; // 8 bit x register
  y: number; // 8 bit y register
  a: number; // 8 bit accumulator register
  s: number; // 8 bit sum register
  i: number; // instruction register
  ic: number; // instruction counter
  pc: number; // 16 bit program counter
  sp: number; // 8 bit stack pointer
  o: number; // 8 bit output register
  status: {
    [C: string]: boolean; // Carry
    Z: boolean; // Zero
    I: boolean; // Interrupt Disable
    D: boolean; // Decimal Mode
    B: boolean; // Break command
    O: boolean; // Overflow
    N: boolean; // Negative
  }; // 7 1-bit status flag registers, C, Z, I, D, B, O, N
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
    s: 0b00000000,
    i: 0b0000000000000000,
    ic: 0b00000000,
    pc: 0b0000000000000000,
    sp: 0b00000000,
    o: 0b00000000,
    status: {
      C: false,
      Z: false,
      I: false,
      D: false,
      B: false,
      O: false,
      N: false,
    },
  };
};

const setupMemory = (): Memory => {
  // put a command and some data in memory for now for testing.
  const mem = {
    addressRegister: 0b0000000000000000,
    data: [],
  };

  return mem;
};

const loadBinFileToMemory = (memory: Memory, fileName: string): Memory => {
  const newMemory = { ...memory };
  const file = fs.readFileSync(fileName, { encoding: 'hex' });
  const chunks = file.match(/.{10}/g) || [];
  const memoryContents: number[] = [];
  chunks.forEach((chunk) => {
    const index = parseInt(chunk.slice(0, 4), 16);
    memoryContents[index] = parseInt(chunk.slice(4), 16);
  });

  newMemory.data = memoryContents;

  return newMemory;
};

export {
  Byte,
  Bus,
  CpuRegisters,
  Memory,
  setupBus,
  setupCpuRegisters,
  setupMemory,
  loadBinFileToMemory,
};
