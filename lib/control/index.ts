'use strict';


import { CpuRegisters } from '../initial-state';

type InstructionMap = { [key: string]: number };

const instructionMap: InstructionMap = {
  BRK: 0x00, // Break — halt execution | IMPLIED
  NOP: 0xea, // No Operation, | IMPLIED
  CLC: 0x18, // Clear the carry flag | IMPLIED
  SEC: 0x38, // Set the carry flag | IMPLIED
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
  TXA: 0x8a, // Transfer the value of x register to a register | IMPLIED
  TYA: 0x98, // Transfer the value of y register to a register | IMPLIED
  CLV: 0xb8, // Clear the overflow flag | IMPLIED
  SEI: 0x78, // Set the interrupt disable flag | IMPLIED
  CLI: 0x58, // Clear the interrupt disable flag | IMPLIED
  SED: 0xf8, // Set the decimal mode flag | IMPLIED
  CLD: 0xd8, // Clear the decimal mode flag | IMPLIED
  STAA: 0x8d, // Store the contents of the a register to an absolute memory address | ABSOLUTE
  STXA: 0x8e, // Store the contents of the x register to an absolute memory address | ABSOLUTE
  STYA: 0x8c, // Store the contents of the y register to an absolute memory address | ABSOLUTE
  SBCI: 0xe9, // Subtract with carry | IMMEDIATE
  SBCA: 0xed, // Subtract with carry | ABSOLUTE
  ANDI: 0x29, // Bitwise AND with accumulator | IMMEDIATE
  ANDA: 0x2d, // Bitwise AND with accumulator | ABSOLUTE
  ORAI: 0x09, // Bitwise OR with accumulator | IMMEDIATE
  ORAA: 0x0d, // Bitwise OR with accumulator | ABSOLUTE
  EORI: 0x49, // Bitwise XOR with accumulator | IMMEDIATE
  EORA: 0x4d, // Bitwise XOR with accumulator | ABSOLUTE
  ASLA: 0x0a, // Arithmetic shift left accumulator | IMPLIED
  ASLM: 0x0e, // Arithmetic shift left memory | ABSOLUTE
  LSRA: 0x4a, // Logical shift right accumulator | IMPLIED
  LSRM: 0x4e, // Logical shift right memory | ABSOLUTE
  ROLA: 0x2a, // Rotate left accumulator | IMPLIED
  ROLM: 0x2e, // Rotate left memory | ABSOLUTE
  RORA: 0x6a, // Rotate right accumulator | IMPLIED
  RORM: 0x6e, // Rotate right memory | ABSOLUTE
  BITA: 0x2c, // Bit test accumulator with memory | ABSOLUTE
  INCA: 0x1a, // Increment accumulator | IMPLIED (65C02)
  INCM: 0xee, // Increment memory | ABSOLUTE
  DECA: 0x3a, // Decrement accumulator | IMPLIED (65C02)
  DECM: 0xce, // Decrement memory | ABSOLUTE
  INX: 0xe8, // Increment x register | IMPLIED
  DEX: 0xca, // Decrement x register | IMPLIED
  INY: 0xc8, // Increment y register | IMPLIED
  DEY: 0x88, // Decrement y register | IMPLIED
  CPXI: 0xe0, // Compare x register | IMMEDIATE
  CPXA: 0xec, // Compare x register | ABSOLUTE
  CPYI: 0xc0, // Compare y register | IMMEDIATE
  CPYA: 0xcc, // Compare y register | ABSOLUTE
  BEQ: 0xf0, // Branch if zero flag set | RELATIVE
  BNE: 0xd0, // Branch if zero flag clear | RELATIVE
  BCS: 0xb0, // Branch if carry set | RELATIVE
  BCC: 0x90, // Branch if carry clear | RELATIVE
  BMI: 0x30, // Branch if negative flag set | RELATIVE
  BPL: 0x10, // Branch if negative flag clear | RELATIVE
  BVS: 0x70, // Branch if overflow set | RELATIVE
  BVC: 0x50, // Branch if overflow clear | RELATIVE
  JSR: 0x20, // Jump to subroutine | ABSOLUTE
  RTS: 0x60, // Return from subroutine | IMPLIED
  PHA: 0x48, // Push accumulator | IMPLIED
  PLA: 0x68, // Pull accumulator | IMPLIED
  PHP: 0x08, // Push processor status | IMPLIED
  PLP: 0x28, // Pull processor status | IMPLIED
  TXS: 0x9a, // Transfer X to stack pointer | IMPLIED
  TSX: 0xba, // Transfer stack pointer to X | IMPLIED
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
  bac: boolean; // clear the bus address register
  dc: boolean; // do compare x and y registers
  dE: boolean; // do sum on x and y registers
  dS: boolean; // do subtract on x and y registers
  dAnd: boolean; // do bitwise AND on x and y registers
  dOr: boolean; // do bitwise OR on x and y registers
  dXor: boolean; // do bitwise XOR on x and y registers
  asl: boolean; // arithmetic shift left x register
  lsr: boolean; // logical shift right x register
  rol: boolean; // rotate left x register through carry
  ror: boolean; // rotate right x register through carry
  bit: boolean; // bit test aluA AND aluB, set flags only
  la: boolean; // latch ALU input A from data bus
  lb: boolean; // latch ALU input B from data bus
  c1: boolean; // load constant 1 into ALU input B
  bra: boolean; // branch relative: add signed data bus value to PC
  zn: boolean; // set Z and N flags from data bus value
  fi: boolean; // cpu status flags in
  ht: boolean; // halt the computer
  spd: boolean; // decrement stack pointer (post-write)
  spu: boolean; // increment stack pointer (pre-read)
  pcho: boolean; // output PC high byte to data bus
  pclo: boolean; // output PC low byte to data bus
  spdo: boolean; // output stack pointer to data bus
  spdi: boolean; // input stack pointer from data bus
  sto: boolean; // output status register as byte to data bus
  sti: boolean; // input status register from data bus byte
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
  bac: false, // clear the bus address register
  dc: false, // do compare x and y registers
  dE: false, // do sum on x and y registers
  dS: false, // do subtract on x and y registers
  dAnd: false, // do bitwise AND on x and y registers
  dOr: false, // do bitwise OR on x and y registers
  dXor: false, // do bitwise XOR on x and y registers
  asl: false, // arithmetic shift left x register
  lsr: false, // logical shift right x register
  rol: false, // rotate left x register through carry
  ror: false, // rotate right x register through carry
  bit: false, // bit test aluA AND aluB, set flags only
  la: false, // latch ALU input A from data bus
  lb: false, // latch ALU input B from data bus
  c1: false, // load constant 1 into ALU input B
  bra: false, // branch relative: add signed data bus value to PC
  zn: false, // set Z and N flags from data bus value
  fi: false, // cpu status flags in
  ht: false, // halt the computer
  spd: false, // decrement stack pointer (post-write)
  spu: false, // increment stack pointer (pre-read)
  pcho: false, // output PC high byte to data bus
  pclo: false, // output PC low byte to data bus
  spdo: false, // output stack pointer to data bus
  spdi: false, // input stack pointer from data bus
  sto: false, // output status register as byte to data bus
  sti: false, // input status register from data bus byte
  if: [], // Cpu status flags to set immediately
};

