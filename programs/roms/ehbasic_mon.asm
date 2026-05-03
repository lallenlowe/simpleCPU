; minimal monitor for EhBASIC on simpleCPU simulator
; Derived from EhBASIC
;
; I/O addresses match simpleCPU memory map:
;   $FE01 = character output
;   $FE02 = input status (bit 7 set = data ready)
;   $FE03 = input data (bit 7 set on returned byte)

	.include "ehbasic.asm"

CR  = $0D
LF  = $0A

; put the IRQ and NMI code in RAM so that it can be changed

IRQ_vec	= VEC_SV+2		; IRQ code vector
NMI_vec	= IRQ_vec+$0A	; NMI code vector

; reset vector points here

RES_vec
	CLD			; clear decimal mode
	LDX	#$FF		; empty stack
	TXS			; set the stack

; set up vectors and interrupt code, copy them to page 2

	LDY	#END_CODE-LAB_vec	; set index/count
LAB_stlp
	LDA	LAB_vec-1,Y	; get byte from interrupt code
	STA	VEC_IN-1,Y	; save to RAM
	DEY			; decrement index/count
	BNE	LAB_stlp	; loop if more to do

; seed the PRNG - all-zero LFSR stays zero forever with RND(0)
	LDA	#$A5
	STA	Rbyte1
	LDA	#$69
	STA	Rbyte2
	LDA	#$3C
	STA	Rbyte3
	LDA	#$17
	STA	Rbyte4

; now do the signon message, Y = $00 here

LAB_signon
	LDA	LAB_mess,Y	; get byte from sign on message
	BEQ	LAB_nokey	; exit loop if done

	JSR	V_OUTP		; output character
	INY			; increment index
	BNE	LAB_signon	; loop, branch always

LAB_nokey
	JSR	V_INPT		; call scan input device
	BCC	LAB_nokey	; loop if no key

	AND	#$DF		; mask to upper case
	CMP	#'W'		; compare with [W]arm start
	BEQ	LAB_dowarm	; branch if [W]arm start

	CMP	#'C'		; compare with [C]old start
	BNE	RES_vec		; loop if not [C]old start

	JMP	LAB_COLD	; do EhBASIC cold start

LAB_dowarm
	JMP	LAB_WARM	; do EhBASIC warm start

; byte out to simpleCPU terminal

ACIAout
	CMP	#LF		; ignore line feed
	BEQ	@ignore
	STA	$FE01		; write character to simulator output port
@ignore
	RTS

; byte in from simpleCPU terminal

ACIAin
	LDA	$FE02		; check input status
	BPL	LAB_nobyw	; branch if no byte waiting (bit 7 clear)

	LDA	$FE03		; read input byte
	AND	#$7F		; clear high bit
	SEC			; flag byte received
	RTS

LAB_nobyw
	CLC			; flag no byte received
	RTS

; stub LOAD — just print error

LOAD
	LDA	#'?'
	JSR	ACIAout
	RTS

; stub SAVE — just print error

SAVE
	LDA	#'?'
	JSR	ACIAout
	RTS

; vector tables

LAB_vec
	.word	ACIAin		; byte in
	.word	ACIAout		; byte out
	.word	LOAD		; load vector for EhBASIC
	.word	SAVE		; save vector for EhBASIC

; EhBASIC IRQ support

IRQ_CODE
	PHA			; save A
	LDA	IrqBase		; get the IRQ flag byte
	LSR			; shift the set b7 to b6, and on down ...
	ORA	IrqBase		; OR the original back in
	STA	IrqBase		; save the new IRQ flag byte
	PLA			; restore A
	RTI

; EhBASIC NMI support

NMI_CODE
	PHA			; save A
	LDA	NmiBase		; get the NMI flag byte
	LSR			; shift the set b7 to b6, and on down ...
	ORA	NmiBase		; OR the original back in
	STA	NmiBase		; save the new NMI flag byte
	PLA			; restore A
	RTI

END_CODE

LAB_mess
	.byte	$0D,$0A,"6502 EhBASIC [C]old/[W]arm ?",$00

