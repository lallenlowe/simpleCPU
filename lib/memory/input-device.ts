'use strict';

import * as fs from 'fs';

type InputDevice = {
  buffer: number[];
  active: boolean;
  fd: number;
  fdIsTty: boolean;
  switchedToTty: boolean;
};

const createInputDevice = (): InputDevice => {
  return { buffer: [], active: false, fd: 0, fdIsTty: false, switchedToTty: false };
};

const setupStdin = (device: InputDevice): void => {
  device.fd = 0;
  device.fdIsTty = !!process.stdin.isTTY;
  if (device.fdIsTty) {
    process.stdin.setRawMode(true);
  }
  device.active = true;
};

const teardownStdin = (device: InputDevice): void => {
  if (!device.active) return;
  if (device.fdIsTty && device.fd === 0) {
    process.stdin.setRawMode(false);
  }
  if (device.switchedToTty && device.fd > 0) {
    try { fs.closeSync(device.fd); } catch { /* ignore */ }
  }
  device.active = false;
};

// When piped stdin reaches EOF, re-open /dev/tty so the user can keep typing.
const switchToTty = (device: InputDevice): void => {
  if (device.switchedToTty) return;
  try {
    const ttyFd = fs.openSync('/dev/tty', 'r');
    device.fd = ttyFd;
    device.fdIsTty = true;
    device.switchedToTty = true;
    // Raw mode on the new tty so keystrokes arrive without line buffering.
    // Node's stdin API doesn't help us here — use the TTY ioctl via a stream.
    const ttyStream = new (require('tty').ReadStream)(ttyFd);
    ttyStream.setRawMode(true);
  } catch {
    // No tty available (e.g. CI). Stay in EOF state.
  }
};

const pollStdin = (device: InputDevice): void => {
  if (!device.active) return;
  const buf = Buffer.alloc(64);
  try {
    const bytesRead = fs.readSync(device.fd, buf, 0, 64, null);
    if (bytesRead === 0) {
      switchToTty(device);
      return;
    }
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
