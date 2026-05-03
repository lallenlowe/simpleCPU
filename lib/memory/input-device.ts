'use strict';

import * as fs from 'fs';

type InputDevice = {
  buffer: number[];
  active: boolean;
  interrupted: boolean;
  fd: number;
  fdIsTty: boolean;
  switchedToTty: boolean;
  ttyStream: any;
  mouseX: number;
  mouseY: number;
  mouseButtons: number;
  escBuf: number[];
};

const createInputDevice = (): InputDevice => {
  return { buffer: [], active: false, interrupted: false, fd: 0, fdIsTty: false, switchedToTty: false, ttyStream: null, mouseX: 0, mouseY: 0, mouseButtons: 0, escBuf: [] };
};

const setupStdin = (device: InputDevice): void => {
  device.fdIsTty = !!process.stdin.isTTY;
  if (device.fdIsTty) {
    process.stdin.setRawMode(true);
    try {
      device.fd = fs.openSync('/dev/tty', fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    } catch {
      device.fd = 0;
    }
  } else {
    device.fd = 0;
  }
  device.active = true;
  if (device.fdIsTty) {
    fs.writeSync(1, '\x1b[?1003h\x1b[?1006h');
  }
};

const teardownStdin = (device: InputDevice): void => {
  if (!device.active) return;
  if (device.fdIsTty) {
    fs.writeSync(1, '\x1b[?1003l\x1b[?1006l');
  }
  if (device.ttyStream) {
    try { device.ttyStream.setRawMode(false); } catch { /* ignore */ }
  } else if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  if (device.fd > 0) {
    try { fs.closeSync(device.fd); } catch { /* ignore */ }
  }
  device.active = false;
};

// When piped stdin reaches EOF, re-open /dev/tty so the user can keep typing.
const switchToTty = (device: InputDevice): void => {
  if (device.switchedToTty) return;
  try {
    const ttyFd = fs.openSync('/dev/tty', fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    device.fd = ttyFd;
    device.fdIsTty = true;
    device.switchedToTty = true;
    device.ttyStream = new (require('tty').ReadStream)(ttyFd);
    device.ttyStream.setRawMode(true);
  } catch {
    // No tty available (e.g. CI). Stay in EOF state.
  }
};

const parseEscSequence = (device: InputDevice): void => {
  const seq = device.escBuf;
  // SGR mouse: ESC [ < Cb ; Cx ; Cy M/m
  if (seq.length >= 6 && seq[1] === 0x5b && seq[2] === 0x3c) {
    const params = String.fromCharCode(...seq.slice(3, -1));
    const parts = params.split(';');
    if (parts.length === 3) {
      device.mouseX = parseInt(parts[1]) || 0;
      device.mouseY = parseInt(parts[2]) || 0;
      const terminator = seq[seq.length - 1];
      device.mouseButtons = terminator === 0x4d ? (parseInt(parts[0]) & 3) + 1 : 0;
    }
  }
};

const pollStdin = (device: InputDevice): void => {
  if (!device.active) return;
  const buf = Buffer.alloc(256);
  try {
    const bytesRead = fs.readSync(device.fd, buf, 0, 256, null);
    if (bytesRead === 0) {
      switchToTty(device);
      return;
    }
    for (let i = 0; i < bytesRead; i++) {
      const b = buf[i];

      if (b === 3) {
        device.interrupted = true;
        return;
      }

      if (b === 0x1b) {
        device.escBuf = [0x1b];
        continue;
      }

      if (device.escBuf.length > 0) {
        device.escBuf.push(b);
        // CSI final byte is 0x40-0x7E, but only after the introducer (ESC [ ...)
        if (device.escBuf.length > 2 && b >= 0x40 && b <= 0x7e) {
          parseEscSequence(device);
          device.escBuf = [];
        }
        continue;
      }

      const byte = b === 0x0a ? 0x0d : b;
      device.buffer.push(byte);
    }
  } catch {
    // EAGAIN — no data available, which is expected
  }
};

const hasData = (device: InputDevice): boolean => {
  if (device.interrupted) return false;
  pollStdin(device);
  return device.buffer.length > 0;
};

const readByte = (device: InputDevice): number => {
  return device.buffer.shift() ?? 0;
};

const checkInterrupt = (device: InputDevice): boolean => {
  if (device.interrupted) return true;
  if (!device.active) return false;
  pollStdin(device);
  return device.interrupted;
};

const pollMouse = (device: InputDevice): void => {
  pollStdin(device);
};

export { InputDevice, createInputDevice, hasData, readByte, pollMouse, setupStdin, teardownStdin, checkInterrupt };
