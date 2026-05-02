; Graphics test — fill framebuffer with diagonal stripes, enable mode 1
.org $0400

start:
    ; set up zero-page pointer at $00/$01
    lda #$00
    sta $00         ; low byte of framebuffer pointer
    lda #$80
    sta $01         ; high byte ($8000)

    ldx #$0C        ; 12 pages = 3072 bytes (64*48)
    ldy #$00
    lda #$00
    sta $02         ; color counter

fill:
    lda $02
    clc
    adc #$01        ; increment color
    sta $02
    sta ($00),y     ; write to framebuffer via pointer
    iny
    bne fill
    ; next page
    inc $01
    dex
    bne fill

    ; enable graphics mode 1
    lda #$01
    sta $FE04

    ; spin forever
hang:
    jmp hang
