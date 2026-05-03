import { palette } from './palette';

const MODE_REGISTER = 0xfe04;
const VSYNC_REGISTER = 0xfe05;
const FRAMEBUFFER_START = 0x8000;
const FPS = 60;

type ModeConfig = {
  width: number;
  height: number;
  getPixel: (data: number[], x: number, y: number) => [number, number, number];
};

const mode1: ModeConfig = {
  width: 64,
  height: 48,
  getPixel: (data, x, y) => {
    const idx = data[FRAMEBUFFER_START + y * 64 + x] ?? 0;
    return palette[idx & 0xff];
  },
};

const mode2: ModeConfig = {
  width: 256,
  height: 192,
  getPixel: (data, x, y) => {
    const byteOffset = y * 32 + (x >> 3);
    const byte = data[FRAMEBUFFER_START + byteOffset] ?? 0;
    const bit = (byte >> (7 - (x & 7))) & 1;
    return bit ? [255, 255, 255] : [0, 0, 0];
  },
};

const mode3: ModeConfig = {
  width: 128,
  height: 96,
  getPixel: (data, x, y) => {
    const byteOffset = y * 64 + (x >> 1);
    const byte = data[FRAMEBUFFER_START + byteOffset] ?? 0;
    const idx = (x & 1) ? (byte & 0x0f) : (byte >> 4);
    return palette[idx];
  },
};

const mode4: ModeConfig = {
  width: 128,
  height: 128,
  getPixel: (data, x, y) => {
    const idx = data[FRAMEBUFFER_START + y * 128 + x] ?? 0;
    return palette[idx & 0xff];
  },
};

const modes: Record<number, ModeConfig> = { 1: mode1, 2: mode2, 3: mode3, 4: mode4 };

let timer: ReturnType<typeof setInterval> | null = null;
let memoryData: number[] = [];
let inAltScreen = false;
let prevScale = 0;
let prevOffsetX = 0;
let prevOffsetY = 0;
let prevFrame = '';
let prevMode = 0;
let prevVsyncUsed = false;

const enterAltScreen = () => {
  if (inAltScreen) return;
  process.stdout.write('\x1b[?1049h\x1b[?25l');
  inAltScreen = true;
  prevFrame = '';
};

const leaveAltScreen = () => {
  if (!inAltScreen) return;
  process.stdout.write('\x1b[?1049l\x1b[?25h');
  inAltScreen = false;
};

const getScale = (width: number, height: number): { scale: number; offsetX: number; offsetY: number } => {
  const termCols = process.stdout.columns || 80;
  const termRows = process.stdout.rows || 24;
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
  const mode = memoryData[MODE_REGISTER] ?? 0;
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

  const vsync = memoryData[VSYNC_REGISTER] ?? 0;
  if (vsync) {
    prevVsyncUsed = true;
  } else if (prevVsyncUsed) {
    return;
  }

  if (!inAltScreen) enterAltScreen();

  if (mode !== prevMode) {
    process.stdout.write('\x1b[2J');
    prevFrame = '';
    prevScale = 0;
    prevMode = mode;
  }

  const { width, height } = config;
  const { scale, offsetX, offsetY } = getScale(width, height);

  if (scale !== prevScale || offsetX !== prevOffsetX || offsetY !== prevOffsetY) {
    process.stdout.write('\x1b[2J');
    prevFrame = '';
    prevScale = scale;
    prevOffsetX = offsetX;
    prevOffsetY = offsetY;
  }

  const scaledH = height * scale;
  const lines: string[] = [];
  const pad = offsetX > 0 ? `\x1b[${offsetX}C` : '';

  for (let row = 0; row < scaledH; row += 2) {
    const srcTopRow = Math.floor(row / scale);
    const srcBotRow = Math.floor((row + 1) / scale);
    let line = '';

    for (let col = 0; col < width * scale; col++) {
      const srcCol = Math.floor(col / scale);
      const [tr, tg, tb] = config.getPixel(memoryData, srcCol, srcTopRow);
      const [br, bg, bb] = (row + 1 < scaledH)
        ? config.getPixel(memoryData, srcCol, srcBotRow)
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
  process.stdout.write(out);

  if (prevVsyncUsed) {
    memoryData[VSYNC_REGISTER] = 0;
  }
};

const onResize = () => {
  prevScale = 0;
};

const startGraphics = (data: number[]) => {
  memoryData = data;
  process.on('SIGWINCH', onResize);
  timer = setInterval(render, Math.floor(1000 / FPS));
};

const stopGraphics = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  process.removeListener('SIGWINCH', onResize);
  leaveAltScreen();
  process.stdout.write('\x1b[?25h');
};

export { startGraphics, stopGraphics };
