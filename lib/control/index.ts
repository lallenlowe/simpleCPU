'use strict';

import _ from 'lodash';
import { CpuRegisters } from '../initial-state';

type InstructionMap = { [key: string]: number };

const instructionMap: InstructionMap = {
  HLT: 0x00, // Halt the computer, stop the whole program
  OTA: 0x01, // Output the value of the a register
  NOP: 0x02, // No Operation,
  CLC: 0x18, // Clear the carry flag
  SEC: 0x26, // Set the carry flag
  CLZ: 0x27, // Clear the carry flag
  SEZ: 0x28, // Set the carry flag
  JMP: 0x4c, // Jump to the given address
  JMC: 0x4d, // Jump to the given address if the carry flag is set
  JMZ: 0x4e, // Jump to the given address if the zero flag is set
  ADC: 0x6d, // Add with carry
  CMP: 0xcd, // Compare contents of a register to contents of a memory address
  //LDA: 0xa9, // Load the a register with a value from a memory address
  LDAA: 0xad, // Load the a register with a value from absolute memory address
  LDAI: 0xa9,
  LDX: 0xa2, // Load the x register with a value from a memory address
  LDY: 0xa0, // Load the y register with a value from a memory address
  TSA: 0xaa, // Transfer the value of sum to the a register
  STA: 0x85, // Store the contents of the a register to a memory address
  STX: 0x86, // Store the contents of the x register to a memory address
  STY: 0x84, // Store the contents of the y register to a memory address
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
  [instructionMap.SEZ]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'Z', value: true }] })],
  },
  [instructionMap.CLZ]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'Z', value: false }] })],
  },
  [instructionMap.JMP]: { 0: [Object.assign({ ...baseControl }, { iao: true, pcai: true })] },
  [instructionMap.JMC]: {
    C: [Object.assign({ ...baseControl }, { iao: true, pcai: true })],
  },
  [instructionMap.JMZ]: {
    Z: [Object.assign({ ...baseControl }, { iao: true, pcai: true })],
  },
  [instructionMap.ADC]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, xi: true }),
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, yi: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMP]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, xi: true }),
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, yi: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.LDA]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, ai: true }),
    ],
  },
  [instructionMap.LDAA]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, ai: true }),
    ],
  },
  [instructionMap.LDAI]: {
    0: [Object.assign({ ...baseControl }, { ido: true, ai: true })],
  },
  [instructionMap.LDX]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, xi: true }),
    ],
  },
  [instructionMap.LDY]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ro: true, yi: true }),
    ],
  },
  [instructionMap.TSA]: { 0: [Object.assign({ ...baseControl }, { so: true, ai: true })] },
  [instructionMap.STA]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { ao: true, ri: true }),
    ],
  },
  [instructionMap.STX]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { xo: true, ri: true }),
    ],
  },
  [instructionMap.STY]: {
    0: [
      Object.assign({ ...baseControl }, { iao: true, mi: true }),
      Object.assign({ ...baseControl }, { yo: true, ri: true }),
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
  const instructionIndex = cpuRegisters.i >> 16;
  // get the next word from the instructions array

  return (
    getConditionalInstruction(cpuRegisters, instructionIndex, counter) ||
    _.get(instructions, `${instructionIndex}.0[${counter}]`) ||
    baseControl
  );
};

export { instructionMap, ControlWord, setImmediateFlags, getControlWord, baseControl };
