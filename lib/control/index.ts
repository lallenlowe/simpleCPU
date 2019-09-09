'use strict';

import _ from 'lodash';
import { CpuRegisters } from '../initial-state';

type InstructionMap = { [key: string]: number };

const instructionMap: InstructionMap = {
  HLT: 0x00, // Halt the computer, stop the whole program | IMPLIED
  OTA: 0x02, // Output the value of the a register | IMPLIED
  NOP: 0xea, // No Operation, | IMPLIED
  CLC: 0x18, // Clear the carry flag | IMPLIED
  SEC: 0x26, // Set the carry flag | IMPLIED
  JMP: 0x4c, // Jump to the given address | ABSOLUTE
  ADCI: 0x69, // Add with carry | IMMEDIATE
  ADCA: 0x6d, // Add with carry | ABSOLUTE
  CMPI: 0xc9, // Compare contents of a register to immediate contents of memory | IMMEDIATE
  CMPA: 0xcd, // Compare contents of a register to contents of a memory address | ABSOLUTE
  LDAA: 0xad, // Load the a register with a value from absolute memory address | ABSOLUTE
  LDAI: 0xa9, // Load the a register with an immediate value | IMMEDIATE
  LDXI: 0xa2, // Load the x register with an immediate value | IMMEDIATE
  LDXA: 0xae, // Load the x register with a value from absolute memory address | ABSOLUTE
  LDYI: 0xa0, // Load the y register with an immediate value | IMMEDIATE
  LDYA: 0xac, // Load the y register with a value from absolute memory address | ABSOLUTE
  TAX: 0xaa, // Transfer the value of a register to x register | IMPLIED
  TAY: 0xa8, // Transfer the value of a register to y register | IMPLIED
  STAA: 0x8d, // Store the contents of the a register to an absolute memory address | ABSOLUTE
  STXA: 0x8e, // Store the contents of the x register to an absolute memory address | ABSOLUTE
  STYA: 0x8c, // Store the contents of the y register to an absolute memory address | ABSOLUTE
};

type ControlWord = {
  xi: boolean; // x register input from data bus
  xo: boolean; // x register output to data bus
  yi: boolean; // y register input from data bus
  yo: boolean; // y register output to data bus
  ai: boolean; // a register input from data bus
  ao: boolean; // a register output to data bus
  so: boolean; // sum register output to data bus
  idi: boolean; // instruction register input from data bus
  iai: boolean; // instruction register input from address bus
  ido: boolean; // instruction register output to data bus
  iao: boolean; // instruction register output to address bus
  pcai: boolean; // program counter input from address bus
  pco: boolean; // program counter output to address bus
  pce: boolean; // program counter enable
  spi: boolean; // stack pointer input from address bus
  spo: boolean; // stack pointer output to address bus
  mi: boolean; // memory address register input from address bus
  mo: boolean; // memory address register output to address bus
  ri: boolean; // ram data input from data bus
  ro: boolean; // ram data output to data bus
  oi: boolean; // output register in from data bus
  dah: boolean; // copy contents of data bus into the high 8 bits of the bus addressRegister
  dal: boolean; // copy contents of data bus into the low 8 bits of the bus addressRegister
  bao: boolean; // bus address register out to address bus
  dc: boolean; // do compare x and y registers
  dE: boolean; // do sum on x and y registers
  fi: boolean; // cpu status flags in
  ht: boolean; // halt the computer
  if: { flag: string; value: boolean }[]; // Cpu status flags to set immediately
};

const baseControl: ControlWord = {
  xi: false, // x register input from data bus
  xo: false, // x register output to data bus
  yi: false, // y register input from data bus
  yo: false, // y register output to data bus
  ai: false, // a register input from data bus
  ao: false, // a register output to data bus
  so: false, // sum register output to data bus
  idi: false, // instruction register input from data bus
  iai: false, // instruction register input from address bus
  ido: false, // instruction register output to data bus
  iao: false, // instruction register output to address bus
  pcai: false, // program counter input from address bus
  pco: false, // program counter output to address bus
  pce: false, // program counter enable
  spi: false, // stack pointer input from address bus
  spo: false, // stack pointer output to address bus
  mi: false, // memory address register input from address bus
  mo: false, // memory address register output to address bus
  ri: false, // ram data input from data bus
  ro: false, // ram data output to data bus
  oi: false, // output register in from data bus
  dah: false, // copy contents of data bus into the high 8 bits of the address bus
  dal: false, // copy contents of data bus into the low 8 bits of the address bus
  bao: false, // bus address register out to address bus
  dc: false, // do compare x and y registers
  dE: false, // do sum on x and y registers
  fi: false, // cpu status flags in
  ht: false, // halt the computer
  if: [], // Cpu status flags to set immediately
};

