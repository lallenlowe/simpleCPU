'use strict';

import { Worker } from 'worker_threads';
import * as path from 'path';

let worker: Worker | null = null;

const startSound = (buffer: SharedArrayBuffer) => {
  worker = new Worker(path.join(__dirname, 'sound-worker.js'), {
    workerData: { buffer },
  });
};

const stopSound = (): Promise<void> => {
  if (!worker) return Promise.resolve();
  const w = worker;
  worker = null;
  return new Promise((resolve) => {
    w.on('exit', () => resolve());
    w.postMessage({ type: 'stop' });
  });
};

export { startSound, stopSound };