; =========================================================================
; Graphics primitives — called from BASIC via CALL addr
;
; Zero-page parameter block ($E0-$EE):
;   $E0 = current color (GCOL)
;   $E1 = X1 (or X)
;   $E2 = Y1 (or Y)
;   $E3 = X2
;   $E4 = Y2
;   $E5 = radius
;   $E6-$E7 = temp pointer (used internally)
;   $E8-$EE = working variables (used internally)
;
; Usage from BASIC:
;   POKE 224,color : CALL CLG    — clear screen to color
;   POKE 224,color               — set drawing color
;   POKE 225,x : POKE 226,y : CALL PLOT  — draw pixel
;   POKE 225,x1 : POKE 226,y1 : POKE 227,x2 : POKE 228,y2 : CALL LINE
;   POKE 225,cx : POKE 226,cy : POKE 229,r : CALL FILL
; =========================================================================

GFX_COLOR	= $E0
GFX_X1		= $E1
GFX_Y1		= $E2
GFX_X2		= $E3
GFX_Y2		= $E4
GFX_RADIUS	= $E5
GFX_PTR		= $E6		; 2 bytes
GFX_TMP1	= $E8
GFX_TMP2	= $E9
GFX_TMP3	= $EA
GFX_TMP4	= $EB
GFX_TMP5	= $EC
GFX_TMP6	= $ED
GFX_TMP7	= $EE

FRAMEBUFFER	= $8000
FB_PAGES	= $0C		; 12 pages = 3072 bytes (64*48)
SCREEN_W	= 64
VSYNC		= $FE05

; ----- CLG: clear framebuffer with GFX_COLOR -----

GFX_CLG:
	LDA	#<FRAMEBUFFER
	STA	GFX_PTR
	LDA	#>FRAMEBUFFER
	STA	GFX_PTR+1
	LDX	#FB_PAGES
	LDY	#$00
	LDA	GFX_COLOR
@loop:
	STA	(GFX_PTR),Y
	INY
	BNE	@loop
	INC	GFX_PTR+1
	DEX
	BNE	@loop
	RTS

; ----- PLOT: set pixel at (GFX_X1, GFX_Y1) to GFX_COLOR -----
; Only works for Mode 1 (64x48, 1 byte per pixel)

GFX_PLOT:
	; bounds check
	LDA	GFX_X1
	CMP	#SCREEN_W
	BCS	@done
	LDA	GFX_Y1
	CMP	#48
	BCS	@done
	; addr = FRAMEBUFFER + Y1 * 64 + X1
	; Y1 * 64 = Y1 << 6
	LDA	#$00
	STA	GFX_PTR+1
	LDA	GFX_Y1
	; shift left 6: equivalent to rotating the byte into high/low
	ASL
	ASL			; *4
	ROL	GFX_PTR+1
	ASL			; *8
	ROL	GFX_PTR+1
	ASL			; *16
	ROL	GFX_PTR+1
	ASL			; *32
	ROL	GFX_PTR+1
	ASL			; *64
	ROL	GFX_PTR+1
	CLC
	ADC	GFX_X1
	STA	GFX_PTR
	LDA	GFX_PTR+1
	ADC	#>FRAMEBUFFER
	STA	GFX_PTR+1
	LDA	GFX_COLOR
	LDY	#$00
	STA	(GFX_PTR),Y
@done:
	RTS

; ----- LINE: Bresenham from (X1,Y1) to (X2,Y2) in GFX_COLOR -----
; Uses GFX_TMP1-TMP7 as working vars
;
; dx = abs(x2-x1), sx = sign(x2-x1)
; dy = -abs(y2-y1), sy = sign(y2-y1)
; err = dx + dy

LINE_DX		= GFX_TMP1
LINE_DY		= GFX_TMP2	; stored as -abs(dy)
LINE_SX		= GFX_TMP3	; +1 or -1 ($FF)
LINE_SY		= GFX_TMP4	; +1 or -1 ($FF)
LINE_ERR	= GFX_TMP5
LINE_E2		= GFX_TMP6
LINE_CX		= GFX_X1	; current x (modified in place)
LINE_CY		= GFX_Y1	; current y (modified in place)

