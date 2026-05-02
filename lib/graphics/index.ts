import { palette } from './palette';

const MODE_REGISTER = 0xfe04;
const FRAMEBUFFER_START = 0x8000;
const WIDTH = 64;
const HEIGHT = 48;
const FPS = 30;

let timer: ReturnType<typeof setInterval> | null = null;
let memoryData: number[] = [];
let inAltScreen = false;
let prevScale = 0;
let prevOffsetX = 0;
let prevOffsetY = 0;
let prevFrame = '';

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

const getScale = (): { scale: number; offsetX: number; offsetY: number } => {
  const termCols = process.stdout.columns || 80;
  const termRows = process.stdout.rows || 24;
  const scaleX = Math.floor(termCols / WIDTH);
  const scaleY = Math.floor((termRows * 2) / HEIGHT);
  const scale = Math.max(1, Math.min(scaleX, scaleY));
  const renderedCols = WIDTH * scale;
  const renderedRows = Math.ceil((HEIGHT * scale) / 2);
  const offsetX = Math.floor((termCols - renderedCols) / 2);
  const offsetY = Math.floor((termRows - renderedRows) / 2);
  return { scale, offsetX, offsetY };
};

const render = () => {
  const mode = memoryData[MODE_REGISTER] ?? 0;
  if (mode === 0) {
    if (inAltScreen) leaveAltScreen();
    return;
  }

  if (!inAltScreen) enterAltScreen();

  const { scale, offsetX, offsetY } = getScale();

  if (scale !== prevScale || offsetX !== prevOffsetX || offsetY !== prevOffsetY) {
    process.stdout.write('\x1b[2J');
    prevFrame = '';
    prevScale = scale;
    prevOffsetX = offsetX;
    prevOffsetY = offsetY;
  }

  const scaledH = HEIGHT * scale;
  const lines: string[] = [];
  const pad = offsetX > 0 ? `\x1b[${offsetX}C` : '';

  for (let row = 0; row < scaledH; row += 2) {
    const srcTopRow = Math.floor(row / scale);
    const srcBotRow = Math.floor((row + 1) / scale);
    let line = '';

    for (let col = 0; col < WIDTH * scale; col++) {
      const srcCol = Math.floor(col / scale);
      const topIdx = memoryData[FRAMEBUFFER_START + srcTopRow * WIDTH + srcCol] ?? 0;
      const botIdx = (row + 1 < scaledH)
        ? (memoryData[FRAMEBUFFER_START + srcBotRow * WIDTH + srcCol] ?? 0)
        : topIdx;

      const [tr, tg, tb] = palette[topIdx & 0xff];
      const [br, bg, bb] = palette[botIdx & 0xff];

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
