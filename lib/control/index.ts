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
  // Zero page addressing
  LDAZ: 0xa5, // Load A from zero page | ZERO PAGE
  STAZ: 0x85, // Store A to zero page | ZERO PAGE
  LDXZ: 0xa6, // Load X from zero page | ZERO PAGE
  STXZ: 0x86, // Store X to zero page | ZERO PAGE
  LDYZ: 0xa4, // Load Y from zero page | ZERO PAGE
  STYZ: 0x84, // Store Y to zero page | ZERO PAGE
  ADCZ: 0x65, // Add with carry zero page | ZERO PAGE
  SBCZ: 0xe5, // Subtract with carry zero page | ZERO PAGE
  ANDZ: 0x25, // AND zero page | ZERO PAGE
  ORAZ: 0x05, // ORA zero page | ZERO PAGE
  EORZ: 0x45, // EOR zero page | ZERO PAGE
  CMPZ: 0xc5, // Compare A zero page | ZERO PAGE
  CPXZ: 0xe4, // Compare X zero page | ZERO PAGE
  CPYZ: 0xc4, // Compare Y zero page | ZERO PAGE
  BITZ: 0x24, // Bit test zero page | ZERO PAGE
  ASLZ: 0x06, // ASL zero page | ZERO PAGE
  LSRZ: 0x46, // LSR zero page | ZERO PAGE
  ROLZ: 0x26, // ROL zero page | ZERO PAGE
  RORZ: 0x66, // ROR zero page | ZERO PAGE
  INCZ: 0xe6, // INC zero page | ZERO PAGE
  DECZ: 0xc6, // DEC zero page | ZERO PAGE
  // Zero page indexed
  LDAZX: 0xb5, // Load A from zero page,X | ZERO PAGE,X
  STAZX: 0x95, // Store A to zero page,X | ZERO PAGE,X
  LDYZX: 0xb4, // Load Y from zero page,X | ZERO PAGE,X
  STYZX: 0x94, // Store Y to zero page,X | ZERO PAGE,X
  ADCZX: 0x75, // ADC zero page,X | ZERO PAGE,X
  SBCZX: 0xf5, // SBC zero page,X | ZERO PAGE,X
  ANDZX: 0x35, // AND zero page,X | ZERO PAGE,X
  ORAZX: 0x15, // ORA zero page,X | ZERO PAGE,X
  EORZX: 0x55, // EOR zero page,X | ZERO PAGE,X
  CMPZX: 0xd5, // CMP zero page,X | ZERO PAGE,X
  ASLZX: 0x16, // ASL zero page,X | ZERO PAGE,X
  LSRZX: 0x56, // LSR zero page,X | ZERO PAGE,X
  ROLZX: 0x36, // ROL zero page,X | ZERO PAGE,X
  RORZX: 0x76, // ROR zero page,X | ZERO PAGE,X
  INCZX: 0xf6, // INC zero page,X | ZERO PAGE,X
  DECZX: 0xd6, // DEC zero page,X | ZERO PAGE,X
  LDXZY: 0xb6, // Load X from zero page,Y | ZERO PAGE,Y
  STXZY: 0x96, // Store X to zero page,Y | ZERO PAGE,Y
  // Absolute indexed
  LDAAX: 0xbd, // Load A from absolute,X | ABSOLUTE,X
  STAAX: 0x9d, // Store A to absolute,X | ABSOLUTE,X
  LDYAX: 0xbc, // Load Y from absolute,X | ABSOLUTE,X
  ADCAX: 0x7d, // ADC absolute,X | ABSOLUTE,X
  SBCAX: 0xfd, // SBC absolute,X | ABSOLUTE,X
  ANDAX: 0x3d, // AND absolute,X | ABSOLUTE,X
  ORAAX: 0x1d, // ORA absolute,X | ABSOLUTE,X
  EORAX: 0x5d, // EOR absolute,X | ABSOLUTE,X
  CMPAX: 0xdd, // CMP absolute,X | ABSOLUTE,X
  ASLAX: 0x1e, // ASL absolute,X | ABSOLUTE,X
  LSRAX: 0x5e, // LSR absolute,X | ABSOLUTE,X
  ROLAX: 0x3e, // ROL absolute,X | ABSOLUTE,X
  RORAX: 0x7e, // ROR absolute,X | ABSOLUTE,X
  INCAX: 0xfe, // INC absolute,X | ABSOLUTE,X
  DECAX: 0xde, // DEC absolute,X | ABSOLUTE,X
  LDAAY: 0xb9, // Load A from absolute,Y | ABSOLUTE,Y
  STAAY: 0x99, // Store A to absolute,Y | ABSOLUTE,Y
  LDXAY: 0xbe, // Load X from absolute,Y | ABSOLUTE,Y
  ADCAY: 0x79, // ADC absolute,Y | ABSOLUTE,Y
  SBCAY: 0xf9, // SBC absolute,Y | ABSOLUTE,Y
  ANDAY: 0x39, // AND absolute,Y | ABSOLUTE,Y
  ORAAY: 0x19, // ORA absolute,Y | ABSOLUTE,Y
  EORAY: 0x59, // EOR absolute,Y | ABSOLUTE,Y
  CMPAY: 0xd9, // CMP absolute,Y | ABSOLUTE,Y
  JMPI: 0x6c, // Jump indirect | INDIRECT
  // Indexed indirect (indirect,X)
  LDAIX: 0xa1, // LDA (zp,X) | INDEXED INDIRECT
  STAIX: 0x81, // STA (zp,X) | INDEXED INDIRECT
  ADCIX: 0x61, // ADC (zp,X) | INDEXED INDIRECT
  SBCIX: 0xe1, // SBC (zp,X) | INDEXED INDIRECT
  ANDIX: 0x21, // AND (zp,X) | INDEXED INDIRECT
  ORAIX: 0x01, // ORA (zp,X) | INDEXED INDIRECT
  EORIX: 0x41, // EOR (zp,X) | INDEXED INDIRECT
  CMPIX: 0xc1, // CMP (zp,X) | INDEXED INDIRECT
  // Indirect indexed (indirect),Y
  LDAIY: 0xb1, // LDA (zp),Y | INDIRECT INDEXED
  STAIY: 0x91, // STA (zp),Y | INDIRECT INDEXED
  ADCIY: 0x71, // ADC (zp),Y | INDIRECT INDEXED
  SBCIY: 0xf1, // SBC (zp),Y | INDIRECT INDEXED
  ANDIY: 0x31, // AND (zp),Y | INDIRECT INDEXED
  ORAIY: 0x11, // ORA (zp),Y | INDIRECT INDEXED
  EORIY: 0x51, // EOR (zp),Y | INDIRECT INDEXED
  CMPIY: 0xd1, // CMP (zp),Y | INDIRECT INDEXED
  JSR: 0x20, // Jump to subroutine | ABSOLUTE
  RTS: 0x60, // Return from subroutine | IMPLIED
  RTI: 0x40, // Return from interrupt | IMPLIED
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
  lao: boolean; // output ALU input A to data bus
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
  dEa: boolean; // address add: aluA + aluB with carry=0, no flag updates
  dDec: boolean; // decrement: aluA + ~aluB + 1, no flag updates
  dahc: boolean; // add address carry to high byte of bus address register
  bai: boolean; // increment bus address register by 1
  irqvec: boolean; // load $FFFE (IRQ/BRK vector) into bus address register
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
  lao: false, // output ALU input A to data bus
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
  dEa: false, // address add: aluA + aluB with carry=0, no flag updates
  dDec: false, // decrement: aluA + ~aluB + 1, no flag updates
  dahc: false, // add address carry to high byte of bus address register
  bai: false, // increment bus address register by 1
  irqvec: false, // load $FFFE (IRQ/BRK vector) into bus address register
  if: [], // Cpu status flags to set immediately
};

