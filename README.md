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
- Run: `node dist/index.js program.bin [--debug]`
- Lint: `npm run lint`

## Supported Instructions

All 55 official 6502 instructions are implemented across all addressing modes (151 opcodes), except RTI.

| Category | Instructions |
|----------|-------------|
| Load/Store | LDA, LDX, LDY, STA, STX, STY |
| Arithmetic | ADC, SBC |
| Logical | AND, ORA, EOR |
| Compare | CMP, CPX, CPY |
| Shift/Rotate | ASL, LSR, ROL, ROR |
| Inc/Dec | INC, DEC, INX, DEX, INY, DEY |
| Branch | BEQ, BNE, BCS, BCC, BMI, BPL, BVS, BVC |
| Jump/Call | JMP, JSR, RTS |
| Stack | PHA, PLA, PHP, PLP |
| Transfer | TAX, TAY, TXA, TYA, TXS, TSX |
| Flags | CLC, SEC, CLI, SEI, CLD, SED, CLV |
| Other | NOP, BRK, BIT |

**Addressing modes:** Implied, Immediate, Zero Page, Zero Page,X, Zero Page,Y, Absolute, Absolute,X, Absolute,Y, Indirect, (Indirect,X), (Indirect),Y

## Memory Map

| Address | Description |
|---------|-------------|
| $0000–$00FF | Zero page (fast access) |
| $0100–$01FF | Stack (SP initialized to $FF) |
| $0200+ | Program code (load address) |
| $FE00 | Output: decimal number + newline |
| $FE01 | Output: ASCII character |
| $FE02 | Input: status (1 = data ready) |
| $FE03 | Input: read byte (clears status) |

Programs should be assembled with `* = $0200` origin.

## Debug Mode

Pass `--debug` to log PC, opcode, registers, and status flags to stderr at each instruction boundary:

```
PC=$0200 LDAI  A=$00 X=$00 Y=$00 SP=$ff [nobdizc]
PC=$0202 STAA  A=$01 X=$00 Y=$00 SP=$ff [nobdizc]
```

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
4. ✔ Run 6502 binaries (near-complete instruction set)

## TODO

- [ ] Interrupt system (IRQ, NMI, authentic BRK behavior, RTI instruction)
  - BRK should push PC+2 and status to stack, load PC from vector at $FFFE/$FFFF
  - RTI pops status then PC from stack
  - Hardware interrupt lines (IRQ respects I flag, NMI is non-maskable)
