; breakout.asm — Breakout for simpleCPU
; Mode 3: 128×96, 16 colors, 4bpp
; Controls: mouse or a/d keys
; Load at $0400

.segment "CODE"

; --- I/O ---
IO_STATUS    = $FE02
IO_DATA      = $FE03
MODE_REG     = $FE04
VSYNC        = $FE05
CH1_FREQ_LO  = $FE06
CH1_FREQ_HI  = $FE07
CH1_WAVEFORM = $FE08
CH1_VOLUME   = $FE09
MOUSE_X      = $FE14

; Sprite registers: 4 bytes each (X, Y, pattern, color)
SPR0_X       = $FE20
SPR0_Y       = $FE21
SPR0_PAT     = $FE22
SPR0_COL     = $FE23
SPR1_X       = $FE24
SPR1_Y       = $FE25
SPR1_PAT     = $FE26
SPR1_COL     = $FE27
SPR2_X       = $FE28
SPR2_Y       = $FE29
SPR2_PAT     = $FE2A
SPR2_COL     = $FE2B

; Sprite pattern table
SPR_PATTERNS = $7E00

; --- Zero page ---
BALL_X       = $E0
BALL_Y       = $E1
BALL_DX      = $E2      ; 1 or $FF (-1)
BALL_DY      = $E3
PADDLE_X     = $E4
OLD_BALL_X   = $E5
OLD_BALL_Y   = $E6
COLOR        = $E7
FB_LO        = $E8
FB_HI        = $E9
SOUND_TIMER  = $EA
TEMP         = $EB
TEMP2        = $EC
BRICKS_LEFT  = $ED
OLD_PADDLE   = $EE
LIVES        = $EF
PLOT_X       = $F0
PLOT_Y       = $F1
BRICK_COL    = $F2
BRICK_ROW    = $F3
HIT_FLAG     = $F4
CHECK_Y      = $F5

; --- Constants ---
PADDLE_Y     = 90
PADDLE_W     = 16
PADDLE_SPD   = 4
BRICK_COLS   = 16
BRICK_ROWS   = 5
BRICK_TOP    = 10
BRICK_H      = 4
SCREEN_W     = 128
SCREEN_H     = 96
PAT_BALL     = 0        ; pattern index for ball
PAT_PADDLE_L = 1        ; pattern index for left paddle half
PAT_PADDLE_R = 2        ; pattern index for right paddle half

; Brick storage
BRICKS       = $0300

; Colors
COL_BG       = 0
COL_BALL     = 15       ; white
COL_PADDLE   = 11       ; light cyan

; ============================================================
; ENTRY — jump past data tables
; ============================================================
    JMP start

; --- Data ---
brick_colors: .byte 4, 12, 14, 2, 3       ; red, pink, yellow, green, cyan
brick_freq_lo: .byte <880, <784, <659, <523, <440
brick_freq_hi: .byte >880, >784, >659, >523, >440
y_shift_tbl:  .byte $00, $40, $80, $C0

; ============================================================
; MAIN
; ============================================================
start:
    LDA #3
    STA MODE_REG

    LDA #1
    STA CH1_WAVEFORM
    LDA #0
    STA CH1_VOLUME
    STA SOUND_TIMER

    LDA #3
    STA LIVES

    JSR init_sprites
    JSR init_bricks
    JSR clear_screen
    JSR draw_all_bricks

    LDA #56              ; (128-16)/2
    STA PADDLE_X
    STA OLD_PADDLE
    JSR update_paddle_sprites

    JSR reset_ball
    JSR update_ball_sprite

; ============================================================
; GAME LOOP
; ============================================================
game_loop:
    LDA #1
    STA VSYNC
@vs: LDA VSYNC
    BNE @vs

    ; --- Sound timer ---
    LDA SOUND_TIMER
    BEQ @no_snd
    DEC SOUND_TIMER
    BNE @no_snd
    LDA #0
    STA CH1_VOLUME
@no_snd:

    JSR handle_input

    ; --- Move X ---
    LDA BALL_X
    CLC
    ADC BALL_DX
    STA BALL_X
    CMP #128
    BCC @no_lwall
    LDA #0
    STA BALL_X
    JSR flip_dx
    JSR snd_wall
    JMP @xdone
@no_lwall:
    CMP #126
    BCC @xdone
    LDA #126
    STA BALL_X
    JSR flip_dx
    JSR snd_wall
