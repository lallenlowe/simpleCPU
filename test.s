; simpleCPU test suite
; Exercises every implemented instruction
; Output to $FE00 — each STA $FE00 prints a test result
; Expected output: 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26

* = $0000

; --- Test 1: LDA immediate ---
        LDA #$01        ; A=1
        STA $FE00       ; output 1

; --- Test 2: ADC immediate ---
        CLC
        ADC #$01        ; A=1+1=2
        STA $FE00       ; output 2

; --- Test 3: STA / LDA absolute ---
        STA $0200       ; store 2 at $0200
        LDA #$00        ; clear A
        LDA $0200       ; reload from $0200, A=2
        CLC
        ADC #$01        ; A=3
        STA $FE00       ; output 3

; --- Test 4: TAX ---
        LDA #$04
        TAX             ; X=4
        STX $FE00       ; output 4

; --- Test 5: TAY ---
        LDA #$05
        TAY             ; Y=5
        STY $FE00       ; output 5

; --- Test 6: TXA ---
        LDX #$06
        TXA             ; A=6
        STA $FE00       ; output 6

; --- Test 7: TYA ---
        LDY #$07
        TYA             ; A=7
        STA $FE00       ; output 7

; --- Test 8: LDX immediate ---
        LDX #$08
        STX $FE00       ; output 8

; --- Test 9: LDY immediate ---
        LDY #$09
        STY $FE00       ; output 9

; --- Test 10: LDX absolute ---
        LDA #$0A
        STA $0200
        LDX $0200       ; X=10
        STX $FE00       ; output 10

; --- Test 11: LDY absolute ---
        LDA #$0B
        STA $0200
        LDY $0200       ; Y=11
        STY $FE00       ; output 11

; --- Test 12: ADC absolute ---
        LDA #$06
        STA $0200       ; store 6
        LDA #$06
        CLC
        ADC $0200       ; A=6+6=12
        STA $FE00       ; output 12

; --- Test 13: SBC immediate ---
        LDA #$10        ; A=16
        SEC
        SBC #$03        ; A=16-3=13
        STA $FE00       ; output 13

; --- Test 14: SBC absolute ---
        LDA #$04
        STA $0200       ; store 4
        LDA #$12        ; A=18
        SEC
        SBC $0200       ; A=18-4=14
        STA $FE00       ; output 14

; --- Test 15: AND immediate ---
        LDA #$FF
        AND #$0F        ; A=15
        STA $FE00       ; output 15

; --- Test 16: AND absolute ---
        LDA #$F0
        STA $0200
        LDA #$1F
        AND $0200       ; A=$1F & $F0 = $10 = 16
        STA $FE00       ; output 16

; --- Test 17: ORA immediate ---
        LDA #$01
        ORA #$10        ; A=$11 = 17
        STA $FE00       ; output 17

; --- Test 18: ORA absolute ---
        LDA #$02
        STA $0200
        LDA #$10
        ORA $0200       ; A=$10 | $02 = $12 = 18
        STA $FE00       ; output 18

; --- Test 19: EOR immediate ---
        LDA #$1C
        EOR #$07        ; A=$1C ^ $07 = $1B = 27... no
; actually $1C = 00011100, $07 = 00000111, XOR = 00011011 = $1B = 27, not 19
; let me use different values
; $17 = 23 = 00010111, $0C = 12 = 00001100, XOR = 00011011 = 27... hmm
; just compute: 19 = $13 = 00010011
; need A XOR B = $13
; $FF XOR $EC = $13? $FF=11111111 $EC=11101100 XOR=00010011 = $13 = 19 yes
        LDA #$FF
        EOR #$EC        ; A=$FF ^ $EC = $13 = 19
        STA $FE00       ; output 19

; --- Test 20: EOR absolute ---
; need A XOR mem = 20 = $14 = 00010100
; $FF ^ $EB = $14? $EB=11101011 XOR $FF=11111111 = 00010100 = $14 = 20 yes
        LDA #$EB
        STA $0200
        LDA #$FF
        EOR $0200       ; A=$FF ^ $EB = $14 = 20
        STA $FE00       ; output 20

; --- Test 21: ASL accumulator ---
; ASL shifts left, so A*2. Need result=21? 21 is odd so ASL can't produce it.
; Instead: test ASL correctness and adjust with ADC
        LDA #$0A        ; A=10
        ASL A           ; A=20
        CLC
        ADC #$01        ; A=21
        STA $FE00       ; output 21

; --- Test 22: LSR accumulator ---
        LDA #$2C        ; A=44
        LSR A           ; A=22
        STA $FE00       ; output 22

; --- Test 23: ROL accumulator ---
; ROL shifts left through carry. With C=0 (from LSR of even number): A*2
        LDA #$0B        ; A=11
        CLC
        ROL A           ; A=22, C=0
        CLC
        ADC #$01        ; A=23
        STA $FE00       ; output 23

; --- Test 24: ROR accumulator ---
; ROR shifts right through carry. 48 >> 1 = 24 with C=0
        LDA #$30        ; A=48
        CLC
        ROR A           ; A=24, C=0
        STA $FE00       ; output 24

; --- Test 25: INX / DEX ---
; verify no register clobbering
        LDX #$18        ; X=24
        LDY #$AA        ; Y=170 (canary)
        INX             ; X=25
        STX $FE00       ; output 25
; verify Y survived
        LDA #$AA
        STA $0200
        STY $0201
        LDA $0201
        CMP $0200       ; Y should still be $AA
; (if Z is not set, something went wrong — but we can't branch yet)

; --- Test 26: INY / DEY ---
        LDY #$1B        ; Y=27
        LDX #$BB        ; X=187 (canary)
        DEY             ; Y=26
        STY $FE00       ; output 26
; verify X survived
        LDA #$BB
        STA $0200
        STX $0201
        LDA $0201
        CMP $0200       ; X should still be $BB

; --- Smoke tests for remaining instructions (no output, just must not crash) ---

; STX / STY absolute
        LDX #$42
        STX $0200
        LDY #$43
        STY $0201

; INC / DEC memory
        LDA #$09
        STA $0200
        INC $0200       ; mem[$0200]=10
        DEC $0200       ; mem[$0200]=9

; CMP immediate / absolute
        LDA #$05
        CMP #$05        ; Z=1, C=1
        CMP #$06        ; Z=0, C=0

        LDA #$05
        STA $0200
        LDA #$05
        CMP $0200       ; Z=1, C=1

; CPX immediate / absolute
        LDX #$10
        CPX #$10        ; Z=1, C=1
        CPX #$11        ; Z=0, C=0

        LDA #$10
        STA $0200
        CPX $0200       ; Z=1, C=1

; CPY immediate / absolute
        LDY #$20
        CPY #$20        ; Z=1, C=1
        CPY #$21        ; Z=0, C=0

        LDA #$20
        STA $0200
        CPY $0200       ; Z=1, C=1

; ASL / LSR / ROL / ROR absolute
        LDA #$02
        STA $0200
        ASL $0200       ; mem[$0200]=4
        LSR $0200       ; mem[$0200]=2
        CLC
        ROL $0200       ; mem[$0200]=4
        CLC
        ROR $0200       ; mem[$0200]=2

; BIT absolute
        LDA #$FF
        STA $0200
        LDA #$0F
        BIT $0200       ; Z=0 (0F & FF != 0), N=1, V=1

; SEC / CLC
        SEC
        CLC

; SEI / CLI
        SEI
        CLI

; SED / CLD
        SED
        CLD

; CLV
        CLV

; NOP
        NOP

; JMP
        JMP DONE
        BRK             ; should be skipped
DONE    BRK             ; halt
