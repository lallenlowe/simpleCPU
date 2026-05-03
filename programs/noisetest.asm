; noisetest.asm — demo the noise channel at different rates
; Load at $0400

.segment "CODE"

NOISE_RATE   = $FE12
NOISE_VOLUME = $FE13
VSYNC        = $FE05

; Noise rates: low rumble → bright hiss
rates: .byte 16, 32, 64, 96, 128, 192, 255
NUM_RATES = 7

start:
    LDX #0

play_rate:
    LDA rates,X
    STA NOISE_RATE
    LDA #160
    STA NOISE_VOLUME

    ; Hold for 60 frames (~1 second)
    LDY #60
    JSR wait_frames

    ; Brief silence between rates
    LDA #0
    STA NOISE_VOLUME
    LDY #10
    JSR wait_frames

    INX
    CPX #NUM_RATES
    BNE play_rate

    ; Swell: ramp volume up and down at mid rate
    LDA #128
    STA NOISE_RATE

    LDX #0
swell_up:
    STX NOISE_VOLUME
    LDY #1
    JSR wait_frames
    INX
    BNE swell_up

swell_down:
    DEX
    STX NOISE_VOLUME
    LDY #1
    JSR wait_frames
    CPX #0
    BNE swell_down

    ; Silence
    LDA #0
    STA NOISE_VOLUME

done:
    JMP done

; --- wait Y frames using vsync ---
wait_frames:
    LDA #1
    STA VSYNC
@vwait:
    LDA VSYNC
    BNE @vwait
    DEY
    BNE wait_frames
    RTS
