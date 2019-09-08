'use strict';

import { outputToAddressBus, outputToDataBus } from '../bus';
import { Bus, Memory } from '../initial-state';

type MemoryInterface = {
  bus: Bus;
  memory: Memory;
  output: boolean;
  input: boolean;
};

const interfaceMemoryData = ({ bus, memory, output, input }: MemoryInterface) => {
  if (output) {
    const newBus = outputToDataBus({ bus, data: memory.data[memory.addressRegister] });
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
    const newBus = outputToAddressBus({
      bus,
      address: memory.addressRegister,
    });
    return { bus: newBus, memory };
  }

  if (input) {
    const newMemory = { ...memory };
    newMemory.addressRegister = bus.address;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

export { interfaceMemoryData, interfaceMemoryAddress };
