; Bouncing ball — pure assembly, uses ROM graphics primitives
.org $0400

; ROM routine addresses (must match ehbasic_mon.asm build)
GFX_CLG  = $E8CE
GFX_FILL = $E99A

; Graphics zero-page params
GFX_COLOR  = $E0
GFX_X1     = $E1
GFX_Y1     = $E2
GFX_RADIUS = $E5

; I/O registers
MODE_REG = $FE04
VSYNC    = $FE05

; Our variables (use $F0-$F8, above Decss)
BALL_X   = $F0
BALL_Y   = $F1
BALL_DX  = $F2          ; +1 or $FF (-1)
BALL_DY  = $F3
BALL_R   = $F4
BALL_C   = $F5

SCREEN_W = 64
SCREEN_H = 48

start:
        ; init ball
        lda #32
        sta BALL_X
        lda #24
        sta BALL_Y
        lda #$01
        sta BALL_DX
        sta BALL_DY
        lda #4
        sta BALL_R
        lda #10
        sta BALL_C

        ; enable graphics mode 1
        lda #$01
        sta MODE_REG

loop:


        ; --- erase ball at current position ---
        lda #$00
        sta GFX_COLOR
        lda BALL_X
        sta GFX_X1
        lda BALL_Y
        sta GFX_Y1
        lda BALL_R
        sta GFX_RADIUS
        jsr GFX_FILL

        ; --- move ball ---
        lda BALL_X
        clc
        adc BALL_DX
        sta BALL_X

        lda BALL_Y
        clc
        adc BALL_DY
        sta BALL_Y

        ; --- bounce checks ---
        ; X < R?
        lda BALL_X
        cmp BALL_R
        bcs @xmin_ok
        lda BALL_R
        sta BALL_X
        lda #$01
        sta BALL_DX
        inc BALL_C
@xmin_ok:
        ; X > (W-1-R)?
        lda #SCREEN_W-1
        sec
        sbc BALL_R
        cmp BALL_X
        bcs @xmax_ok
        sta BALL_X
        lda #$FF
        sta BALL_DX
        inc BALL_C
@xmax_ok:
        ; Y < R?
        lda BALL_Y
        cmp BALL_R
        bcs @ymin_ok
        lda BALL_R
        sta BALL_Y
        lda #$01
        sta BALL_DY
        inc BALL_C
@ymin_ok:
        ; Y > (H-1-R)?
        lda #SCREEN_H-1
        sec
        sbc BALL_R
        cmp BALL_Y
        bcs @ymax_ok
        sta BALL_Y
        lda #$FF
        sta BALL_DY
        inc BALL_C
@ymax_ok:
        ; wrap color to 1 if > 255 (inc from $FF wraps to $00)
        lda BALL_C
        bne @color_ok
        lda #$01
        sta BALL_C
@color_ok:

        ; --- draw ball at new position ---
        lda BALL_C
        sta GFX_COLOR
        lda BALL_X
        sta GFX_X1
        lda BALL_Y
        sta GFX_Y1
        lda BALL_R
        sta GFX_RADIUS
        jsr GFX_FILL

        ; signal vsync and wait for renderer
        lda #$01
        sta VSYNC
@vsync_wait:
        lda VSYNC
        bne @vsync_wait

        jmp loop
