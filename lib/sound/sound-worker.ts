'use strict';

import { workerData, parentPort } from 'worker_threads';
import { AudioContext, OscillatorNode, GainNode, AudioBufferSourceNode } from 'node-web-audio-api';

const TONE_BASE = 0xfe06;
const NOISE_BASE = 0xfe12;
const WAVEFORMS: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];
const POLL_HZ = 60;

const data = new Uint8Array(workerData.buffer as SharedArrayBuffer);
const ctx = new AudioContext();

type ToneChannel = {
  osc: OscillatorNode;
  gain: GainNode;
  prevFreq: number;
  prevWaveform: number;
  prevVolume: number;
};

const createToneChannel = (): ToneChannel => {
  const osc = new OscillatorNode(ctx, { frequency: 0, type: 'square' });
  const gain = new GainNode(ctx, { gain: 0 });
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  return { osc, gain, prevFreq: 0, prevWaveform: 0, prevVolume: 0 };
};

const channels: ToneChannel[] = [
  createToneChannel(),
  createToneChannel(),
  createToneChannel(),
];

const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
const noiseData = noiseBuffer.getChannelData(0);
for (let i = 0; i < noiseData.length; i++) {
  noiseData[i] = Math.random() * 2 - 1;
}

let noiseSource: AudioBufferSourceNode | null = null;
const noiseGain = new GainNode(ctx, { gain: 0 });
noiseGain.connect(ctx.destination);

let prevNoiseRate = 0;
let prevNoiseVolume = 0;

const startNoise = (rate: number) => {
  if (noiseSource) {
    noiseSource.stop();
    noiseSource.disconnect();
  }
  noiseSource = new AudioBufferSourceNode(ctx, { buffer: noiseBuffer, loop: true });
  noiseSource.playbackRate.value = rate > 0 ? rate / 128 : 0.01;
  noiseSource.connect(noiseGain);
  noiseSource.start();
};

startNoise(128);

const poll = () => {
  for (let ch = 0; ch < 3; ch++) {
    const base = TONE_BASE + ch * 4;
    const freqLo = data[base];
    const freqHi = data[base + 1];
    const freq = (freqHi << 8) | freqLo;
    const waveform = data[base + 2];
    const volume = data[base + 3];

    const channel = channels[ch];

    if (freq !== channel.prevFreq) {
      channel.osc.frequency.value = freq;
      channel.prevFreq = freq;
    }

    if (waveform !== channel.prevWaveform) {
      channel.osc.type = WAVEFORMS[waveform & 3];
      channel.prevWaveform = waveform;
    }

    if (volume !== channel.prevVolume) {
      channel.gain.gain.value = volume / 255;
      channel.prevVolume = volume;
    }
  }

  const noiseRate = data[NOISE_BASE];
  const noiseVolume = data[NOISE_BASE + 1];

  if (noiseRate !== prevNoiseRate) {
    startNoise(noiseRate);
    prevNoiseRate = noiseRate;
  }

  if (noiseVolume !== prevNoiseVolume) {
    noiseGain.gain.value = noiseVolume / 255;
    prevNoiseVolume = noiseVolume;
  }
};

const timer = setInterval(poll, Math.floor(1000 / POLL_HZ));

parentPort?.on('message', (msg: { type: string }) => {
  if (msg.type === 'stop') {
    clearInterval(timer);
    for (const ch of channels) {
      ch.osc.stop();
      ch.osc.disconnect();
      ch.gain.disconnect();
    }
    if (noiseSource) {
      noiseSource.stop();
      noiseSource.disconnect();
    }
    noiseGain.disconnect();
    ctx.close();
    process.exit(0);
  }
});