GFX_LINE:
	; compute dx = abs(x2 - x1), sx = sign
	LDA	GFX_X2
	SEC
	SBC	GFX_X1
	BCS	@sx_pos
	; negative: dx = -result, sx = -1
	EOR	#$FF
	CLC
	ADC	#$01
	STA	LINE_DX
	LDA	#$FF
	STA	LINE_SX
	JMP	@do_dy
@sx_pos:
	STA	LINE_DX
	LDA	#$01
	STA	LINE_SX

@do_dy:
	; compute dy = -abs(y2 - y1), sy = sign
	LDA	GFX_Y2
	SEC
	SBC	GFX_Y1
	BCS	@sy_pos
	; negative: abs = -result, dy = -(abs) = result, sy = -1
	STA	LINE_DY		; already negative, which is -abs
	LDA	#$FF
	STA	LINE_SY
	JMP	@init_err
@sy_pos:
	; positive: dy = -result
	EOR	#$FF
	CLC
	ADC	#$01
	STA	LINE_DY
	LDA	#$01
	STA	LINE_SY

@init_err:
	; err = dx + dy
	LDA	LINE_DX
	CLC
	ADC	LINE_DY
	STA	LINE_ERR

@line_loop:
	; plot current pixel
	JSR	GFX_PLOT

	; check if we reached the endpoint
	LDA	LINE_CX
	CMP	GFX_X2
	BNE	@not_done
	LDA	LINE_CY
	CMP	GFX_Y2
	BEQ	@line_done

@not_done:
	; e2 = 2 * err
	LDA	LINE_ERR
	ASL
	STA	LINE_E2

	; if e2 >= dy then err += dy, cx += sx
	; (signed compare: e2 - dy >= 0)
	LDA	LINE_E2
	SEC
	SBC	LINE_DY
	BMI	@skip_x		; e2 < dy (signed)
	LDA	LINE_ERR
	CLC
	ADC	LINE_DY
	STA	LINE_ERR
	LDA	LINE_CX
	CLC
	ADC	LINE_SX
	STA	LINE_CX
@skip_x:

	; if e2 <= dx then err += dx, cy += sy
	; (signed compare: dx - e2 >= 0)
	LDA	LINE_DX
	SEC
	SBC	LINE_E2
	BMI	@skip_y		; dx < e2 (signed)
	LDA	LINE_ERR
	CLC
	ADC	LINE_DX
	STA	LINE_ERR
	LDA	LINE_CY
	CLC
	ADC	LINE_SY
	STA	LINE_CY
@skip_y:
	JMP	@line_loop

@line_done:
	RTS

; ----- FILL: filled circle at (X1,Y1) radius R in GFX_COLOR -----
; Draws horizontal spans using midpoint circle algorithm
;
; Uses GFX_TMP1-TMP5 as working vars

FILL_CX		= GFX_TMP1	; circle x (offset from center)
FILL_CY		= GFX_TMP2	; circle y
FILL_D		= GFX_TMP3	; decision parameter (signed byte)
FILL_OX		= GFX_TMP4	; saved X1 (center x)
FILL_OY		= GFX_TMP5	; saved Y1 (center y)

GFX_FILL:
	; save center
	LDA	GFX_X1
	STA	FILL_OX
	LDA	GFX_Y1
	STA	FILL_OY

	; cx = 0, cy = radius, d = 1 - radius
	LDA	#$00
	STA	FILL_CX
	LDA	GFX_RADIUS
	STA	FILL_CY

	LDA	#$01
	SEC
	SBC	GFX_RADIUS
	STA	FILL_D

@fill_loop:
	; while cx <= cy
	LDA	FILL_CX
	CMP	FILL_CY
	BEQ	@still_going
	BCS	@fill_done
