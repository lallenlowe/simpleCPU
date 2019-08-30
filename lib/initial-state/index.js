'use strict';

const setupBus = () => {
  return {
    address: 0b0000000000000000,
    data: 0b00000000,
  };
};

const setupCpuRegisters = () => {
  return {
    x: 0b00000000, // x register
    y: 0b00000000, // y register
    a: 0b00000000, // accumulator register
    pc: 0b00000000, // program counter
    sp: 0b0000000000000000, // stack pointer
    status: 0b0000000, // status flags, C, Z, I, D, B, O, N
  };
};

const getStatusFlagMap = () => {
  return {
    C: 0b1000000, // Carry
    Z: 0b0100000, // Zero
    I: 0b0010000, // Interrupt Disable
    D: 0b0001000, // Decimal Mode
    B: 0b0000100, // Break Command
    O: 0b0000010, // Overflow Flag
    N: 0b0000001, // Negative Flag
  };
};

const setupMemory = () => {
  return { addressRegister: 0b00000000, data: [0b10101010] };
};

module.exports = {
  setupBus,
  setupCpuRegisters,
  getStatusFlagMap,
  setupMemory,
};