type MicroInstructions = Array<ControlWord>;

const loadNextInstruction: MicroInstructions = [
  Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, idi: true, pce: true }),
];

const instructions: { [key: number]: { [key: string]: MicroInstructions } } = {
  [instructionMap.BRK]: { 0: [Object.assign({ ...baseControl }, { ht: true })] },
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
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true }),
    ],
  },
  [instructionMap.ADCA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ADCI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.CMPA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.LDAA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.LDAI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, ai: true, pce: true, zn: true })],
  },
  [instructionMap.LDXI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, xi: true, pce: true, zn: true })],
  },
  [instructionMap.LDXA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.LDYI]: {
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, yi: true, pce: true, zn: true })],
  },
  [instructionMap.LDYA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.TAX]: {
    0: [Object.assign({ ...baseControl }, { ao: true, xi: true, zn: true })],
  },
  [instructionMap.TAY]: {
    0: [Object.assign({ ...baseControl }, { ao: true, yi: true, zn: true })],
  },
  [instructionMap.TXA]: {
    0: [Object.assign({ ...baseControl }, { xo: true, ai: true, zn: true })],
  },
  [instructionMap.TYA]: {
    0: [Object.assign({ ...baseControl }, { yo: true, ai: true, zn: true })],
  },
  [instructionMap.CLV]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'O', value: false }] })],
  },
  [instructionMap.SEI]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'I', value: true }] })],
  },
  [instructionMap.CLI]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'I', value: false }] })],
  },
  [instructionMap.SED]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'D', value: true }] })],
  },
  [instructionMap.CLD]: {
    0: [Object.assign({ ...baseControl }, { if: [{ flag: 'D', value: false }] })],
  },
  [instructionMap.STAA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.STXA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, xo: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.STYA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, yo: true, ri: true, bac: true }),
    ],
  },
  // SBC - subtract with carry (A + ~operand + C)
  [instructionMap.SBCI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  // AND - bitwise AND with accumulator
  [instructionMap.ANDI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  // ORA - bitwise OR with accumulator
  [instructionMap.ORAI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  // EOR - bitwise XOR with accumulator
  [instructionMap.EORI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  // ASL - arithmetic shift left
  [instructionMap.ASLA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, asl: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ASLM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { asl: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // LSR - logical shift right
  [instructionMap.LSRA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, lsr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.LSRM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { lsr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // ROL - rotate left through carry
  [instructionMap.ROLA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, rol: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ROLM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { rol: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // ROR - rotate right through carry
  [instructionMap.RORA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, ror: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.RORM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { ror: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // BIT - test bits in memory with accumulator
  [instructionMap.BITA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, bit: true, fi: true }),
    ],
  },
  // INC - increment
  [instructionMap.INCA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, c1: true, dE: true, fi: true, if: [{ flag: 'C', value: false }] }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.INCM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dE: true, fi: true, if: [{ flag: 'C', value: false }] }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // DEC - decrement
  [instructionMap.DECA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, c1: true, dS: true, fi: true, if: [{ flag: 'C', value: true }] }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.DECM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dS: true, fi: true, if: [{ flag: 'C', value: true }] }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  // INX/DEX/INY/DEY - increment/decrement registers
  [instructionMap.INX]: {
    0: [
      Object.assign({ ...baseControl }, { xo: true, la: true, c1: true, dE: true, fi: true, if: [{ flag: 'C', value: false }] }),
      Object.assign({ ...baseControl }, { so: true, xi: true }),
    ],
  },
  [instructionMap.DEX]: {
    0: [
      Object.assign({ ...baseControl }, { xo: true, la: true, c1: true, dS: true, fi: true, if: [{ flag: 'C', value: true }] }),
      Object.assign({ ...baseControl }, { so: true, xi: true }),
    ],
  },
  [instructionMap.INY]: {
    0: [
      Object.assign({ ...baseControl }, { yo: true, la: true, c1: true, dE: true, fi: true, if: [{ flag: 'C', value: false }] }),
      Object.assign({ ...baseControl }, { so: true, yi: true }),
    ],
  },
  [instructionMap.DEY]: {
    0: [
      Object.assign({ ...baseControl }, { yo: true, la: true, c1: true, dS: true, fi: true, if: [{ flag: 'C', value: true }] }),
      Object.assign({ ...baseControl }, { so: true, yi: true }),
    ],
  },
  // CPX - compare x register
  [instructionMap.CPXI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.CPXA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { xo: true, la: true, dc: true, fi: true }),
    ],
  },
  // CPY - compare y register
  [instructionMap.CPYI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, lb: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.CPYA]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, la: true, dc: true, fi: true }),
    ],
  },
  // Branch instructions — relative addressing
  // "branch if set": flag key = branch, 0 = skip
  [instructionMap.BEQ]: {
    Z: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
  },
  [instructionMap.BCS]: {
    C: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
  },
  [instructionMap.BMI]: {
    N: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
  },
  [instructionMap.BVS]: {
    O: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
  },
  // "branch if clear": 0 = branch, flag key = skip
  [instructionMap.BNE]: {
    Z: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
  },
  [instructionMap.BCC]: {
    C: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
  },
  [instructionMap.BPL]: {
    N: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
  },
  [instructionMap.BVC]: {
    O: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, pce: true })],
    0: [Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true, bra: true })],
  },
  // Stack operations
  [instructionMap.JSR]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, pcho: true, ri: true, spd: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, pclo: true, ri: true, spd: true }),
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true }),
    ],
  },
  [instructionMap.RTS]: {
    0: [
      Object.assign({ ...baseControl }, { spu: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, ro: true, dal: true }),
      Object.assign({ ...baseControl }, { spu: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, ro: true, dah: true }),
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true }),
    ],
  },
  [instructionMap.PHA]: {
    0: [
      Object.assign({ ...baseControl }, { spo: true, mi: true, ao: true, ri: true, spd: true }),
    ],
  },
  [instructionMap.PLA]: {
    0: [
      Object.assign({ ...baseControl }, { spu: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, ro: true, ai: true, zn: true }),
    ],
  },
  [instructionMap.PHP]: {
    0: [
      Object.assign({ ...baseControl }, { spo: true, mi: true, sto: true, ri: true, spd: true }),
    ],
  },
  [instructionMap.PLP]: {
    0: [
      Object.assign({ ...baseControl }, { spu: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, ro: true, sti: true }),
    ],
  },
  [instructionMap.TXS]: {
    0: [Object.assign({ ...baseControl }, { xo: true, spdi: true })],
  },
  [instructionMap.TSX]: {
    0: [Object.assign({ ...baseControl }, { spdo: true, xi: true, zn: true })],
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
): ControlWord | undefined => {
  if (!instructions[instructionIndex]) {
    return undefined;
  }
  const conditionalKey = Object.keys(instructions[instructionIndex]).find((key) => {
    return cpuRegisters.status[key];
  });

  if (conditionalKey) {
    return instructions[instructionIndex]?.[conditionalKey]?.[counter];
  }

  return undefined;
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
    instructions[instructionIndex]?.[0]?.[counter] ||
    baseControl
  );
};

export { instructionMap, ControlWord, setImmediateFlags, getControlWord, baseControl };
