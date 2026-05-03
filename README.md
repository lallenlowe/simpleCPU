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
- Run: `node dist/index.js`

This boots straight into EhBASIC (Enhanced 6502 BASIC). Type `PRINT 6*7` to verify it works.

## Running Programs

```sh
# Boot into EhBASIC (no arguments needed)
node dist/index.js

# Woz Monitor
node dist/index.js programs/wozmon.bin

# Standalone assembly program (loads at $0400)
node dist/index.js programs/bounce.bin --org 0400

# Apple 1 Integer BASIC (loads at $E000, overrides default ROM)
node dist/index.js programs/a1basic.bin --org E000 --rom none
```

The EhBASIC ROM is always loaded at `$C000`–`$FFFF` by default. Standalone programs get access to ROM routines (graphics primitives, I/O) automatically. Use `--rom <file>` to override the default ROM, or `--org` to set the load address for your binary.

### Piping BASIC programs

You can pipe a `.bas` file as keyboard input — the simulator translates LF to CR and re-opens `/dev/tty` after EOF so you can keep typing:

```sh
# EhBASIC programs (pipe C for Cold start, blank line to skip memory size)
(printf "C\n\n"; cat programs/startrek.bas) | node dist/index.js

# Apple 1 BASIC programs
cat programs/lander.bas | node dist/index.js programs/a1basic.bin --org E000
```

### Sample programs

| Program | Load address | Description | How to run |
|---------|-------------|-------------|------------|
| `wozmon.bin` | `$0200` (default) | Woz Monitor | `node dist/index.js programs/wozmon.bin` |
| `a1basic.bin` | `$E000` | Apple 1 Integer BASIC | `node dist/index.js programs/a1basic.bin --org E000` |
| `test.bin` | `$0200` (default) | Simple test program | `node dist/index.js programs/test.bin` |
| `bounce.bin` | `$0400` | Bouncing ball with vsync (assembly) | `node dist/index.js programs/bounce.bin --org 0400` |
| `gfxtest.bin` | `$0400` | Color gradient (assembly) | `node dist/index.js programs/gfxtest.bin --org 0400` |
| `gfxtest2.bin` | `$0400` | Mode 2 vertical stripes (assembly) | `node dist/index.js programs/gfxtest2.bin --org 0400` |
| `gfxtest3.bin` | `$0400` | Mode 3 color bars (assembly) | `node dist/index.js programs/gfxtest3.bin --org 0400` |
| `gfxtest4.bin` | `$0400` | Mode 4 color bars (assembly) | `node dist/index.js programs/gfxtest4.bin --org 0400` |
| `bounce3.bin` | `$0400` | Mode 3 bouncing ball (assembly) | `node dist/index.js programs/bounce3.bin --org 0400` |
| `startrek.bas` | — | Super Star Trek (EhBASIC) | `(printf "C\n\n"; cat programs/startrek.bas) \| node dist/index.js` |
| `bounce.bas` | — | Bouncing ball (EhBASIC) | `(printf "C\n\n"; cat programs/bounce.bas) \| node dist/index.js` |
| `gfxtest.bas` | — | Color gradient (EhBASIC) | `(printf "C\n\n"; cat programs/gfxtest.bas) \| node dist/index.js` |
| `colorbars3.bas` | — | Mode 3 color bars (EhBASIC) | `(printf "C\n\n"; cat programs/colorbars3.bas) \| node dist/index.js` |
| `colorbars4.bas` | — | Mode 4 color bars (EhBASIC) | `(printf "C\n\n"; cat programs/colorbars4.bas) \| node dist/index.js` |
| `soundtest.bin` | `$0400` | C major scale (assembly) | `node dist/index.js programs/soundtest.bin --org 0400` |
| `soundtest.bas` | — | C major scale (EhBASIC) | `(printf "C\n\n"; cat programs/soundtest.bas) \| node dist/index.js` |
| `lander.bas` | — | Lunar Lander (Apple 1 BASIC) | `cat programs/lander.bas \| node dist/index.js programs/a1basic.bin --org E000` |
| `tictac.bas` | — | Tic-tac-toe (Apple 1 BASIC) | `cat programs/tictac.bas \| node dist/index.js programs/a1basic.bin --org E000` |

