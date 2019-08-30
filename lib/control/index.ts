'use strict';

import * as _ from 'lodash';

const instructionMap = {
  LDA: 0xa9,
  LDX: 0xa2,
  LDY: 0xa0,
  STA: 0x85,
  STX: 0x86,
  STY: 0x84,
};

type ControlWord = {
  xi: Boolean; // x register input
  xo: Boolean; // x register output
  yi: Boolean; // y register input
  yo: Boolean; // y register output
  ai: Boolean; // a register input
  ao: Boolean; // a register output
  ii: Boolean; // instruction register input
  io: Boolean; // instruction register output
  pci: Boolean; // program counter input
  pco: Boolean; // program counter output
  pce: Boolean; // program counter enable
  spi: Boolean; // stack pointer input
  spo: Boolean; // stack pointer output
  mi: Boolean; // memory address register input
  mo: Boolean; // memory address register output
  ri: Boolean; // ram data input
  ro: Boolean; // ram data output
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
};

const instructions: Array<MicroInstructions> = [];
instructions[instructionMap.LDX] = [
  Object.assign({ ...baseControl }, { io: true, mi: true }),
  Object.assign({ ...baseControl }, { ro: true, xi: true }),
];

const getControlWord = (instruction: number, instructionCounter: number): ControlWord => {
  // always load next instruction from ram into instruction register, takes 2 cycles
  if (instructionCounter === 0) {
    return Object.assign({ ...baseControl }, { pco: true, mi: true });
  }
  if (instructionCounter === 1) {
    return Object.assign({ ...baseControl }, { ro: true, ii: true, pce: true });
  }

  // get the next word from the instructions array
  // subtract 2 from counter to compensate for the 2 load instruction cycles
  return _.get(instructions, `[${instruction}][${instructionCounter - 2}]`) || baseControl;
};

export { ControlWord, getControlWord };
