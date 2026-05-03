.export _init
.export _exit
.export __STARTUP__ : absolute = 1
.import _main
.import initlib, donelib
.import __BSS_RUN__, __BSS_SIZE__

.segment "STARTUP"

_init:
    ldx #$FF
    txs
    cld

    ; Clear BSS
    lda #<__BSS_RUN__
    sta $F0
    lda #>__BSS_RUN__
    sta $F1
    lda #0
    ldy #0
    ldx #>__BSS_SIZE__
    beq @tail
@page:
    sta ($F0),y
    iny
    bne @page
    inc $F1
    dex
    bne @page
@tail:
    cpy #<__BSS_SIZE__
    beq @done
    sta ($F0),y
    iny
    bne @tail
@done:

    jsr initlib
    jsr _main

_exit:
    jsr donelib
    brk
