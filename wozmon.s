; Woz Monitor - ported to simpleCPU
; Original by Steve Wozniak, 1976
; Adapted for simpleCPU memory-mapped I/O
;
; Usage:
;   Type hex addresses to examine memory: 0200
;   Type address range with dot: 0200.020F
;   Store bytes with colon: 0300: A9 01 8D 00 FE
;   Run code at address: 0300R
;   Backspace to correct, ESC to cancel line

; Page 0 Variables

XAML            = $24           ; Last "opened" location Low
XAMH            = $25           ; Last "opened" location High
STL             = $26           ; Store address Low
STH             = $27           ; Store address High
L               = $28           ; Hex value parsing Low
H               = $29           ; Hex value parsing High
YSAV            = $2A           ; Used to see if hex value is given
MODE            = $2B           ; $00=XAM, $7F=STOR, $AE=BLOCK XAM

; Other Variables

IN              = $0300         ; Input buffer (above program code)

; simpleCPU I/O addresses

IOSTATUS        = $FE02         ; Input status (1=data ready, 0=not ready)
IOREAD          = $FE03         ; Input data (read character)
IOWRITE         = $FE01         ; Output character

                * = $0200

RESET:          CLD             ; Clear decimal arithmetic mode.
                CLI
                LDA #$0A        ; Newline.
                JSR ECHO        ; Output it.
                LDY #$01        ; Initialize text index.
                BNE GETPROMPT   ; Always taken — show prompt.

NOTCR:          CMP #$FF        ; DEL key? ($7F | $80)
                BEQ BACKSPACE   ; Yes.
                CMP #$9B        ; ESC? ($1B | $80)
                BEQ ESCAPE      ; Yes.
                INY             ; Advance text index.
                BPL NEXTCHAR    ; Auto ESC if > 127.
ESCAPE:         LDA #$DC        ; "\" | $80.
                JSR ECHO        ; Output it.
GETLINE:        LDA #$8D        ; CR | $80.
                JSR ECHO        ; Output it.
                LDY #$01        ; Initialize text index.
GETPROMPT:      LDA #$DC        ; "\" | $80 — prompt character.
                JSR ECHO        ; Output prompt.
BACKSPACE:      DEY             ; Back up text index.
                BMI GETLINE     ; Beyond start of line, reinitialize.
NEXTCHAR:       LDA IOSTATUS    ; Key ready?
                BEQ NEXTCHAR    ; Loop until ready.
                LDA IOREAD      ; Load character.
                ORA #$80        ; Set high bit (wozmon convention).
                STA IN,Y        ; Add to text buffer.
                JSR ECHO        ; Display character.
                CMP #$8D        ; CR? ($0D | $80)
                BNE NOTCR       ; No.
                LDY #$FF        ; Reset text index.
                LDA #$00        ; For XAM mode.
                TAX             ; 0->X.
SETSTOR:        ASL             ; Leaves $7B if setting STOR mode.
SETMODE:        STA MODE        ; $00=XAM, $7B=STOR, $AE=BLOCK XAM.
BLSKIP:         INY             ; Advance text index.
NEXTITEM:       LDA IN,Y        ; Get character.
                CMP #$8D        ; CR?
                BEQ GETLINE     ; Yes, done this line.
                CMP #$AE        ; "." | $80?
                BCC BLSKIP      ; Skip delimiter.
                BEQ SETMODE     ; Set BLOCK XAM mode.
                CMP #$BA        ; ":" | $80?
                BEQ SETSTOR     ; Yes. Set STOR mode.
                CMP #$D2        ; "R" | $80?
                BEQ RUN         ; Yes. Run user program.
                STX L           ; $00->L.
                STX H           ;  and H.
                STY YSAV        ; Save Y for comparison.