@xdone:

    ; --- Move Y ---
    LDA BALL_Y
    CLC
    ADC BALL_DY
    STA BALL_Y

    ; Top wall
    CMP #128
    BCC @no_twall
    LDA #0
    STA BALL_Y
    JSR flip_dy
    JSR snd_wall
    JMP @ydone
@no_twall:

    ; Paddle check (only when going down)
    LDA BALL_DY
    BMI @ydone           ; going up, skip paddle

    LDA BALL_Y
    CMP #(PADDLE_Y - 1)
    BCC @ydone           ; above paddle

    ; Check X overlap
    LDA BALL_X
    SEC
    SBC PADDLE_X
    CLC
    ADC #1
    CMP #(PADDLE_W + 2)
    BCS @maybe_miss

    ; Hit paddle!
    LDA #(PADDLE_Y - 2)
    STA BALL_Y
    JSR flip_dy
    JSR snd_paddle
    JMP @ydone

@maybe_miss:
    LDA BALL_Y
    CMP #(SCREEN_H - 2)
    BCC @ydone
    JMP ball_lost

@ydone:

    ; --- Brick collision ---
    JSR check_bricks

    ; --- Check win ---
    LDA BRICKS_LEFT
    BEQ game_won

    JSR update_ball_sprite

    JMP game_loop

; ============================================================
; BALL LOST
; ============================================================
ball_lost:
    JSR snd_miss
    DEC LIVES
    BEQ game_over

    ; Pause
    LDY #45
    JSR wait_frames

    JSR reset_ball
    JSR update_ball_sprite
    JMP game_loop

; ============================================================
; GAME OVER
; ============================================================
game_over:
    LDA #<100
    STA CH1_FREQ_LO
    LDA #>100
    STA CH1_FREQ_HI
    LDA #120
    STA CH1_VOLUME
    LDA #120
    STA SOUND_TIMER
    JSR wait_for_key
    JMP start

; ============================================================
; GAME WON
; ============================================================
game_won:
    ; Ascending fanfare
    LDX #4
@fan:
    LDA brick_freq_lo,X
    STA CH1_FREQ_LO
    LDA brick_freq_hi,X
    STA CH1_FREQ_HI
    LDA #128
    STA CH1_VOLUME
    LDY #12
    JSR wait_frames
    DEX
    BPL @fan
    LDA #0
    STA CH1_VOLUME
    JSR wait_for_key
    JMP start

; ============================================================
; SUBROUTINES
; ============================================================

; --- Init sprite patterns ---
init_sprites:
    ; Pattern 0: ball (2x2 block in top-left of 8x8)
    LDA #%11000000
    STA SPR_PATTERNS + (PAT_BALL * 8) + 0
    STA SPR_PATTERNS + (PAT_BALL * 8) + 1
    LDA #0
    STA SPR_PATTERNS + (PAT_BALL * 8) + 2
    STA SPR_PATTERNS + (PAT_BALL * 8) + 3
    STA SPR_PATTERNS + (PAT_BALL * 8) + 4
    STA SPR_PATTERNS + (PAT_BALL * 8) + 5
    STA SPR_PATTERNS + (PAT_BALL * 8) + 6
    STA SPR_PATTERNS + (PAT_BALL * 8) + 7

    ; Pattern 1: paddle left half (8x2 solid block)
    LDA #%11111111
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 0
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 1
    LDA #0
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 2
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 3
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 4
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 5
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 6
    STA SPR_PATTERNS + (PAT_PADDLE_L * 8) + 7

    ; Pattern 2: paddle right half (same as left)
    LDA #%11111111
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 0
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 1
    LDA #0
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 2
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 3
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 4
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 5
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 6
    STA SPR_PATTERNS + (PAT_PADDLE_R * 8) + 7

    ; Disable all sprites initially
    LDA #0
    STA SPR0_COL
    STA SPR1_COL
    STA SPR2_COL
    RTS

; --- Update ball sprite (sprite 0) ---
update_ball_sprite:
    LDA BALL_X
    STA SPR0_X
    LDA BALL_Y
    STA SPR0_Y
    LDA #PAT_BALL
    STA SPR0_PAT
    LDA #COL_BALL
    STA SPR0_COL
    RTS

