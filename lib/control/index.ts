'use strict';

import * as _ from 'lodash';
// import { setStatusFlag } from '../register';
import { getStatusFlagMap } from '../initial-state';

const instructionMap = {
  HLT: 0x00, // Halt the computer, stop the whole program
  OTA: 0x01, // Output the value of the a register
  SEC: 0x26, // Set the carry flag
  ADC: 0x6d, // Add with carry
  LDA: 0xa9, // Load the a register with a value from a memory address
  LDX: 0xa2, // Load the x register with a value from a memory address
  LDY: 0xa0, // Load the y register with a value from a memory address
  TSA: 0xaa, // Transfer the value of sum to the a register
  STA: 0x85, // Store the contents of the a register to a memory address
  STX: 0x86, // Store the contents of the x register to a memory address
  STY: 0x84, // Store the contents of the y register to a memory address
};

type ControlWord = {
  xi: boolean; // x register input
  xo: boolean; // x register output
  yi: boolean; // y register input
  yo: boolean; // y register output
  ai: boolean; // a register input
  ao: boolean; // a register output
  so: boolean; // sum register output
  ii: boolean; // instruction register input
  io: boolean; // instruction register output
  pci: boolean; // program counter input
  pco: boolean; // program counter output
  pce: boolean; // program counter enable
  spi: boolean; // stack pointer input
  spo: boolean; // stack pointer output
  mi: boolean; // memory address register input
  mo: boolean; // memory address register output
  ri: boolean; // ram data input
  ro: boolean; // ram data output
  oi: boolean; // output register in
  co: boolean; // comparator output to cpu flags
  if: number; // Cpu status flags to set immediately
};

type MicroInstructions = Array<ControlWord>;

const baseControl: ControlWord = {
  xi: false, // x register input
  xo: false, // x register output
  yi: false, // y register input
  yo: false, // y register output
  ai: false, // a register input
  ao: false, // a register output
  so: false, // sum register output
  ii: false, // instruction register input
  io: false, // instruction register output
  pci: false, // program counter input
  pco: false, // program counter output
  pce: false, // program counter enable
  spi: false, // stack pointer input
  spo: false, // stack pointer output
  mi: false, // memory address register input
  mo: false, // memory address register output
  ri: false, // ram data input
  ro: false, // ram data output
  oi: false, // output register in
  co: false, // comparator output to cpu flags
  if: 0b00000000, // immediate flags to set on command
};

const instructions: Array<MicroInstructions> = [];
instructions[instructionMap.HLT] = [
  Object.assign({ ...baseControl }, { if: getStatusFlagMap()['K'] }),
];
instructions[instructionMap.OTA] = [Object.assign({ ...baseControl }, { ao: true, oi: true })];
instructions[instructionMap.LDA] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, ai: true }),
];
instructions[instructionMap.LDX] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, xi: true }),
];
instructions[instructionMap.LDY] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, yi: true }),
];
instructions[instructionMap.TSA] = [Object.assign({ ...baseControl }, { so: true, ai: true })];
instructions[instructionMap.STA] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ao: true, ri: true }),
];
instructions[instructionMap.STX] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { xo: true, ri: true }),
];
instructions[instructionMap.STY] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { yo: true, ri: true }),
];

const setImmediateFlags = (controlWord: ControlWord): number => {
  return controlWord.if;
};

const getControlWord = (instruction: number, instructionCounter: number): ControlWord => {
  // always load next instruction from ram into instruction register, takes 2 cycles
  if (instructionCounter === 0) {
    return Object.assign({ ...baseControl }, { pco: true, mi: true });
  }
  if (instructionCounter === 1) {
    return Object.assign({ ...baseControl }, { ro: true, ii: true, pce: true });
  }

  // subtract 2 from counter to compensate for the 2 load instruction cycles
  const counter = instructionCounter - 2;
  // only get the most significant 8 bits of the instruction since those represent the instruction itself not the data
  const instructionIndex = instruction >> 16;
  // get the next word from the instructions array
  return _.get(instructions, `[${instructionIndex}][${counter}]`) || baseControl;
};

export { instructionMap, ControlWord, setImmediateFlags, getControlWord };
