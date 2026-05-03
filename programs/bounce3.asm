; Mode 3 bouncing ball — 128x96, 4bpp, 16 colors
; Direct framebuffer writes (ROM primitives are mode-1 only)

.feature labels_without_colons

MODE_REG  = $FE04
VSYNC     = $FE05
FB_START  = $8000
ROW_BYTES = 64           ; 128 pixels / 2 pixels per byte

; Ball state
BALL_X    = $F0
BALL_Y    = $F1
BALL_DX   = $F2
BALL_DY   = $F3
OLD_X     = $F4
OLD_Y     = $F5
RADIUS    = 4

; Temp vars
PTR       = $E6          ; 16-bit framebuffer pointer
TMP       = $E8
TMP2      = $E9
DRAW_COL  = $EA          ; color for draw_ball

          .org $0400

          ; Clear framebuffer to color 1 (dark red) in both nibbles = $11
          LDA #<FB_START
          STA PTR
          LDA #>FB_START
          STA PTR+1
          LDX #24        ; 24 pages = 6144 bytes
          LDY #0
          LDA #$11       ; dark red in both nibbles
@clr:     STA (PTR),Y
          INY
          BNE @clr
          INC PTR+1
          DEX
          BNE @clr

          ; Init ball
          LDA #64
          STA BALL_X
          LDA #48
          STA BALL_Y
          LDA #2
          STA BALL_DX
          LDA #1
          STA BALL_DY

          ; Enable mode 3
          LDA #3
          STA MODE_REG

loop:
          ; Save old position
          LDA BALL_X
          STA OLD_X
          LDA BALL_Y
          STA OLD_Y

          ; --- Move X ---
          CLC
          LDA BALL_X
          ADC BALL_DX
          STA BALL_X
          ; Bounce check: signed DX, so check if new pos is out of bounds
          CMP #RADIUS
          BCC flip_dx
          CMP #(128-RADIUS)
          BCS flip_dx
          JMP check_y
flip_dx:
          LDA OLD_X
          STA BALL_X
          LDA #0
          SEC
          SBC BALL_DX
          STA BALL_DX

check_y:
          CLC
          LDA BALL_Y
          ADC BALL_DY
          STA BALL_Y
          CMP #RADIUS
          BCC flip_dy
          CMP #(96-RADIUS)
          BCS flip_dy
          JMP draw
flip_dy:
          LDA OLD_Y
          STA BALL_Y
          LDA #0
          SEC
          SBC BALL_DY
          STA BALL_DY

draw:
          ; Erase old ball (dark red = 1)
          LDA #1
          STA DRAW_COL
          LDA OLD_X
          LDX OLD_Y
          JSR draw_ball

          ; Draw new ball (yellow = 11)
          LDA #11
          STA DRAW_COL
          LDA BALL_X
          LDX BALL_Y
          JSR draw_ball

          ; Vsync
          LDA #1
          STA VSYNC
@wait:    LDA VSYNC
          BNE @wait

          JMP loop

; ============================================================
; draw_ball: draw filled circle at (A=cx, X=cy) with RADIUS
;   Uses DRAW_COL for color
;   Brute-force: scan bounding box, plot if dx*dx+dy*dy <= r*r
; ============================================================
draw_ball:
          STA TMP           ; TMP = cx
          STX TMP2          ; TMP2 = cy

          ; Y loop: cy-RADIUS to cy+RADIUS
          TXA
          SEC
          SBC #RADIUS
          TAX               ; X = start row (cy - RADIUS)
          BPL @row_ok
          LDX #0            ; clamp to 0
@row_ok:

@yloop:
          ; check row upper bound
          TXA
          CMP #96
          BCC @row_inbounds
          JMP @done
@row_inbounds:
          ; check if row > cy + RADIUS
          SEC
          SBC TMP2
          CMP #(RADIUS+1)
          BCC @not_past
          JMP @done