NEXTHEX:        LDA IN,Y        ; Get character for hex test.
                EOR #$B0        ; Map digits to $0-9.
                CMP #$0A        ; Digit?
                BCC DIG         ; Yes.
                ADC #$88        ; Map letter "A"-"F" to $FA-FF.
                CMP #$FA        ; Hex letter?
                BCC NOTHEX      ; No, character not hex.
DIG:            ASL
                ASL             ; Hex digit to MSD of A.
                ASL
                ASL
                LDX #$04        ; Shift count.
HEXSHIFT:       ASL             ; Hex digit left, MSB to carry.
                ROL L           ; Rotate into LSD.
                ROL H           ; Rotate into MSD's.
                DEX             ; Done 4 shifts?
                BNE HEXSHIFT    ; No, loop.
                INY             ; Advance text index.
                BNE NEXTHEX     ; Always taken. Check next char for hex.
NOTHEX:         CPY YSAV        ; Check if L, H empty (no hex digits).
                BEQ ESCAPE      ; Yes, generate ESC sequence.
                BIT MODE        ; Test MODE byte.
                BVC NOTSTOR     ; B6=0 STOR, 1 for XAM and BLOCK XAM.
                LDA L           ; LSD's of hex data.
                STA (STL,X)     ; Store at current 'store index'.
                INC STL         ; Increment store index.
                BNE NEXTITEM    ; Get next item. (no carry).
                INC STH         ; Add carry to 'store index' high order.
TONEXTITEM:     JMP NEXTITEM    ; Get next command item.
RUN:            JMP (XAML)      ; Run at current XAM index.
NOTSTOR:        BMI XAMNEXT     ; B7=0 for XAM, 1 for BLOCK XAM.
                LDX #$02        ; Byte count.
SETADR:         LDA L-1,X       ; Copy hex data to
                STA STL-1,X     ;  'store index'.
                STA XAML-1,X    ; And to 'XAM index'.
                DEX             ; Next of 2 bytes.
                BNE SETADR      ; Loop unless X=0.
NXTPRNT:        BNE PRDATA      ; NE means no address to print.
                LDA #$8D        ; CR.
                JSR ECHO        ; Output it.
                LDA XAMH        ; 'Examine index' high-order byte.
                JSR PRBYTE      ; Output it in hex format.
                LDA XAML        ; Low-order 'examine index' byte.
                JSR PRBYTE      ; Output it in hex format.
                LDA #$BA        ; ":" | $80.
                JSR ECHO        ; Output it.
PRDATA:         LDA #$A0        ; Blank | $80.
                JSR ECHO        ; Output it.
                LDA (XAML,X)    ; Get data byte at 'examine index'.
                JSR PRBYTE      ; Output it in hex format.
XAMNEXT:        STX MODE        ; 0->MODE (XAM mode).
                LDA XAML
                CMP L           ; Compare 'examine index' to hex data.
                LDA XAMH
                SBC H
                BCS TONEXTITEM  ; Not less, so no more data to output.
                INC XAML
                BNE MOD8CHK     ; Increment 'examine index'.
                INC XAMH
MOD8CHK:        LDA XAML        ; Check low-order 'examine index' byte.
                AND #$07        ;  For MOD 8=0.
                BPL NXTPRNT     ; Always taken.
PRBYTE:         PHA             ; Save A for LSD.
                LSR
                LSR
                LSR             ; MSD to LSD position.
                LSR
                JSR PRHEX       ; Output hex digit.
                PLA             ; Restore A.
PRHEX:          AND #$0F        ; Mask LSD for hex print.
                ORA #$B0        ; Add "0" | $80.
                CMP #$BA        ; Digit?
                BCC ECHO        ; Yes, output it.
                ADC #$06        ; Add offset for letter.
ECHO:           AND #$7F        ; Strip high bit for output.
                CMP #$0D        ; CR?
                BNE ECHOOUT     ; No, just output.
                LDA #$0A        ; Convert CR to LF for terminal.
ECHOOUT:        STA IOWRITE     ; Output character.
                RTS             ; Return.
