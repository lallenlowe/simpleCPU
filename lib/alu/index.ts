'use strict';

import { CpuRegisters } from '../initial-state';
import { ControlWord } from '../control';
import { setStatusFlag } from '../register';
import {
  byteAdder, byteAnd, byteOr, byteXor, byteNot,
  byteShiftLeft, byteShiftRight, byteRotateLeft, byteRotateRight,
} from './gates';
import { byteToNumber, numberToByte } from '../common';

const operate = ({
  registers,
  controlWord,
}: {
  registers: CpuRegisters;
  controlWord: ControlWord;
}): CpuRegisters => {
  let newRegisters = add(registers, controlWord);
  newRegisters = addressAdd(newRegisters, controlWord);
  newRegisters = subtract(newRegisters, controlWord);
  newRegisters = bitwiseAnd(newRegisters, controlWord);
  newRegisters = bitwiseOr(newRegisters, controlWord);
  newRegisters = bitwiseXor(newRegisters, controlWord);
  newRegisters = shiftLeft(newRegisters, controlWord);
  newRegisters = shiftRight(newRegisters, controlWord);
  newRegisters = rotateLeft(newRegisters, controlWord);
  newRegisters = rotateRight(newRegisters, controlWord);
  newRegisters = decrement(newRegisters, controlWord);
  newRegisters = bitTest(newRegisters, controlWord);
  newRegisters = compare(newRegisters, controlWord);

  return newRegisters;
};

const add = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dE) {
    let newRegisters: CpuRegisters = { ...registers };

    const { sum, carry, overflow } = byteAdder(
      numberToByte(newRegisters.aluA),
      numberToByte(newRegisters.aluB),
      newRegisters.status['C'],
    );

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'O', value: overflow });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(sum) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: sum[0] });
    newRegisters.s = byteToNumber(sum);

    return newRegisters;
  }

  return registers;
};

const addressAdd = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dEa) {
    const newRegisters: CpuRegisters = { ...registers };
    const { sum, carry } = byteAdder(
      numberToByte(newRegisters.aluA),
      numberToByte(newRegisters.aluB),
      false,
    );
    newRegisters.s = byteToNumber(sum);
    newRegisters.addressCarry = carry;
    return newRegisters;
  }
  return registers;
};

const subtract = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dS) {
    let newRegisters: CpuRegisters = { ...registers };

    const { sum, carry, overflow } = byteAdder(
      numberToByte(newRegisters.aluA),
      byteNot(numberToByte(newRegisters.aluB)),
      newRegisters.status['C'],
    );

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'O', value: overflow });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(sum) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: sum[0] });
    newRegisters.s = byteToNumber(sum);

    return newRegisters;
  }
  return registers;
};

const bitwiseAnd = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dAnd) {
    let newRegisters: CpuRegisters = { ...registers };
    const result = byteAnd(numberToByte(newRegisters.aluA), numberToByte(newRegisters.aluB));

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const bitwiseOr = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dOr) {
    let newRegisters: CpuRegisters = { ...registers };
    const result = byteOr(numberToByte(newRegisters.aluA), numberToByte(newRegisters.aluB));

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const bitwiseXor = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dXor) {
    let newRegisters: CpuRegisters = { ...registers };
    const result = byteXor(numberToByte(newRegisters.aluA), numberToByte(newRegisters.aluB));

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const shiftLeft = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.asl) {
    let newRegisters: CpuRegisters = { ...registers };
    const { result, carry } = byteShiftLeft(numberToByte(newRegisters.aluA));

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const shiftRight = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.lsr) {
    let newRegisters: CpuRegisters = { ...registers };
    const { result, carry } = byteShiftRight(numberToByte(newRegisters.aluA));

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const rotateLeft = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.rol) {
    let newRegisters: CpuRegisters = { ...registers };
    const { result, carry } = byteRotateLeft(numberToByte(newRegisters.aluA), newRegisters.status['C']);

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const rotateRight = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.ror) {
    let newRegisters: CpuRegisters = { ...registers };
    const { result, carry } = byteRotateRight(numberToByte(newRegisters.aluA), newRegisters.status['C']);

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'C', value: carry });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: result[0] });
    newRegisters.s = byteToNumber(result);

    return newRegisters;
  }
  return registers;
};

const decrement = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dDec) {
    const newRegisters: CpuRegisters = { ...registers };
    const { sum } = byteAdder(
      numberToByte(newRegisters.aluA),
      byteNot(numberToByte(newRegisters.aluB)),
      true,
    );
    newRegisters.s = byteToNumber(sum);
    return newRegisters;
  }
  return registers;
};

const bitTest = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.bit) {
    let newRegisters: CpuRegisters = { ...registers };
    const memByte = numberToByte(newRegisters.aluB);
    const result = byteAnd(numberToByte(newRegisters.aluA), memByte);

    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'Z', value: byteToNumber(result) === 0 });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'N', value: memByte[0] });
    newRegisters = setStatusFlag({ cpuRegisters: newRegisters, flagsInput: controlWord.fi, flag: 'O', value: memByte[1] });

    return newRegisters;
  }
  return registers;
};

const compare = (registers: CpuRegisters, controlWord: ControlWord) => {
  if (controlWord.dc) {
    let newRegisters: CpuRegisters = { ...registers };

    newRegisters = setStatusFlag({
      cpuRegisters: newRegisters, flagsInput: controlWord.fi,
      flag: 'Z', value: registers.aluA === registers.aluB,
    });
    newRegisters = setStatusFlag({
      cpuRegisters: newRegisters, flagsInput: controlWord.fi,
      flag: 'C', value: registers.aluA >= registers.aluB,
    });
    newRegisters = setStatusFlag({
      cpuRegisters: newRegisters, flagsInput: controlWord.fi,
      flag: 'N', value: ((registers.aluA - registers.aluB) & 0x80) !== 0,
    });

    return newRegisters;
  }

  return registers;
};

export { operate };
