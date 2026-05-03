'use strict';

import { Worker } from 'worker_threads';
import * as path from 'path';

let worker: Worker | null = null;

const sendSize = () => {
  worker?.postMessage({
    type: 'resize',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });
};

const onResize = () => sendSize();

const startGraphics = (buffer: SharedArrayBuffer) => {
  worker = new Worker(path.join(__dirname, 'renderer-worker.js'), {
    workerData: {
      buffer,
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    },
  });
  process.on('SIGWINCH', onResize);
};

const stopGraphics = () => {
  process.removeListener('SIGWINCH', onResize);
  if (worker) {
    worker.postMessage({ type: 'stop' });
    worker = null;
  }
};

export { startGraphics, stopGraphics };
