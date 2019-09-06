'use strict';

import { CpuRegisters } from '../initial-state';
import { ControlWord } from '../control';
import { setStatusFlag } from '../register';
import { byteAdder } from './gates';
import { byteToNumber } from '../common';
import { numberToByte } from '../common';

const operate = ({
  registers,
  controlWord,
}: {
  registers: CpuRegisters;
  controlWord: ControlWord;
}): CpuRegisters => {
  let newRegisters = add(registers, controlWord);
  newRegisters = compare(newRegisters, controlWord);

  return newRegisters;
};

const add = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
  if (controlWord.dE) {
    let newRegisters: CpuRegisters = { ...registers };

    let { sum, carry, overflow } = byteAdder(
      numberToByte(newRegisters.x),
      numberToByte(newRegisters.y),
      newRegisters.status['C'],
    );

    newRegisters = setStatusFlag({
      cpuRegisters: newRegisters,
      flagsInput: controlWord.fi,
      flag: 'C',
      value: carry,
    });

    newRegisters = setStatusFlag({
      cpuRegisters: newRegisters,
      flagsInput: controlWord.fi,
      flag: 'O',
      value: overflow,
    });
    newRegisters.s = byteToNumber(sum);

    return newRegisters;
  }

  return registers;
};

// TODO: maybe replace with a full 8 bit adder using bitwise operators?
// const add = (registers: CpuRegisters, controlWord: ControlWord): CpuRegisters => {
//   if (controlWord.dE) {
//     let newRegisters: CpuRegisters = { ...registers };

//     let sum = newRegisters.x + newRegisters.y;

//     if (sum > 0b11111111) {
//       sum = 0b11111111;
//       newRegisters = setStatusFlag({
//         cpuRegisters: newRegisters,
//         flagsInput: controlWord.fi,
//         flag: 'C',
//         value: true,
//       });
//     } else {
//       newRegisters = setStatusFlag({
//         cpuRegisters: newRegisters,
//         flagsInput: controlWord.fi,
//         flag: 'C',
//         value: false,
//       });
//     }
//     newRegisters.s = sum;

//     return newRegisters;
//   }

//   return registers;
// };

const compare = (registers: CpuRegisters, controlWord: ControlWord) => {
  if (controlWord.dc) {
    let newRegisters: CpuRegisters = { ...registers };
    if (registers.x === registers.y) {
      newRegisters = setStatusFlag({
        cpuRegisters: newRegisters,
        flagsInput: controlWord.fi,
        flag: 'Z',
        value: true,
      });
    } else {
      newRegisters = setStatusFlag({
        cpuRegisters: newRegisters,
        flagsInput: controlWord.fi,
        flag: 'Z',
        value: false,
      });
    }

    if (registers.x >= registers.y) {
      newRegisters = setStatusFlag({
        cpuRegisters: newRegisters,
        flagsInput: controlWord.fi,
        flag: 'C',
        value: true,
      });
    } else {
      newRegisters = setStatusFlag({
        cpuRegisters: newRegisters,
        flagsInput: controlWord.fi,
        flag: 'C',
        value: false,
      });
    }

    return newRegisters;
  }

  return registers;
};

export { operate };
