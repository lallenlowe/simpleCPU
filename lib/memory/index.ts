'use strict';

import { outputToAddressBus, outputToDataBus } from '../bus';
import { Bus, Memory } from '../initial-state';
import { ControlWord } from '../control';
import { InputDevice, hasData, readByte, pollMouse } from './input-device';

const IO_OUTPUT = 0xfe00;
const IO_CHAR = 0xfe01;
const IO_INPUT_STATUS = 0xfe02;
const IO_INPUT_DATA = 0xfe03;
const IO_MOUSE_X = 0xfe14;
const IO_MOUSE_Y = 0xfe15;
const IO_MOUSE_BTN = 0xfe16;

type MemoryInterface = {
  bus: Bus;
  memory: Memory;
  output: boolean;
  input: boolean;
  controlWord: ControlWord;
  inputDevice: InputDevice;
};

const interfaceMemoryData = ({ bus, memory, output, input, controlWord, inputDevice }: MemoryInterface): void => {
  if (output && controlWord.ro) {
    if (memory.addressRegister === IO_INPUT_STATUS) {
      outputToDataBus(bus, hasData(inputDevice) ? 0x80 : 0);
      return;
    }
    if (memory.addressRegister === IO_INPUT_DATA) {
      outputToDataBus(bus, readByte(inputDevice) | 0x80);
      return;
    }
    if (memory.addressRegister === IO_MOUSE_X) {
      pollMouse(inputDevice);
      outputToDataBus(bus, inputDevice.mouseX & 0xff);
      return;
    }
    if (memory.addressRegister === IO_MOUSE_Y) {
      outputToDataBus(bus, inputDevice.mouseY & 0xff);
      return;
    }
    if (memory.addressRegister === IO_MOUSE_BTN) {
      outputToDataBus(bus, inputDevice.mouseButtons & 0xff);
      return;
    }
    outputToDataBus(bus, memory.data[memory.addressRegister]);
    return;
  }

  if (input && controlWord.ri) {
    if (memory.addressRegister === IO_OUTPUT) {
      process.stdout.write(String(bus.data) + '\n');
      return;
    }
    if (memory.addressRegister === IO_CHAR) {
      let ch = bus.data & 0x7f;
      if (ch === 0x0d) ch = 0x0a;
      process.stdout.write(String.fromCharCode(ch));
      return;
    }
    memory.data[memory.addressRegister] = bus.data;
  }
};

const interfaceMemoryAddress = ({ bus, memory, output, input, controlWord }: MemoryInterface): void => {
  if (output && controlWord.mo) {
    outputToAddressBus(bus, memory.addressRegister);
    return;
  }

  if (input && controlWord.mi) {
    memory.addressRegister = bus.address;
  }
};

export { interfaceMemoryData, interfaceMemoryAddress };
