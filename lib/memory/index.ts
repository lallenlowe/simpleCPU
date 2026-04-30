'use strict';

import { outputToAddressBus, outputToDataBus } from '../bus';
import { Bus, Memory } from '../initial-state';
import { ControlWord } from '../control';
import { InputDevice, hasData, readByte } from './input-device';

const IO_OUTPUT = 0xfe00;
const IO_CHAR = 0xfe01;
const IO_INPUT_STATUS = 0xfe02;
const IO_INPUT_DATA = 0xfe03;

type MemoryInterface = {
  bus: Bus;
  memory: Memory;
  output: boolean;
  input: boolean;
  controlWord: ControlWord;
  inputDevice: InputDevice;
};

const interfaceMemoryData = ({ bus, memory, output, input, controlWord, inputDevice }: MemoryInterface) => {
  if (output && controlWord.ro) {
    if (memory.addressRegister === IO_INPUT_STATUS) {
      const newBus = outputToDataBus({ bus, data: hasData(inputDevice) ? 1 : 0 });
      return { bus: newBus, memory };
    }
    if (memory.addressRegister === IO_INPUT_DATA) {
      const newBus = outputToDataBus({ bus, data: readByte(inputDevice) });
      return { bus: newBus, memory };
    }
    const newBus = outputToDataBus({ bus, data: memory.data[memory.addressRegister] });
    return { bus: newBus, memory };
  }

  if (input && controlWord.ri) {
    if (memory.addressRegister === IO_OUTPUT) {
      process.stdout.write(String(bus.data) + '\n');
      return { bus, memory };
    }
    if (memory.addressRegister === IO_CHAR) {
      process.stdout.write(String.fromCharCode(bus.data));
      return { bus, memory };
    }
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