@still_going:

	; draw 4 horizontal spans:
	; span at center_y + cy: from center_x - cx to center_x + cx
	; span at center_y - cy: same x range
	; span at center_y + cx: from center_x - cy to center_x + cy
	; span at center_y - cx: same x range

	; --- span 1: y = oy + cy, x from ox-cx to ox+cx ---
	LDA	FILL_OY
	CLC
	ADC	FILL_CY
	STA	GFX_Y1
	JSR	@draw_span_cx

	; --- span 2: y = oy - cy ---
	LDA	FILL_OY
	SEC
	SBC	FILL_CY
	STA	GFX_Y1
	JSR	@draw_span_cx

	; --- span 3: y = oy + cx, x from ox-cy to ox+cy ---
	LDA	FILL_OY
	CLC
	ADC	FILL_CX
	STA	GFX_Y1
	JSR	@draw_span_cy

	; --- span 4: y = oy - cx ---
	LDA	FILL_OY
	SEC
	SBC	FILL_CX
	STA	GFX_Y1
	JSR	@draw_span_cy

	; update midpoint: if d < 0 then d += 2*cx+3 else cy--, d += 2*(cx-cy)+5
	LDA	FILL_D
	BMI	@d_neg
	; d >= 0: cy--, d += 2*(cx-cy)+5
	DEC	FILL_CY
	LDA	FILL_CX
	SEC
	SBC	FILL_CY
	ASL			; 2*(cx-cy)
	CLC
	ADC	#$05
	CLC
	ADC	FILL_D
	STA	FILL_D
	JMP	@next_cx
@d_neg:
	; d < 0: d += 2*cx+3
	LDA	FILL_CX
	ASL			; 2*cx
	CLC
	ADC	#$03
	CLC
	ADC	FILL_D
	STA	FILL_D

@next_cx:
	INC	FILL_CX
	JMP	@fill_loop

@fill_done:
	; restore center coords
	LDA	FILL_OX
	STA	GFX_X1
	LDA	FILL_OY
	STA	GFX_Y1
	RTS

; helper: draw horizontal span from ox-cx to ox+cx at current GFX_Y1
@draw_span_cx:
	LDA	FILL_OX
	SEC
	SBC	FILL_CX
	STA	GFX_X1
	LDA	FILL_OX
	CLC
	ADC	FILL_CX
	STA	GFX_X2
	JMP	@draw_hspan

; helper: draw horizontal span from ox-cy to ox+cy at current GFX_Y1
@draw_span_cy:
	LDA	FILL_OX
	SEC
	SBC	FILL_CY
	STA	GFX_X1
	LDA	FILL_OX
	CLC
	ADC	FILL_CY
	STA	GFX_X2
	; fall through to @draw_hspan

; draw a horizontal line from GFX_X1 to GFX_X2 at GFX_Y1 using GFX_COLOR
; fast path: compute row base address once, then fill bytes
@draw_hspan:
	; bounds check Y
	LDA	GFX_Y1
	CMP	#48
	BCS	@hspan_done
	; compute row base: FRAMEBUFFER + Y1 * 64
	LDA	#$00
	STA	GFX_PTR+1
	LDA	GFX_Y1
	ASL
	ASL
	ROL	GFX_PTR+1
	ASL
	ROL	GFX_PTR+1
	ASL
	ROL	GFX_PTR+1
	ASL
	ROL	GFX_PTR+1
	ASL
	ROL	GFX_PTR+1
	STA	GFX_PTR
	LDA	GFX_PTR+1
	CLC
	ADC	#>FRAMEBUFFER
	STA	GFX_PTR+1
	; clamp x1 to [0, 63]
	LDA	GFX_X1
	BPL	@x1ok
	LDA	#$00
@x1ok:
	CMP	#SCREEN_W
	BCC	@x1clamped
	LDA	#SCREEN_W-1
@x1clamped:
	TAY			; Y = start x
	; clamp x2 to [0, 63]
	LDA	GFX_X2
	BPL	@x2ok
	LDA	#$00
@x2ok:
	CMP	#SCREEN_W
	BCC	@x2clamped
	LDA	#SCREEN_W-1
@x2clamped:
	TAX			; X = end x
	LDA	GFX_COLOR
@hspan_loop:
	STA	(GFX_PTR),Y
	CPY	GFX_X2
	BCS	@hspan_done
	INY
	CPY	#SCREEN_W
	BCC	@hspan_loop
@hspan_done:
	RTS

; system vectors

	.segment "VECTORS"

	.word	NMI_vec		; NMI vector
	.word	RES_vec		; RESET vector
	.word	IRQ_vec		; IRQ vector