### Assembling programs

The included programs use [cc65](https://cc65.github.io/) syntax. Install with `brew install cc65` on macOS.

```sh
# Standalone program at $0400
ca65 --feature loose_string_term --feature labels_without_colons -o prog.o prog.asm
ld65 -C programs/standalone.cfg -o prog.bin prog.o

# Rebuild the EhBASIC ROM
ca65 --feature loose_string_term --feature labels_without_colons -o ehbasic.o programs/ehbasic.asm
ca65 --feature loose_string_term --feature labels_without_colons -o ehbasic_mon.o programs/ehbasic_mon.asm
ld65 -C programs/ehbasic.cfg -o programs/ehbasic.bin ehbasic.o ehbasic_mon.o
```

## Graphics

The simulator includes a terminal-based graphics chip using half-block characters (▀) with truecolor ANSI escape codes. Graphics are memory-mapped — the CPU communicates with the display purely through the memory map.

### Graphics modes

| Mode | Resolution | Colors | Bit depth | Framebuffer size | Terminal size |
|------|-----------|--------|-----------|-----------------|---------------|
| 0 | Text only | — | — | — | Any |
| 1 | 64×48 | 256 | 8bpp | 3,072 bytes | 64×24 |
| 2 | 256×192 | 2 | 1bpp | 6,144 bytes | 256×96 |
| 3 | 128×96 | 16 | 4bpp | 6,144 bytes | 128×48 |
| 4 | 128×128 | 256 | 8bpp | 16,384 bytes | 128×64 |

Enable a mode by writing to the mode register: `POKE 65028,1` (mode 1) or `STA $FE04` in assembly.

### Graphics primitives (ROM)

The ROM includes drawing routines callable from BASIC via `CALL` or from assembly via `JSR`:

| Primitive | Address | BASIC usage | Parameters (zero page) |
|-----------|---------|-------------|----------------------|
| CLG (clear) | 59598 ($E8CE) | `POKE 224,color : CALL 59598` | $E0=color |
| PLOT (pixel) | 59623 ($E8E7) | `POKE 225,x : POKE 226,y : CALL 59623` | $E0=color, $E1=X, $E2=Y |
| LINE (Bresenham) | 59675 ($E91B) | Set $E1-$E4, `CALL 59675` | $E0=color, $E1=X1, $E2=Y1, $E3=X2, $E4=Y2 |
| FILL (circle) | 59802 ($E99A) | `POKE 229,r : CALL 59802` | $E0=color, $E1=X, $E2=Y, $E5=radius |

### Vsync

Programs can synchronize with the display by writing 1 to the vsync register (`$FE05`) after completing a frame, then busy-waiting until the renderer clears it to 0. If a program never writes to vsync, the renderer runs freely at ~30 FPS.

```asm
; Assembly vsync
LDA #1
STA $FE05
@wait: LDA $FE05
       BNE @wait
```

## Sound

The simulator includes a sound chip running on its own worker thread, using the Web Audio API. It provides 3 independent tone channels and 1 noise channel, all controlled through memory-mapped registers.

### Sound registers

| Address | Description |
|---------|-------------|
| `$FE06` | Channel 1 frequency (low byte) |
| `$FE07` | Channel 1 frequency (high byte) |
| `$FE08` | Channel 1 waveform (0=sine, 1=square, 2=sawtooth, 3=triangle) |
| `$FE09` | Channel 1 volume (0–255, 0=silent) |
| `$FE0A`–`$FE0D` | Channel 2 (same layout) |
| `$FE0E`–`$FE11` | Channel 3 (same layout) |
| `$FE12` | Noise channel rate (controls noise color) |
| `$FE13` | Noise channel volume (0–255) |

Frequency is a 16-bit value in Hz (e.g., 440 for concert A). Write 0 to a channel's volume to silence it.

```asm
; Play a 440 Hz square wave on channel 1
LDA #1
STA $FE08       ; square waveform
LDA #128
STA $FE09       ; half volume
LDA #<440
STA $FE06       ; freq low byte
LDA #>440
STA $FE07       ; freq high byte
```

```basic
REM Play 440 Hz square wave
POKE 65032,1:REM SQUARE WAVE
POKE 65033,128:REM VOLUME
POKE 65030,184:REM 440 LOW BYTE
POKE 65031,1:REM 440 HIGH BYTE
```

### Color palette

Modes 1, 3, and 4 share a 256-color palette: 16 CGA primaries (0–15), a 6×6×6 color cube (16–231), and a 24-step grayscale ramp (232–255). Mode 3 uses the first 16 entries; modes 1 and 4 use all 256.

## Memory Map

| Address | Description |
|---------|-------------|
| `$0000`–`$00FF` | Zero page (fast access) |
| `$0100`–`$01FF` | Stack (SP initialized to `$FF`) |
| `$0200`–`$03FF` | System / input buffers |
| `$0400`–`$7FFF` | User RAM |
| `$8000`–`$BFFF` | Framebuffer (16 KB) |
| `$C000`–`$FFFF` | ROM (EhBASIC + monitor + graphics primitives) |
| `$FE00` | I/O: decimal number + newline |
| `$FE01` | I/O: ASCII character output |
| `$FE02` | I/O: input status (`$80` = data ready) |
| `$FE03` | I/O: input data (read byte) |
| `$FE04` | Graphics: mode register (0=text, 1=64×48, 2=256×192, 3=128×96, 4=128×128) |
| `$FE05` | Graphics: vsync register |
| `$FE06`–`$FE09` | Sound: channel 1 (freq lo/hi, waveform, volume) |
| `$FE0A`–`$FE0D` | Sound: channel 2 |
| `$FE0E`–`$FE11` | Sound: channel 3 |
| `$FE12` | Sound: noise rate |
| `$FE13` | Sound: noise volume |

The default load address is `$0200`. Use `--org HEX` to load elsewhere.

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

## Debug Mode

Pass `--debug` to log PC, opcode, registers, and status flags to stderr at each instruction boundary:

```
PC=$0200 LDAI  A=$00 X=$00 Y=$00 SP=$ff [nobdizc]
PC=$0202 STAA  A=$01 X=$00 Y=$00 SP=$ff [nobdizc]
```

## Performance

The simulator runs at approximately 2 MHz on modern hardware (reported on exit). This is comparable to original 6502 machines like the Apple II (1.023 MHz) and BBC Micro (2 MHz).

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
5. ✔ Run EhBASIC and real BASIC programs (Star Trek!)
6. ✔ Terminal-based graphics with memory-mapped I/O

## TODO

- [x] Mode 4: 128×128, 256 colors, 8bpp (16 KB framebuffer)
- [x] Sound chip — 3 tone channels (sine/square/sawtooth/triangle) + 1 noise channel, memory-mapped registers, running on its own worker thread like the graphics chip
- [ ] Double buffering for flicker-free BASIC graphics
- [ ] Interrupt system (IRQ, NMI, authentic BRK behavior, RTI instruction)
- [ ] Bank switching for ROM/I/O overlay — I/O registers ($FE00+) currently sit inside the ROM region ($C000–$FFFF), handled implicitly; a proper bank-switching mechanism would make this explicit
- [ ] Snapshot / restore (dump full 64KB + CPU registers to a file)
- [ ] Tape I/O via memory-mapped ports
- [ ] Programming manual — retro-style reference in the spirit of the BBC Micro User Guide, once features stabilize
