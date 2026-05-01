'use strict';

import * as fs from 'fs';

type InputDevice = {
  buffer: number[];
  active: boolean;
};

const createInputDevice = (): InputDevice => {
  return { buffer: [], active: false };
};

const setupStdin = (device: InputDevice): void => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  device.active = true;
};

const teardownStdin = (device: InputDevice): void => {
  if (!device.active) return;
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  device.active = false;
};

const pollStdin = (device: InputDevice): void => {
  if (!device.active) return;
  const buf = Buffer.alloc(64);
  try {
    const bytesRead = fs.readSync(0, buf, 0, 64, null);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 3) {
        teardownStdin(device);
        process.exit();
      }
      const byte = buf[i] === 0x0a ? 0x0d : buf[i];
      device.buffer.push(byte);
    }
  } catch {
    // EAGAIN — no data available, which is expected
  }
};

const hasData = (device: InputDevice): boolean => {
  pollStdin(device);
  return device.buffer.length > 0;
};

const readByte = (device: InputDevice): number => {
  return device.buffer.shift() ?? 0;
};

export { InputDevice, createInputDevice, hasData, readByte, setupStdin, teardownStdin };
