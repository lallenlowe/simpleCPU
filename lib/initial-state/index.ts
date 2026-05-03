'use strict';

import * as fs from 'fs';

type Byte = boolean[];

type Bus = {
  addressRegister: number; // 16 bit
  address: number; // 16 bit
  data: number; // 8 bit
};

type CpuRegisters = {
  x: number; // 8 bit x register
  y: number; // 8 bit y register
  a: number; // 8 bit accumulator register
  s: number; // 8 bit sum register (ALU output latch)
  aluA: number; // 8 bit ALU input latch A
  aluB: number; // 8 bit ALU input latch B
  i: number; // instruction register
  ic: number; // instruction counter
  pc: number; // 16 bit program counter
  sp: number; // 8 bit stack pointer
  o: number; // 8 bit output register
  addressCarry: boolean; // internal carry latch for address arithmetic
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
  shared: Uint8Array;
};

const setupBus = (): Bus => {
  return {
    addressRegister: 0b0000000000000000,
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
    aluA: 0b00000000,
    aluB: 0b00000000,
    i: 0b0000000000000000,
    ic: 0b00000000,
    pc: 0b0000000000000000,
    sp: 0xff,
    o: 0b00000000,
    addressCarry: false,
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
  const sharedBuffer = new SharedArrayBuffer(65536);
  return {
    addressRegister: 0,
    data: [],
    shared: new Uint8Array(sharedBuffer),
  };
};

const DEFAULT_LOAD_ADDRESS = 0x0200;

const loadBinFileToMemory = (memory: Memory, fileName: string, loadAddress: number = DEFAULT_LOAD_ADDRESS): Memory => {
  const newMemory = { ...memory };
  const file = fs.readFileSync(fileName, { encoding: 'hex' });
  const chunks = file.match(/.{2}/g) || [];
  chunks.forEach((chunk, index) => {
    newMemory.data[loadAddress + index] = parseInt(chunk, 16);
  });

  return newMemory;
};

export {
  Byte,
  Bus,
  CpuRegisters,
  Memory,
  DEFAULT_LOAD_ADDRESS,
  setupBus,
  setupCpuRegisters,
  setupMemory,
  loadBinFileToMemory,
};
