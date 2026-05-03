'use strict';

import { CpuRegisters } from '../initial-state';
import { ControlWord } from '../control';
import { setStatusFlag } from '../register';
import {
  byteAdder, byteAnd, byteNot,
  byteShiftLeft, byteShiftRight, byteRotateLeft, byteRotateRight,
} from './gates';

const operate = ({
  registers,
  controlWord,
}: {
  registers: CpuRegisters;
  controlWord: ControlWord;
}): void => {
  add(registers, controlWord);
  addressAdd(registers, controlWord);
  subtract(registers, controlWord);
  bitwiseAnd(registers, controlWord);
  bitwiseOr(registers, controlWord);
  bitwiseXor(registers, controlWord);
  shiftLeft(registers, controlWord);
  shiftRight(registers, controlWord);
  rotateLeft(registers, controlWord);
  rotateRight(registers, controlWord);
  decrement(registers, controlWord);
  bitTest(registers, controlWord);
  compare(registers, controlWord);
};

const decimalAdjustAdd = (
  a: number, b: number, carryIn: boolean,
  binaryResult: number, binaryCarry: boolean, enabled: boolean,
): { result: number; carry: boolean; intermediate: number } => {
  if (!enabled) {
    return { result: binaryResult, carry: binaryCarry, intermediate: binaryResult };
  }

  const c = carryIn ? 1 : 0;

  let al = (a & 0x0F) + (b & 0x0F) + c;
  if (al >= 0x0A) al = ((al + 0x06) & 0x0F) + 0x10;

  let s = (a & 0xF0) + (b & 0xF0) + al;
  const intermediate = s;

  if ((s & 0x1F0) > 0x90) s += 0x60;

  return { result: s & 0xFF, carry: s > 0xFF, intermediate };
};

const decimalAdjustSubtract = (
  a: number, b: number, carryIn: boolean,
  binaryResult: number, enabled: boolean,
): number => {
  if (!enabled) return binaryResult;

  const c = carryIn ? 1 : 0;
  let al = (a & 0x0F) - (b & 0x0F) - (1 - c);
  if (al < 0) al = ((al - 0x06) & 0x0F) - 0x10;
  let s = (a & 0xF0) - (b & 0xF0) + al;
  if (s < 0) s -= 0x60;
  return s & 0xFF;
};

const add = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dE) {
    const a = registers.aluA;
    const b = registers.aluB;
    const carryIn = registers.status['C'];

    const { sum, carry } = byteAdder(a, b, carryIn ? 1 : 0);

    const adjusted = decimalAdjustAdd(a, b, carryIn, sum, !!carry, registers.status['D']);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: adjusted.carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'O', value: !!((~(a ^ b) & (a ^ adjusted.intermediate)) & 0x80) });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: sum === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(adjusted.intermediate & 0x80) });
    registers.s = adjusted.result;
  }
};

const addressAdd = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dEa) {
    const { sum, carry } = byteAdder(registers.aluA, registers.aluB, 0);
    registers.s = sum;
    registers.addressCarry = !!carry;
  }
};

const subtract = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dS) {
    const a = registers.aluA;
    const b = registers.aluB;
    const carryIn = registers.status['C'];

    const { sum, carry, overflow } = byteAdder(a, byteNot(b), carryIn ? 1 : 0);

    const result = decimalAdjustSubtract(a, b, carryIn, sum, registers.status['D']);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: !!carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'O', value: !!overflow });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: sum === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(sum & 0x80) });
    registers.s = result;
  }
};

const bitwiseAnd = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dAnd) {
    const result = byteAnd(registers.aluA, registers.aluB);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const bitwiseOr = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dOr) {
    const result = registers.aluA | registers.aluB;

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const bitwiseXor = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dXor) {
    const result = registers.aluA ^ registers.aluB;

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const shiftLeft = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.asl) {
    const { result, carry } = byteShiftLeft(registers.aluA);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: !!carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const shiftRight = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.lsr) {
    const { result, carry } = byteShiftRight(registers.aluA);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: !!carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const rotateLeft = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.rol) {
    const { result, carry } = byteRotateLeft(registers.aluA, registers.status['C'] ? 1 : 0);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: !!carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const rotateRight = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.ror) {
    const { result, carry } = byteRotateRight(registers.aluA, registers.status['C'] ? 1 : 0);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'C', value: !!carry });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(result & 0x80) });
    registers.s = result;
  }
};

const decrement = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dDec) {
    const { sum } = byteAdder(registers.aluA, byteNot(registers.aluB), 1);
    registers.s = sum;
  }
};

const bitTest = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.bit) {
    const mem = registers.aluB;
    const result = byteAnd(registers.aluA, mem);

    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'Z', value: result === 0 });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'N', value: !!(mem & 0x80) });
    setStatusFlag({ cpuRegisters: registers, flagsInput: controlWord.fi, flag: 'O', value: !!(mem & 0x40) });
  }
};

const compare = (registers: CpuRegisters, controlWord: ControlWord): void => {
  if (controlWord.dc) {
    setStatusFlag({
      cpuRegisters: registers, flagsInput: controlWord.fi,
      flag: 'Z', value: registers.aluA === registers.aluB,
    });
    setStatusFlag({
      cpuRegisters: registers, flagsInput: controlWord.fi,
      flag: 'C', value: registers.aluA >= registers.aluB,
    });
    setStatusFlag({
      cpuRegisters: registers, flagsInput: controlWord.fi,
      flag: 'N', value: ((registers.aluA - registers.aluB) & 0x80) !== 0,
    });
  }
};

export { operate };
