; Graphics Mode 2 test — 256x192 monochrome (1bpp)
; Draws vertical stripes + a diagonal line
.org $0400

FRAMEBUFFER = $8000
MODE_REG    = $FE04
FB_SIZE     = 6144        ; 256*192/8

; Zero-page variables
ptr         = $00         ; 2 bytes: framebuffer pointer
count       = $02         ; page counter
xpos        = $03         ; diagonal x position (byte offset)
bitmask     = $04         ; diagonal bit mask

start:
        ; --- Fill with vertical stripe pattern ($AA = 10101010) ---
        lda #<FRAMEBUFFER
        sta ptr
        lda #>FRAMEBUFFER
        sta ptr+1

        ldx #>(FB_SIZE)   ; 24 pages
        ldy #$00

fill:
        lda #$AA          ; alternating pixel columns
        sta (ptr),y
        iny
        bne fill
        inc ptr+1
        dex
        bne fill

        ; --- Draw diagonal line (top-left to bottom-right) ---
        ; For each row y (0..191), set pixel at x=y
        ; Byte offset in row = y/8, bit = 7-(y&7)

        lda #<FRAMEBUFFER
        sta ptr
        lda #>FRAMEBUFFER
        sta ptr+1

        ldx #192          ; row counter

diagloop:
        ; compute x = 192 - X (current row number)
        txa
        eor #$FF
        clc
        adc #192+1        ; A = 192 - X = current row (0..191)

        ; byte offset = A >> 3
        pha               ; save row/x value
        lsr
        lsr
        lsr
        tay               ; Y = byte offset in row

        ; bit position = 7 - (x & 7)
        pla               ; restore x
        and #$07
        sta bitmask
        lda #$80          ; start with bit 7
shift:
        dec bitmask
        bmi doset
        lsr
        jmp shift

doset:
        ; OR the bit into the framebuffer byte
        ora (ptr),y
        sta (ptr),y

        ; advance pointer by 32 bytes (one row = 256 pixels / 8)
        lda ptr
        clc
        adc #32
        sta ptr
        lda ptr+1
        adc #$00
        sta ptr+1

        dex
        bne diagloop

        ; --- Enable mode 2 ---
        lda #$02
        sta MODE_REG

hang:
        jmp hang