; --- Update paddle sprites (sprites 1-2) ---
update_paddle_sprites:
    LDA PADDLE_X
    STA SPR1_X
    LDA #PADDLE_Y
    STA SPR1_Y
    LDA #PAT_PADDLE_L
    STA SPR1_PAT
    LDA #COL_PADDLE
    STA SPR1_COL

    LDA PADDLE_X
    CLC
    ADC #8
    STA SPR2_X
    LDA #PADDLE_Y
    STA SPR2_Y
    LDA #PAT_PADDLE_R
    STA SPR2_PAT
    LDA #COL_PADDLE
    STA SPR2_COL
    RTS

; --- Init all bricks alive ---
init_bricks:
    LDX #0
    LDA #1
@ib: STA BRICKS,X
    INX
    CPX #(BRICK_COLS * BRICK_ROWS)
    BNE @ib
    LDA #(BRICK_COLS * BRICK_ROWS)
    STA BRICKS_LEFT
    RTS

; --- Reset ball ---
reset_ball:
    LDA #63
    STA BALL_X
    STA OLD_BALL_X
    LDA #60
    STA BALL_Y
    STA OLD_BALL_Y
    LDA #1
    STA BALL_DX
    LDA #$FF
    STA BALL_DY
    RTS

; --- Handle input (mouse + keyboard a/d) ---
handle_input:
    ; Try mouse first
    LDA MOUSE_X
    BEQ @keyboard          ; no mouse data, try keyboard

    ; Center paddle on mouse: paddle_x = mouse_x - PADDLE_W/2
    SEC
    SBC #(PADDLE_W / 2 + 1)
    BCS @mclamp_lo
    LDA #0
@mclamp_lo:
    CMP #(SCREEN_W - PADDLE_W)
    BCC @mclamp_hi
    LDA #(SCREEN_W - PADDLE_W)
@mclamp_hi:
    JMP @update

@keyboard:
    ; Drain all pending keys, keep last direction
    LDX #0
@poll:
    LDA IO_STATUS
    AND #$80
    BEQ @act
    LDA IO_DATA
    AND #$7F
    TAX
    JMP @poll
@act:
    CPX #0
    BEQ @done

    CPX #$61             ; 'a'
    BEQ @left
    CPX #$41             ; 'A'
    BEQ @left
    CPX #$64             ; 'd'
    BEQ @right
    CPX #$44             ; 'D'
    BEQ @right
    JMP @done

@left:
    LDA PADDLE_X
    SEC
    SBC #PADDLE_SPD
    BCS @update
    LDA #0
    JMP @update

@right:
    LDA PADDLE_X
    CLC
    ADC #PADDLE_SPD
    CMP #(SCREEN_W - PADDLE_W)
    BCC @update
    LDA #(SCREEN_W - PADDLE_W)

@update:
    CMP PADDLE_X
    BEQ @done
    LDX PADDLE_X
    STX OLD_PADDLE
    STA PADDLE_X
    JSR update_paddle_sprites

@done:
    RTS



; --- Calc framebuffer row address ---
; A = pixel Y → FB_LO/FB_HI
calc_fb_addr:
    PHA
    LSR
    LSR
    CLC
    ADC #$80
    STA FB_HI
    PLA
    AND #$03
    TAX
    LDA y_shift_tbl,X
    STA FB_LO
    RTS

; --- Draw all bricks ---
draw_all_bricks:
    LDA #0
    STA BRICK_ROW
@dr:
    LDA #0
    STA BRICK_COL
@dc:
    LDA BRICK_ROW
    ASL
    ASL
    ASL
    ASL
    ORA BRICK_COL
    TAX
    LDA BRICKS,X
    BEQ @skip

    LDX BRICK_ROW
    LDA brick_colors,X
    STA COLOR
    LDA BRICK_COL
    LDX BRICK_ROW
    JSR draw_one_brick

@skip:
    INC BRICK_COL
    LDA BRICK_COL
    CMP #BRICK_COLS
    BNE @dc
    INC BRICK_ROW
    LDA BRICK_ROW
    CMP #BRICK_ROWS
    BNE @dr
    RTS

; --- Draw one brick ---
; A = col, X = row, COLOR set
draw_one_brick:
    STA TEMP2            ; col
    TXA
    ASL
    ASL
    CLC
    ADC #BRICK_TOP
    STA PLOT_Y           ; pixel y

    LDA TEMP2
    ASL
    ASL
    STA TEMP             ; byte offset = col * 4

    LDA COLOR
    ASL
    ASL
    ASL
    ASL
    ORA COLOR
    STA TEMP2            ; fill byte

    LDX #BRICK_H