type MicroInstructions = Array<ControlWord>;

const loadNextInstruction: MicroInstructions = [
  Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, idi: true, pce: true }),
];

const instructions: { [key: number]: { [key: string]: MicroInstructions } } = {
  [instructionMap.HLT]: { 0: [Object.assign({ ...baseControl }, { ht: true })] },
  [instructionMap.OTA]: { 0: [Object.assign({ ...baseControl }, { ao: true, oi: true })] },
  [instructionMap.NOP]: { 0: [] },
  [instructionMap.SEC]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'C', value: true }] })],
  },
  [instructionMap.CLC]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'C', value: false }] })],
  },
  [instructionMap.JMP]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, pcai: true }),
    ],
  },
  [instructionMap.ADCA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true }),
      Object.assign({ ...baseControl }, { ao: true, yi: true, dE: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ADCI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, yi: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, xi: true, dE: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, yi: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, xi: true }),
      Object.assign({ ...baseControl }, { dc: true, fi: true }),
    ],
  },
  [instructionMap.CMPA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true }),
      Object.assign({ ...baseControl }, { ao: true, xi: true }),
      Object.assign({ ...baseControl }, { dc: true, fi: true }),
    ],
  },
  [instructionMap.LDAA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true }),
    ],
  },
  [instructionMap.LDAI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, ai: true, pce: true })],
  },
  [instructionMap.LDXI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, xi: true, pce: true })],
  },
  [instructionMap.LDXA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true }),
    ],
  },
  [instructionMap.LDYI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, yi: true, pce: true })],
  },
  [instructionMap.LDYA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true }),
    ],
  },
  [instructionMap.TAX]: {
    0: [Object.assign({ ...baseControl }, { ao: true, xi: true })],
  },
  [instructionMap.TAY]: {
    0: [Object.assign({ ...baseControl }, { ao: true, yi: true })],
  },
  [instructionMap.STAA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true }),
    ],
  },
  [instructionMap.STXA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, xo: true, ri: true }),
    ],
  },
  [instructionMap.STYA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, yo: true, ri: true }),
    ],
  },
};

const setImmediateFlags = ({
  controlWord,
  cpuRegisters,
}: {
  controlWord: ControlWord;
  cpuRegisters: CpuRegisters;
}): CpuRegisters => {
  const newCpuRegisters = { ...cpuRegisters };
  controlWord.if.forEach((flag) => {
    newCpuRegisters.status[flag.flag] = flag.value;
  });

  return newCpuRegisters;
};

const getConditionalInstruction = (
  cpuRegisters: CpuRegisters,
  instructionIndex: number,
  counter: number,
): ControlWord | boolean => {
  const conditionalKey = Object.keys(instructions[instructionIndex]).find((key) => {
    return cpuRegisters.status[key];
  });

  if (conditionalKey) {
    return _.get(instructions, `${instructionIndex}.${conditionalKey}[${counter}]`);
  }

  return false;
};

const getControlWord = (cpuRegisters: CpuRegisters): ControlWord => {
  // always load next instruction from ram into instruction register, takes 2 cycles
  if (cpuRegisters.ic < 1) {
    return loadNextInstruction[cpuRegisters.ic];
  }

  // subtract 1 from counter to compensate for the 1 load instruction cycle
  const counter = cpuRegisters.ic - 1;
  // only use the most significant 8 bits of the instruction since those represent the instruction itself not the data
  const instructionIndex = cpuRegisters.i;
  // get the next word from the instructions array

  return (
    getConditionalInstruction(cpuRegisters, instructionIndex, counter) ||
    _.get(instructions, `${instructionIndex}.0[${counter}]`) ||
    baseControl
  );
};

export { instructionMap, ControlWord, setImmediateFlags, getControlWord, baseControl };
