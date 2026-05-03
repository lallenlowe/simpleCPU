; Mode 3 test: 128x96, 4bpp, 16 colors
; Fills screen with horizontal color bars (each color gets 6 rows)
; Two pixels per byte: high nibble = left, low nibble = right

.feature labels_without_colons

MODE_REG = $FE04
FB_START = $8000

        .org $0400

        ; Build color byte: same color in both nibbles
        ; Fill 6,144 bytes (64 bytes/row * 96 rows)

        LDX #0          ; color counter (0-15)
        LDA #0
        STA $E0         ; current color byte
        STA $E1         ; row counter within color band

        ; Set up framebuffer pointer
        LDA #<FB_START
        STA $E2
        LDA #>FB_START
        STA $E3

        ; Total rows = 96, 6 rows per color = 16 colors
next_color:
        ; Build color byte: high nibble = low nibble = X
        TXA
        ASL
        ASL
        ASL
        ASL
        STA $E0         ; high nibble
        TXA
        ORA $E0
        STA $E0         ; both nibbles = same color

        LDY #0          ; row counter for this band
next_row:
        ; Fill 64 bytes (one row)
        TYA
        PHA             ; save row counter

        LDA $E0
        LDY #0
fill_row:
        STA ($E2),Y
        INY
        CPY #64
        BNE fill_row

        ; Advance pointer by 64
        CLC
        LDA $E2
        ADC #64
        STA $E2
        LDA $E3
        ADC #0
        STA $E3

        PLA             ; restore row counter
        TAY
        INY
        CPY #6          ; 6 rows per color band
        BNE next_row

        INX
        CPX #16
        BNE next_color

        ; Enable mode 3
        LDA #3
        STA MODE_REG

        ; Halt
halt:   JMP halt
