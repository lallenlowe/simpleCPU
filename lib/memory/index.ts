'use strict';

import { outputToBus } from '../bus';
import { Bus, Memory } from '../initial-state';
import { ControlWord } from '../control';

type MemoryInterface = {
  bus: Bus;
  memory: Memory;
  output: Boolean;
  input: Boolean;
};

type MemoryControlInterface = {
  bus: Bus;
  memory: Memory;
  output: Boolean;
  input: Boolean;
  controlWord: ControlWord;
};

const interfaceMemoryData = ({ bus, memory, output, input }: MemoryInterface) => {
  if (output) {
    const newBus = outputToBus({ bus, data: memory.data[memory.addressRegister] });
    return { bus: newBus, memory };
  }

  if (input) {
    const newMemory = { ...memory };
    newMemory.data[memory.addressRegister] = bus.data;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceMemoryAddress = ({ bus, memory, output, input }: MemoryInterface) => {
  if (output) {
    const newBus = outputToBus({
      bus,
      data: memory.addressRegister,
    });
    return { bus: newBus, memory };
  }

  if (input) {
    const newMemory = { ...memory };
    newMemory.addressRegister = bus.data;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceMemory = ({ bus, memory, output, input, controlWord }: MemoryControlInterface) => {
  let systemMemory = { ...memory };
  let mainBus = { ...bus };

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: output && controlWord.mo,
    input: input && controlWord.mi,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: output && controlWord.ro,
    input: input && controlWord.ri,
  }));

  return { bus: mainBus, memory: systemMemory };
};

export { interfaceMemory, interfaceMemoryData, interfaceMemoryAddress };
