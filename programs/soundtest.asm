; soundtest.asm — play a C major scale on channel 1 (square wave)
; Load at $0400: ca65 + ld65 with standalone.cfg

.segment "CODE"

CH1_FREQ_LO = $FE06
CH1_FREQ_HI = $FE07
CH1_WAVEFORM = $FE08
CH1_VOLUME   = $FE09

VSYNC        = $FE05

; Note frequencies (Hz) for C major scale: C4 D4 E4 F4 G4 A4 B4 C5
; Stored as 16-bit little-endian
note_lo:  .byte <262, <294, <330, <349, <392, <440, <494, <523
note_hi:  .byte >262, >294, >330, >349, >392, >440, >494, >523

start:
    ; Set square wave
    LDA #1
    STA CH1_WAVEFORM

    ; Set volume
    LDA #128
    STA CH1_VOLUME

    LDX #0              ; note index

play_note:
    ; Set frequency
    LDA note_lo,X
    STA CH1_FREQ_LO
    LDA note_hi,X
    STA CH1_FREQ_HI

    ; Hold note for ~15 frames (~250ms at 60fps)
    LDY #15
hold:
    LDA #1
    STA VSYNC
@wait:
    LDA VSYNC
    BNE @wait
    DEY
    BNE hold

    INX
    CPX #8
    BNE play_note

    ; Silence
    LDA #0
    STA CH1_VOLUME

    ; Halt — loop forever
done:
    JMP done