@br:
    LDA PLOT_Y
    JSR calc_fb_addr
    LDA TEMP
    CLC
    ADC FB_LO
    STA FB_LO
    BCC @bnc
    INC FB_HI
@bnc:
    LDA TEMP2
    LDY #0
    STA (FB_LO),Y
    INY
    STA (FB_LO),Y
    INY
    STA (FB_LO),Y
    INY
    STA (FB_LO),Y
    INC PLOT_Y
    DEX
    BNE @br
    RTS

; --- Check brick collision ---
check_bricks:
    LDA #0
    STA HIT_FLAG

    ; Determine check Y (leading edge)
    LDA BALL_DY
    BMI @up
    LDA BALL_Y
    CLC
    ADC #1
    JMP @have_y
@up:
    LDA BALL_Y
@have_y:
    STA CHECK_Y

    ; In brick area?
    CMP #BRICK_TOP
    BCC @no_hit
    CMP #(BRICK_TOP + BRICK_ROWS * BRICK_H)
    BCS @no_hit

    ; brick_row = (check_y - BRICK_TOP) / 4
    SEC
    SBC #BRICK_TOP
    LSR
    LSR
    STA BRICK_ROW

    ; Check left pixel column
    LDA BALL_X
    LSR
    LSR
    LSR
    STA BRICK_COL
    JSR try_hit

    ; Check right pixel column
    LDA BALL_X
    CLC
    ADC #1
    LSR
    LSR
    LSR
    CMP BRICK_COL
    BEQ @skip2           ; same column
    STA BRICK_COL
    CMP #BRICK_COLS
    BCS @skip2
    JSR try_hit

@skip2:
    ; Bounce if any hit
    LDA HIT_FLAG
    BEQ @no_hit
    JSR flip_dy
@no_hit:
    RTS

; --- Try to hit brick at BRICK_COL, BRICK_ROW ---
try_hit:
    LDA BRICK_ROW
    ASL
    ASL
    ASL
    ASL
    ORA BRICK_COL
    TAX
    LDA BRICKS,X
    BEQ @miss

    ; Kill it
    LDA #0
    STA BRICKS,X
    DEC BRICKS_LEFT

    ; Erase
    LDA #COL_BG
    STA COLOR
    LDA BRICK_COL
    LDX BRICK_ROW
    JSR draw_one_brick

    ; Sound
    LDX BRICK_ROW
    LDA brick_freq_lo,X
    STA CH1_FREQ_LO
    LDA brick_freq_hi,X
    STA CH1_FREQ_HI
    LDA #100
    STA CH1_VOLUME
    LDA #4
    STA SOUND_TIMER

    LDA #1
    STA HIT_FLAG

@miss:
    RTS

; --- Flip directions ---
flip_dx:
    LDA BALL_DX
    EOR #$FE
    STA BALL_DX
    RTS

flip_dy:
    LDA BALL_DY
    EOR #$FE
    STA BALL_DY
    RTS

; --- Sound effects ---
snd_wall:
    LDA #<1000
    STA CH1_FREQ_LO
    LDA #>1000
    STA CH1_FREQ_HI
    LDA #60
    STA CH1_VOLUME
    LDA #3
    STA SOUND_TIMER
    RTS

snd_paddle:
    LDA #<500
    STA CH1_FREQ_LO
    LDA #>500
    STA CH1_FREQ_HI
    LDA #80
    STA CH1_VOLUME
    LDA #5
    STA SOUND_TIMER
    RTS

snd_miss:
    LDA #<150
    STA CH1_FREQ_LO
    LDA #>150
    STA CH1_FREQ_HI
    LDA #120
    STA CH1_VOLUME
    LDA #30
    STA SOUND_TIMER
    RTS

; --- Clear screen ---
clear_screen:
    LDA #$80
    STA FB_HI
    LDA #0
    STA FB_LO
    TAY
    LDX #24              ; 24 pages = 6144 bytes
@pg:
    LDA #0
@cl: STA (FB_LO),Y
    INY
    BNE @cl
    INC FB_HI
    DEX
    BNE @pg
    RTS

; --- Wait for any key press ---
wait_for_key:
    LDA IO_STATUS
    AND #$80
    BEQ wait_for_key
    LDA IO_DATA
    RTS

; --- Wait Y frames ---
wait_frames:
    LDA #1
    STA VSYNC
@wf: LDA VSYNC
    BNE @wf
    DEY
    BNE wait_frames
    RTS
