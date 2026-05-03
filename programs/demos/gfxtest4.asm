; gfxtest4.asm — Mode 4 test: 256 color bars (128x128, 8bpp)
; Each color gets half a row (128 pixels / 256 colors = every 2 rows gets 2 colors)
; Actually: 128 rows, 256 colors → 2 colors per row (left half / right half)

MODE_REG = $FE04
FB_START = $8000

        .org $0400

        ; Set mode 4
        LDA #4
        STA MODE_REG

        ; Fill framebuffer: 128 rows × 128 bytes = 16384 bytes
        ; Row N: left 64 bytes = color N*2, right 64 bytes = color N*2+1

        LDA #0
        STA $E0           ; current color (even)

        LDA #<FB_START
        STA $E2           ; pointer low
        LDA #>FB_START
        STA $E3           ; pointer high

row_loop:
        ; Fill left half (64 bytes) with even color
        LDA $E0
        LDY #0
@left:  STA ($E2),Y
        INY
        CPY #64
        BNE @left

        ; Fill right half (64 bytes) with odd color (even+1)
        LDA $E0
        CLC
        ADC #1
@right: STA ($E2),Y
        INY
        CPY #128
        BNE @right

        ; Advance pointer by 128
        CLC
        LDA $E2
        ADC #128
        STA $E2
        BCC @no_carry
        INC $E3
@no_carry:

        ; Advance color by 2
        CLC
        LDA $E0
        ADC #2
        STA $E0

        ; If color wrapped to 0, we're done (256 colors / 2 per row = 128 rows)
        BNE row_loop

        ; Spin forever
halt:   JMP halt
