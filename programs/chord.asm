; chord.asm — play a C major chord on 3 channels, then arpeggiate
; Load at $0400

.segment "CODE"

CH1_FREQ_LO  = $FE06
CH1_FREQ_HI  = $FE07
CH1_WAVEFORM = $FE08
CH1_VOLUME   = $FE09

CH2_FREQ_LO  = $FE0A
CH2_FREQ_HI  = $FE0B
CH2_WAVEFORM = $FE0C
CH2_VOLUME   = $FE0D

CH3_FREQ_LO  = $FE0E
CH3_FREQ_HI  = $FE0F
CH3_WAVEFORM = $FE10
CH3_VOLUME   = $FE11

VSYNC        = $FE05

; --- Note table (lo/hi bytes) ---
; C4=262 E4=330 G4=392 C5=523 E5=659 G5=784
freq_lo: .byte <262, <330, <392, <523, <659, <784
freq_hi: .byte >262, >330, >392, >523, >659, >784

start:
    ; Channel 1: triangle (melody)
    LDA #3
    STA CH1_WAVEFORM
    ; Channel 2: square (harmony)
    LDA #1
    STA CH2_WAVEFORM
    ; Channel 3: sine (bass)
    LDA #0
    STA CH3_WAVEFORM

    ; --- Play full C major chord for 2 seconds ---
    ; C4 on ch1
    LDA freq_lo+0
    STA CH1_FREQ_LO
    LDA freq_hi+0
    STA CH1_FREQ_HI
    LDA #100
    STA CH1_VOLUME

    ; E4 on ch2
    LDA freq_lo+1
    STA CH2_FREQ_LO
    LDA freq_hi+1
    STA CH2_FREQ_HI
    LDA #80
    STA CH2_VOLUME

    ; G4 on ch3
    LDA freq_lo+2
    STA CH3_FREQ_LO
    LDA freq_hi+2
    STA CH3_FREQ_HI
    LDA #80
    STA CH3_VOLUME

    ; Hold chord for 120 frames (~2 seconds)
    LDY #120
    JSR wait_frames

    ; --- Arpeggiate up and down ---
    LDX #0              ; start at note 0
    LDA #3              ; 3 full cycles
    STA $E0

arp_loop:
    ; Silence channels 2 and 3
    LDA #0
    STA CH2_VOLUME
    STA CH3_VOLUME

    ; Play current note on ch1 at full volume
    LDA freq_lo,X
    STA CH1_FREQ_LO
    LDA freq_hi,X
    STA CH1_FREQ_HI
    LDA #128
    STA CH1_VOLUME

    ; Hold for 8 frames
    LDY #8
    JSR wait_frames

    INX
    CPX #6
    BNE arp_loop

    ; Now back down
arp_down:
    DEX
    CPX #$FF
    BEQ arp_cycle_done

    LDA freq_lo,X
    STA CH1_FREQ_LO
    LDA freq_hi,X
    STA CH1_FREQ_HI

    LDY #8
    JSR wait_frames

    JMP arp_down

arp_cycle_done:
    LDX #0
    DEC $E0
    BNE arp_loop

    ; --- Final chord, fade out ---
    LDA freq_lo+0
    STA CH1_FREQ_LO
    LDA freq_hi+0
    STA CH1_FREQ_HI
    LDA freq_lo+1
    STA CH2_FREQ_LO
    LDA freq_hi+1
    STA CH2_FREQ_HI
    LDA freq_lo+2
    STA CH3_FREQ_LO
    LDA freq_hi+2
    STA CH3_FREQ_HI

    LDA #128
    STA CH1_VOLUME
    STA CH2_VOLUME
    STA CH3_VOLUME

    ; Fade out over ~2 seconds
    LDX #128
fade:
    STX CH1_VOLUME
    STX CH2_VOLUME
    STX CH3_VOLUME

    LDY #2
    JSR wait_frames

    DEX
    BNE fade

    ; Silence all
    LDA #0
    STA CH1_VOLUME
    STA CH2_VOLUME
    STA CH3_VOLUME

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
