'use strict';

import { outputToAddressBus, outputToDataBus } from '../bus';
import { Bus, Memory } from '../initial-state';
import { ControlWord } from '../control';

type MemoryInterface = {
  bus: Bus;
  memory: Memory;
  output: boolean;
  input: boolean;
  controlWord: ControlWord;
};

const interfaceMemoryData = ({ bus, memory, output, input, controlWord }: MemoryInterface) => {
  if (output && controlWord.ro) {
    const newBus = outputToDataBus({ bus, data: memory.data[memory.addressRegister] });
    return { bus: newBus, memory };
  }

  if (input && controlWord.ri) {
    const newMemory = { ...memory };
    newMemory.data[memory.addressRegister] = bus.data;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceMemoryAddress = ({ bus, memory, output, input, controlWord }: MemoryInterface) => {
  if (output && controlWord.mo) {
    const newBus = outputToAddressBus({
      bus,
      address: memory.addressRegister,
    });
    return { bus: newBus, memory };
  }

  if (input && controlWord.mi) {
    const newMemory = { ...memory };
    newMemory.addressRegister = bus.address;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

export { interfaceMemoryData, interfaceMemoryAddress };
