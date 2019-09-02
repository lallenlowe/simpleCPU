'use strict';

import { CpuRegisters } from '../initial-state';
import { ControlWord } from '../control';
import { setStatusFlag } from '../register';

const operate = ({
  registers,
  controlWord,
}: {
  registers: CpuRegisters;
  controlWord: ControlWord;
}) => {
  let newRegisters = add(registers);
  newRegisters = compare(newRegisters, controlWord.co);

  return newRegisters;
};

// TODO: maybe replace with a full 8 bit adder using bitwise operators?
const add = (registers: CpuRegisters) => {
  const newRegisters: CpuRegisters = { ...registers };

  newRegisters.s = newRegisters.x + newRegisters.y;

  return newRegisters;
};

const compare = (registers: CpuRegisters, compareOut: boolean) => {
  const newRegisters: CpuRegisters = { ...registers };
  if (compareOut && registers.x === registers.y) {
    newRegisters.status = setStatusFlag({
      statusRegister: newRegisters.status,
      flag: 'Z',
      value: true,
    });
  }

  if (compareOut && registers.x >= registers.y) {
    newRegisters.status = setStatusFlag({
      statusRegister: newRegisters.status,
      flag: 'C',
      value: true,
    });
  }

  return newRegisters;
};

export { operate };
