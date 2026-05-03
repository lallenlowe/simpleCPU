; breakout.asm — Breakout for simpleCPU
; Mode 3: 128×96, 16 colors, 4bpp
; Controls: a = left, d = right
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
PADDLE_DIR   = $F6      ; 0=stopped, 1=right, $FF=left

; --- Constants ---
PADDLE_Y     = 90
PADDLE_W     = 16
PADDLE_SPD   = 4
BRICK_COLS   = 16
BRICK_ROWS   = 5
BRICK_TOP    = 10       ; first brick row y
BRICK_H      = 4
SCREEN_W     = 128
SCREEN_H     = 96

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

    JSR init_bricks
    JSR clear_screen
    JSR draw_all_bricks

    LDA #56              ; (128-16)/2
    STA PADDLE_X
    STA OLD_PADDLE
    LDA #COL_PADDLE
    STA COLOR
    JSR draw_paddle_rect

    LDA #0
    STA PADDLE_DIR

    JSR reset_ball
    LDA #COL_BALL
    STA COLOR
    JSR draw_ball

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
    JSR move_paddle

    ; Save & erase ball
    LDA BALL_X
    STA OLD_BALL_X
    LDA BALL_Y
    STA OLD_BALL_Y
    LDA #COL_BG
    STA COLOR
    JSR draw_ball

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

    ; Draw ball
    LDA #COL_BALL
    STA COLOR
    JSR draw_ball

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
    LDA #COL_BALL
    STA COLOR
    JSR draw_ball
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
@halt: JMP @halt

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
@wh: JMP @wh

; ============================================================
; SUBROUTINES
; ============================================================

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

; --- Handle input (set direction) ---
handle_input:
    LDA IO_STATUS
    AND #$80
    BEQ @done

    LDA IO_DATA
    AND #$7F
    CMP #$61             ; 'a' = move left
    BEQ @left
    CMP #$64             ; 'd' = move right
    BEQ @right
    CMP #$73             ; 's' = stop
    BEQ @stop
    JMP handle_input

@left:
    LDA #$FF
    STA PADDLE_DIR
    JMP handle_input
@right:
    LDA #1
    STA PADDLE_DIR
    JMP handle_input
@stop:
    LDA #0
    STA PADDLE_DIR
    JMP handle_input
@done:
    RTS

; --- Move paddle based on direction ---
move_paddle:
    LDA PADDLE_DIR
    BEQ @no_move

    LDA PADDLE_X
    STA OLD_PADDLE

    LDA PADDLE_DIR
    BMI @go_left

    ; Move right
    LDA PADDLE_X
    CLC
    ADC #PADDLE_SPD
    CMP #(SCREEN_W - PADDLE_W)
    BCC @store
    LDA #(SCREEN_W - PADDLE_W)
    JMP @store

@go_left:
    LDA PADDLE_X
    SEC
    SBC #PADDLE_SPD
    BCS @store
    LDA #0

@store:
    STA PADDLE_X
    JSR redraw_paddle
@no_move:
    RTS

; --- Redraw paddle ---
redraw_paddle:
    ; Erase old
    LDA PADDLE_X
    PHA
    LDA OLD_PADDLE
    STA PADDLE_X
    LDA #COL_BG
    STA COLOR
    JSR draw_paddle_rect
    PLA
    STA PADDLE_X
    ; Draw new
    LDA #COL_PADDLE
    STA COLOR
    JSR draw_paddle_rect
    RTS

; --- Draw paddle rect at PADDLE_X ---
draw_paddle_rect:
    LDA #PADDLE_Y
    STA PLOT_Y
    LDX #2               ; 2 rows tall
@pr:
    LDA PLOT_Y
    JSR calc_fb_addr
    LDA PADDLE_X
    LSR
    CLC
    ADC FB_LO
    STA FB_LO
    BCC @pnc
    INC FB_HI
@pnc:
    LDA COLOR
    ASL
    ASL
    ASL
    ASL
    ORA COLOR
    LDY #0
@pw: STA (FB_LO),Y
    INY
    CPY #(PADDLE_W / 2)   ; 8 bytes
    BNE @pw
    INC PLOT_Y
    DEX
    BNE @pr
    RTS

; --- Draw ball 2×2 at BALL_X, BALL_Y ---
draw_ball:
    LDA BALL_X
    STA PLOT_X
    LDA BALL_Y
    STA PLOT_Y
    JSR plot_pixel
    INC PLOT_X
    JSR plot_pixel
    LDA BALL_X
    STA PLOT_X
    INC PLOT_Y
    JSR plot_pixel
    INC PLOT_X
    JSR plot_pixel
    RTS

; --- Plot pixel at PLOT_X, PLOT_Y with COLOR ---
plot_pixel:
    LDA PLOT_Y
    JSR calc_fb_addr
    LDA PLOT_X
    LSR
    CLC
    ADC FB_LO
    STA FB_LO
    BCC @pnc
    INC FB_HI
@pnc:
    LDA PLOT_X
    AND #1
    BNE @odd
    ; Even: high nibble
    LDY #0
    LDA (FB_LO),Y
    AND #$0F
    STA TEMP
    LDA COLOR
    ASL
    ASL
    ASL
    ASL
    ORA TEMP
    STA (FB_LO),Y
    RTS
@odd:
    ; Odd: low nibble
    LDY #0
    LDA (FB_LO),Y
    AND #$F0
    ORA COLOR
    STA (FB_LO),Y
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

; --- Wait Y frames ---
wait_frames:
    LDA #1
    STA VSYNC
@wf: LDA VSYNC
    BNE @wf
    DEY
    BNE wait_frames
    RTS
