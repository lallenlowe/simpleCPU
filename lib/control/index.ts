'use strict';

import * as _ from 'lodash';
// import { setStatusFlag } from '../register';

const instructionMap = {
  BRK: 0x00,
  OTA: 0x01,
  LDA: 0xa9,
  LDX: 0xa2,
  LDY: 0xa0,
  STA: 0x85,
  STX: 0x86,
  STY: 0x84,
};

type ControlWord = {
  xi: boolean; // x register input
  xo: boolean; // x register output
  yi: boolean; // y register input
  yo: boolean; // y register output
  ai: boolean; // a register input
  ao: boolean; // a register output
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
};

type MicroInstructions = Array<ControlWord>;

const baseControl: ControlWord = {
  xi: false, // x register input
  xo: false, // x register output
  yi: false, // y register input
  yo: false, // y register output
  ai: false, // a register input
  ao: false, // a register output
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
};

const instructions: Array<MicroInstructions> = [];
instructions[instructionMap.OTA] = [Object.assign({ ...baseControl }, { ao: true, oi: true })];
instructions[instructionMap.LDX] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, xi: true }),
];
instructions[instructionMap.LDY] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, yi: true }),
];

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

export { ControlWord, getControlWord };