type MicroInstructions = Array<ControlWord>;

const loadNextInstruction: MicroInstructions = [
  Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, idi: true, pce: true }),
];

const instructions: { [key: number]: { [key: string]: MicroInstructions } } = {
  [instructionMap.BRK]: {
    0: [
      Object.assign({ ...baseControl }, { pce: true, if: [{ flag: 'B', value: true }] }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, pcho: true, ri: true, spd: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, pclo: true, ri: true, spd: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, sto: true, ri: true, spd: true }),
      Object.assign({ ...baseControl }, { irqvec: true, if: [{ flag: 'I', value: true }] }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true }),
    ],
  },
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
      Object.assign({ ...baseControl }, { ao: true, la: true, c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true, zn: true }),
    ],
  },
  [instructionMap.INCM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  // DEC - decrement
  [instructionMap.DECA]: {
    0: [
      Object.assign({ ...baseControl }, { ao: true, la: true, c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true, zn: true }),
    ],
  },
  [instructionMap.DECM]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  // INX/DEX/INY/DEY - increment/decrement registers
  [instructionMap.INX]: {
    0: [
      Object.assign({ ...baseControl }, { xo: true, la: true, c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, xi: true, zn: true }),
    ],
  },
  [instructionMap.DEX]: {
    0: [
      Object.assign({ ...baseControl }, { xo: true, la: true, c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, xi: true, zn: true }),
    ],
  },
  [instructionMap.INY]: {
    0: [
      Object.assign({ ...baseControl }, { yo: true, la: true, c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, yi: true, zn: true }),
    ],
  },
  [instructionMap.DEY]: {
    0: [
      Object.assign({ ...baseControl }, { yo: true, la: true, c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, yi: true, zn: true }),
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
  // Zero page addressing — same as absolute but only 1 address byte (high byte implicitly $00)
  [instructionMap.LDAZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LDXZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STXZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, xo: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LDYZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STYZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, yo: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ADCZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.CPXZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { xo: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.CPYZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.BITZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, bit: true, fi: true }),
    ],
  },
  [instructionMap.ASLZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { asl: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LSRZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { lsr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ROLZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { rol: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.RORZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { ror: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.INCZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.DECZ]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  // Zero page,X indexed — base + X through ALU with carry=0
  [instructionMap.LDAZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LDYZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STYZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, yo: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ADCZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.ASLZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { asl: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LSRZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { lsr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ROLZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { rol: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.RORZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { ror: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.INCZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.DECZX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  // Zero page,Y indexed
  [instructionMap.LDXZY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STXZY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, xo: true, ri: true, bac: true }),
    ],
  },
  // Absolute,X indexed
  [instructionMap.LDAAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LDYAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, yi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.ADCAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  [instructionMap.ASLAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { asl: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LSRAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { lsr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ROLAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { rol: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.RORAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { ror: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.INCAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dEa: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.DECAX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true }),
      Object.assign({ ...baseControl }, { c1: true, dDec: true }),
      Object.assign({ ...baseControl }, { so: true, ri: true, bac: true, zn: true }),
    ],
  },
  // Absolute,Y indexed
  [instructionMap.LDAAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.LDXAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, xi: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.ADCAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPAY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  // JMP indirect — read 16-bit pointer from memory, jump to target
  [instructionMap.JMPI]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true }),
    ],
  },
  // Indexed indirect (indirect,X) — ZP+X pointer dereference
  [instructionMap.LDAIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ADCIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPIX]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, la: true, pce: true }),
      Object.assign({ ...baseControl }, { xo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { lao: true, dal: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  // Indirect indexed (indirect),Y — ZP pointer + Y offset
  [instructionMap.LDAIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, ai: true, bac: true, zn: true }),
    ],
  },
  [instructionMap.STAIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ao: true, ri: true, bac: true }),
    ],
  },
  [instructionMap.ADCIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dE: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.SBCIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dS: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ANDIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dAnd: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.ORAIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dOr: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.EORIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dXor: true, fi: true }),
      Object.assign({ ...baseControl }, { so: true, ai: true }),
    ],
  },
  [instructionMap.CMPIY]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, la: true, bai: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, dah: true, bac: true }),
      Object.assign({ ...baseControl }, { yo: true, lb: true }),
      Object.assign({ ...baseControl }, { dEa: true }),
      Object.assign({ ...baseControl }, { so: true, dal: true, dahc: true }),
      Object.assign({ ...baseControl }, { bao: true, mi: true, ro: true, lb: true, bac: true }),
      Object.assign({ ...baseControl }, { ao: true, la: true, dc: true, fi: true }),
    ],
  },
  // Stack operations
  [instructionMap.JSR]: {
    0: [
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dal: true, pce: true }),
      Object.assign({ ...baseControl }, { pco: true, mi: true, ro: true, dah: true }),
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
      Object.assign({ ...baseControl }, { bao: true, pcai: true, bac: true, pce: true }),
    ],
  },
  [instructionMap.RTI]: {
    0: [
      Object.assign({ ...baseControl }, { spu: true }),
      Object.assign({ ...baseControl }, { spo: true, mi: true, ro: true, sti: true }),
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
