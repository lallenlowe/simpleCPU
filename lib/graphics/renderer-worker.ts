'use strict';

import { workerData, parentPort } from 'worker_threads';
import { writeSync } from 'fs';
import { palette } from './palette';

const MODE_REGISTER = 0xfe04;
const VSYNC_REGISTER = 0xfe05;
const FRAMEBUFFER_START = 0x8000;
const SPRITE_PATTERNS = 0x7e00;
const SPRITE_REGS = 0xfe20;
const NUM_SPRITES = 8;
const FPS = 60;

const data = new Uint8Array(workerData.buffer as SharedArrayBuffer);

type PixelFn = (x: number, y: number) => [number, number, number];

type ModeConfig = {
  width: number;
  height: number;
  getPixel: PixelFn;
};

const mode1: ModeConfig = {
  width: 64,
  height: 48,
  getPixel: (x, y) => {
    const idx = data[FRAMEBUFFER_START + y * 64 + x];
    return palette[idx & 0xff];
  },
};

const mode2: ModeConfig = {
  width: 256,
  height: 192,
  getPixel: (x, y) => {
    const byteOffset = y * 32 + (x >> 3);
    const byte = data[FRAMEBUFFER_START + byteOffset];
    const bit = (byte >> (7 - (x & 7))) & 1;
    return bit ? [255, 255, 255] : [0, 0, 0];
  },
};

const mode3: ModeConfig = {
  width: 128,
  height: 96,
  getPixel: (x, y) => {
    const byteOffset = y * 64 + (x >> 1);
    const byte = data[FRAMEBUFFER_START + byteOffset];
    const idx = (x & 1) ? (byte & 0x0f) : (byte >> 4);
    return palette[idx];
  },
};

const mode4: ModeConfig = {
  width: 128,
  height: 128,
  getPixel: (x, y) => {
    const idx = data[FRAMEBUFFER_START + y * 128 + x];
    return palette[idx & 0xff];
  },
};

const modes: Record<number, ModeConfig> = { 1: mode1, 2: mode2, 3: mode3, 4: mode4 };

type Sprite = { x: number; y: number; pattern: number; color: number };

const getSprites = (): Sprite[] => {
  const sprites: Sprite[] = [];
  for (let i = 0; i < NUM_SPRITES; i++) {
    const base = SPRITE_REGS + i * 4;
    const color = data[base + 3];
    if (color === 0) continue;
    sprites.push({
      x: data[base],
      y: data[base + 1],
      pattern: data[base + 2],
      color,
    });
  }
  return sprites;
};

const spritePixelAt = (sprites: Sprite[], px: number, py: number): number | null => {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i];
    const dx = px - s.x;
    const dy = py - s.y;
    if (dx < 0 || dx >= 8 || dy < 0 || dy >= 8) continue;
    const row = data[SPRITE_PATTERNS + s.pattern * 8 + dy];
    if (row & (0x80 >> dx)) return s.color;
  }
  return null;
};

let termCols = (workerData.cols as number) || 80;
let termRows = (workerData.rows as number) || 24;
let inAltScreen = false;
let prevScale = 0;
let prevOffsetX = 0;
let prevOffsetY = 0;
let prevFrame = '';
let prevMode = 0;
let prevVsyncUsed = false;

const write = (s: string) => writeSync(1, s);

const enterAltScreen = () => {
  if (inAltScreen) return;
  write('\x1b[?1049h\x1b[?25l\x1b[?1003h\x1b[?1006h');
  inAltScreen = true;
  prevFrame = '';
};

const leaveAltScreen = () => {
  if (!inAltScreen) return;
  write('\x1b[?1003l\x1b[?1006l\x1b[?1049l\x1b[?25h');
  inAltScreen = false;
};

const getScale = (width: number, height: number): { scale: number; offsetX: number; offsetY: number } => {
  const scaleX = Math.floor(termCols / width);
  const scaleY = Math.floor((termRows * 2) / height);
  const scale = Math.max(1, Math.min(scaleX, scaleY));
  const renderedCols = width * scale;
  const renderedRows = Math.ceil((height * scale) / 2);
  const offsetX = Math.floor((termCols - renderedCols) / 2);
  const offsetY = Math.floor((termRows - renderedRows) / 2);
  return { scale, offsetX, offsetY };
};

const render = () => {
  const mode = data[MODE_REGISTER];
  if (mode === 0) {
    if (inAltScreen) leaveAltScreen();
    prevMode = 0;
    return;
  }

  const config = modes[mode];
  if (!config) {
    if (inAltScreen) leaveAltScreen();
    return;
  }

  const vsync = data[VSYNC_REGISTER];
  if (vsync) {
    prevVsyncUsed = true;
  } else if (prevVsyncUsed) {
    return;
  }

  if (!inAltScreen) enterAltScreen();

  if (mode !== prevMode) {
    write('\x1b[2J');
    prevFrame = '';
    prevScale = 0;
    prevMode = mode;
  }

  const { width, height } = config;
  const { scale, offsetX, offsetY } = getScale(width, height);

  if (scale !== prevScale || offsetX !== prevOffsetX || offsetY !== prevOffsetY) {
    write('\x1b[2J');
    prevFrame = '';
    prevScale = scale;
    prevOffsetX = offsetX;
    prevOffsetY = offsetY;
  }

  const scaledH = height * scale;
  const lines: string[] = [];
  const pad = offsetX > 0 ? `\x1b[${offsetX}C` : '';
  const sprites = getSprites();

  const getPixelWithSprites = (x: number, y: number): [number, number, number] => {
    const spriteColor = spritePixelAt(sprites, x, y);
    if (spriteColor !== null) return palette[spriteColor];
    return config.getPixel(x, y);
  };

  for (let row = 0; row < scaledH; row += 2) {
    const srcTopRow = Math.floor(row / scale);
    const srcBotRow = Math.floor((row + 1) / scale);
    let line = '';

    for (let col = 0; col < width * scale; col++) {
      const srcCol = Math.floor(col / scale);
      const [tr, tg, tb] = getPixelWithSprites(srcCol, srcTopRow);
      const [br, bg, bb] = (row + 1 < scaledH)
        ? getPixelWithSprites(srcCol, srcBotRow)
        : [tr, tg, tb];

      line += `\x1b[38;2;${tr};${tg};${tb};48;2;${br};${bg};${bb}m\u2580`;
    }

    line += '\x1b[0m';
    lines.push(line);
  }

  const frame = lines.join('\n');
  if (frame === prevFrame) return;
  prevFrame = frame;

  let out = '';
  for (let i = 0; i < lines.length; i++) {
    out += `\x1b[${offsetY + i + 1};1H${pad}${lines[i]}`;
  }
  write(out);

  if (prevVsyncUsed) {
    Atomics.store(data, VSYNC_REGISTER, 0);
  }
};

const timer = setInterval(render, Math.floor(1000 / FPS));

parentPort?.on('message', (msg: { type: string; cols?: number; rows?: number }) => {
  if (msg.type === 'stop') {
    clearInterval(timer);
    leaveAltScreen();
    write('\x1b[?25h');
    process.exit(0);
  }
  if (msg.type === 'resize') {
    termCols = msg.cols || 80;
    termRows = msg.rows || 24;
    prevScale = 0;
  }
});
