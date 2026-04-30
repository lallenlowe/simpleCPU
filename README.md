<img src="simplecpu.svg"
     alt="simpleCPU icon"
     style="float: left; margin-right: 10px;" />

# simpleCPU

This is an experiment in simulating a very simple CPU, for my own education.
It is VERY loosely based on the classic 6502 Processor.

## Quickstart

- [Node.js >= 20](https://nodejs.org/en/download/)
- Install deps: `npm i`
- Build: `npm run build`
- Assemble a program using any 6502 assembler (e.g. [masswerk](https://www.masswerk.at/6502/assembler.html), [ca65](https://cc65.github.io/doc/ca65.html), [vasm](http://sun.hasenbraten.de/vasm/))
- Run: `node dist/index.js`
- Lint: `npm run lint`

## Supported Instructions

The following 6502 instructions and addressing modes are implemented:

| Mnemonic | Immediate | Absolute | Implied |
|----------|-----------|----------|---------|
| LDA      | A9        | AD       |         |
| LDX      | A2        | AE       |         |
| LDY      | A0        | AC       |         |
| STA      |           | 8D       |         |
| STX      |           | 8E       |         |
| STY      |           | 8C       |         |
| ADC      | 69        | 6D       |         |
| CMP      | C9        | CD       |         |
| JMP      |           | 4C       |         |
| TAX      |           |          | AA      |
| TAY      |           |          | A8      |
| CLC      |           |          | 18      |
| SEC      |           |          | 38      |
| NOP      |           |          | EA      |
| BRK      |           |          | 00      |

Additionally, opcode `0x02` outputs the A register value (not a real 6502 instruction).

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
4. ✔ Run 6502 binary (subset)
