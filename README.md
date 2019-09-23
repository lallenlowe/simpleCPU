<img src="simplecpu.svg"
     alt="simpleCPU icon"
     style="float: left; margin-right: 10px;" />

# simpleCPU

This is an experiment in simulating a very simple CPU, for my own education.
It is VERY loosely based on the classic 6502 Processor.
It will not run 6502 code, but hopefully I can get it to run something similar someday _ahem_.

## Quickstart

- [Node.js@10.x.x](https://nodejs.org/en/download/)
- Install deps, `npm i`
- Build `npm run build`
- Compile testing.s `node dist/lib/assembler/index.js`
- Start program, `node dist/index.js`
- Run tests, `npm t`

## What this project is NOT

- It is not an emulator. An emulator seeks to reproduce the effects of each instruction as efficiently as possible. This project seeks to reproduce the logic of each CPU cycle and microcode word, without much regard to performance.
- It is not a circuit simulator. It models the logic of a CPU, but not the electrical circuit itself.
- It is not useful. No seriously, don't bother trying to find a use for this. For any actual work, an emulator is a much better choice, or a real CPU, or an FPGA, or just some normal modern code.

## What this project IS

- It is an aesthetic experiment. I am choosing the level at which to simulate each component based on an aesthetic feeling, like art.
- It is an educational device, at least for me. I am learning a great deal about how real CPUs work by trying to convert their parallel electronic logic into a synchronous script.

## Goals

1. ✔ Learn more about how CPUs work
2. ✔ Practice thinking in functional
3. ✔ Practicing Typescript
4. (secret 4th goal) Run 6502 binary, or at least a subset
