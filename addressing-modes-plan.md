# Addressing Modes Implementation Plan

## Overview
Add zero page, indexed, and indirect addressing modes to simpleCPU. Each step builds on the previous and is independently testable. All address math routes through the existing ALU (matching real 6502 architecture).

## Step 1: Zero Page ✅ if done
**Example:** `LDA $42` (opcode $A5)

No new signals needed. Same as absolute but fetch only 1 address byte — high byte is implicitly $00.

**Instructions to add:**
- LDA $zp ($A5), STA $zp ($85)
- LDX $zp ($A6), STX $zp ($86)
- LDY $zp ($A4), STY $zp ($84)
- ADC $zp ($65), SBC $zp ($E5)
- AND $zp ($25), ORA $zp ($05), EOR $zp ($45)
- CMP $zp ($C5), CPX $zp ($E4), CPY $zp ($C4)
- BIT $zp ($24)
- ASL $zp ($06), LSR $zp ($46), ROL $zp ($26), ROR $zp ($66)
- INC $zp ($E6), DEC $zp ($C6)

**Microcode pattern (read):**
```
fetch operand → dal (address low byte, high stays $00)
bao, mi, ro, <dest>, bac
```

**Test:** Store value at zero page, read it back, verify.

---

## Step 2: Zero Page,X / Zero Page,Y
**Example:** `LDA $42,X` (opcode $B5)

First use of ALU for address math. Needs one new signal: add with carry forced to 0, no flag side effects.

**New signal:** `dEa` (or similar) — add aluA + aluB with carry=0, result in S register, flags unchanged.

**Microcode pattern:**
```
fetch operand → la (base address into aluA)
xo → lb (X into aluB)
dEa (add, no carry, no flags)
so → dal (result into address low, high stays $00)
bao, mi, ro, <dest>, bac
```

Zero page wraps: $FF + $01 = $00, stays in page zero (natural 8-bit overflow).

**Instructions:** Same as step 1 but with ,X or ,Y suffix. ZP,Y only exists for LDX and STX.

**Test:** `LDX #$05; STA $40; LDA $3B,X` → loads from $0040.

---

## Step 3: Absolute,X / Absolute,Y
**Example:** `LDA $1000,X` (opcode $BD)

Same ALU addition but on 16-bit base address. Add index to low byte; if ALU produces carry, increment high byte in a subsequent cycle.

**Microcode pattern:**
```
fetch addr_low → la, pce
fetch addr_high → dah, pce
xo → lb
dEa (add low byte + X, check carry)
so → dal
bao, mi, ro, <dest>, bac
(if carry: fix up high byte — extra cycle)
```

**Page crossing:** $10FF + X=2 → need to detect carry and add 1 to high byte $10 → $11.

**Instructions:** Most read/write ops with ,X; LDA, STA, ADC, SBC, AND, ORA, EOR, CMP, LDX,Y, LDY,X, etc.

**Test:** Verify with and without page crossing.

---

## Step 4: JMP Indirect
**Example:** `JMP ($1000)` (opcode $6C)

Read a 16-bit pointer from memory at the operand address, set PC to that pointer value. No ALU math needed.

**Microcode pattern:**
```
fetch ptr_addr_low → dal, pce
fetch ptr_addr_high → dah, pce
bao, mi, ro, dal2 (read low byte of target)   — need temp storage
inc address, mi, ro, dah2 (read high byte of target)
bao, pcai, bac (set PC)
```

Note: Real 6502 has a famous bug — indirect JMP doesn't cross page boundaries ($xxFF wraps to $xx00). We should replicate this for compatibility.

**Test:** Store a 16-bit address in memory, JMP indirect to it.

---

## Step 5: Indexed Indirect — (Indirect,X)
**Example:** `LDA ($40,X)` (opcode $A1)

Combine step 2 (zero page + X) with step 4 (pointer dereference). Add X to zero page address, read 16-bit pointer from that location, load from pointed address.

**Microcode pattern:**
```
fetch zp_base → la
xo → lb
dEa (zp_base + X, wraps in zero page)
so → dal (effective ZP address)
bao, mi, ro, dal2 (read ptr low)
bao+1, mi, ro, dah2 (read ptr high)
bao2, mi, ro, <dest>, bac
```

**Instructions:** LDA, STA, ADC, SBC, AND, ORA, EOR, CMP.

**Test:** Set up a pointer in zero page, index with X, verify load.

---

## Step 6: Indirect Indexed — (Indirect),Y
**Example:** `LDA ($40),Y` (opcode $B1)

Read 16-bit pointer from zero page, then add Y to the result. The most important indirect mode — pointer + offset access.

**Microcode pattern:**
```
fetch zp_addr → dal (zero page address of pointer)
bao, mi, ro, dal2 (read ptr low byte)
bao+1, mi, ro, dah2 (read ptr high byte)  
ptr_low → la, yo → lb
dEa (ptr_low + Y)
so → dal (new low byte, carry may need high byte fix)
bao, mi, ro, <dest>, bac
```

**Instructions:** Same as step 5.

**Test:** Set up a pointer, add Y offset, verify load from computed address.

---

## Architecture Notes
- All address math goes through the existing ALU (aluA/aluB → byteAdder → S register)
- Need "add with zero carry, no flag update" to avoid corrupting program state during address calculation
- Zero page indexed wraps within page zero (8-bit overflow)
- Absolute indexed may cross page boundaries (needs carry propagation to high byte)
- The real 6502 uses its single ALU for both data and address math — we match this