@not_past:
          ; dy = row - cy (signed, but we need absolute for distance)
          ; A still = row - cy
          ; Get |dy|
          CMP #$80
          BCC @dy_pos
          EOR #$FF
          CLC
          ADC #1
@dy_pos:
          ; A = |dy|
          STA $EB           ; $EB = |dy|

          ; X loop: cx-RADIUS to cx+RADIUS
          STX $EC           ; save row in $EC
          LDA TMP
          SEC
          SBC #RADIUS       ; A = start col
          BPL @col_ok
          LDA #0
@col_ok:
          TAY               ; Y = col

@xloop:
          ; check col bounds
          CPY #128
          BCC @col_inbounds
          JMP @next_row
@col_inbounds:
          ; check if col > cx + RADIUS
          TYA
          SEC
          SBC TMP           ; A = col - cx
          CMP #(RADIUS+1)
          BCC @not_past_x
          CMP #$80
          BCC @jmp_next_row  ; positive and >= RADIUS+1, done with row
          JMP @not_past_x
@jmp_next_row:
          JMP @next_row
@not_past_x:
          ; Get |dx|
          CMP #$80
          BCC @dx_pos
          EOR #$FF
          CLC
          ADC #1
@dx_pos:
          ; A = |dx|, $EB = |dy|
          ; Check dx*dx + dy*dy <= RADIUS*RADIUS
          ; Use lookup? No, just multiply
          STA $ED           ; $ED = |dx|
          ; dx*dx
          LDA #0
          CLC
          LDX $ED
          BEQ @dx2_done
@dx2:     ADC $ED
          DEX
          BNE @dx2
@dx2_done:
          STA $EE           ; $EE = dx*dx

          LDA #0
          CLC
          LDX $EB
          BEQ @dy2_done
@dy2:     ADC $EB
          DEX
          BNE @dy2
@dy2_done:
          ; A = dy*dy
          CLC
          ADC $EE           ; A = dx*dx + dy*dy
          CMP #(RADIUS*RADIUS+1)
          BCS @skip_pixel

          ; --- Plot pixel at (Y=col, $EC=row) ---
          ; framebuffer byte = FB_START + row * 64 + col/2
          ; pixel is left nibble if col even, right if odd
          STY $EF           ; save col

          ; Calculate row * 64
          ; row * 64 = row << 6
          LDA $EC           ; row
          LSR               ; row >> 1
          LSR               ; row >> 2  (row/4, carry has bit)
          ; Actually: row*64 = row * 64
          ; Low byte = (row << 6) & $FF = (row & 3) << 6
          ; High byte = row >> 2
          LDA $EC
          AND #$03
          ASL
          ASL
          ASL
          ASL
          ASL
          ASL               ; low byte of row*64
          STA PTR

          LDA $EC
          LSR
          LSR               ; high byte of row*64
          CLC
          ADC #>FB_START
          STA PTR+1

          ; Add col/2
          TYA               ; col
          LSR               ; col/2
          CLC
          ADC PTR
          STA PTR
          LDA PTR+1
          ADC #0
          STA PTR+1

          ; Read current byte
          LDY #0
          LDA (PTR),Y

          ; Merge nibble
          LDX $EF           ; col
          TXA
          AND #$01
          BNE @right_nib

          ; Left nibble (high): clear high, set high
          LDA (PTR),Y
          AND #$0F           ; keep right nibble
          STA $F6
          LDA DRAW_COL
          ASL
          ASL
          ASL
          ASL
          ORA $F6
          STA (PTR),Y
          JMP @skip_pixel

@right_nib:
          ; Right nibble (low): clear low, set low
          LDA (PTR),Y
          AND #$F0           ; keep left nibble
          ORA DRAW_COL
          STA (PTR),Y

@skip_pixel:
          LDY $EF           ; restore col
          LDX $EC           ; restore row
          INY
          JMP @xloop

@next_row:
          LDX $EC           ; restore row
          INX
          JMP @yloop

@done:
          RTS
