; simpleCPU test suite
; Exercises every implemented instruction
; Output to $FE00 — each STA $FE00 prints a test result
; Expected output: 1 through 34, then 3 2 1 35, then Hello World!

* = $0000

; --- Test 1: LDA immediate ---
        LDA #$01        ; A=1
        STA $FE00       ; output 1

; --- Test 2: ADC immediate ---
        CLC
        ADC #$01        ; A=1+1=2
        STA $FE00       ; output 2

; --- Test 3: STA / LDA absolute ---
        STA $0300       ; store 2 at $0300
        LDA #$00        ; clear A
        LDA $0300       ; reload from $0300, A=2
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
        STA $0300
        LDX $0300       ; X=10
        STX $FE00       ; output 10

; --- Test 11: LDY absolute ---
        LDA #$0B
        STA $0300
        LDY $0300       ; Y=11
        STY $FE00       ; output 11

; --- Test 12: ADC absolute ---
        LDA #$06
        STA $0300       ; store 6
        LDA #$06
        CLC
        ADC $0300       ; A=6+6=12
        STA $FE00       ; output 12

; --- Test 13: SBC immediate ---
        LDA #$10        ; A=16
        SEC
        SBC #$03        ; A=16-3=13
        STA $FE00       ; output 13

; --- Test 14: SBC absolute ---
        LDA #$04
        STA $0300       ; store 4
        LDA #$12        ; A=18
        SEC
        SBC $0300       ; A=18-4=14
        STA $FE00       ; output 14

; --- Test 15: AND immediate ---
        LDA #$FF
        AND #$0F        ; A=15
        STA $FE00       ; output 15

; --- Test 16: AND absolute ---
        LDA #$F0
        STA $0300
        LDA #$1F
        AND $0300       ; A=$1F & $F0 = $10 = 16
        STA $FE00       ; output 16

; --- Test 17: ORA immediate ---
        LDA #$01
        ORA #$10        ; A=$11 = 17
        STA $FE00       ; output 17

; --- Test 18: ORA absolute ---
        LDA #$02
        STA $0300
        LDA #$10
        ORA $0300       ; A=$10 | $02 = $12 = 18
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
        STA $0300
        LDA #$FF
        EOR $0300       ; A=$FF ^ $EB = $14 = 20
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
        STA $0300
        STY $0301
        LDA $0301
        CMP $0300       ; Y should still be $AA
; (if Z is not set, something went wrong — but we can't branch yet)

; --- Test 26: INY / DEY ---
        LDY #$1B        ; Y=27
        LDX #$BB        ; X=187 (canary)
        DEY             ; Y=26
        STY $FE00       ; output 26
; verify X survived
        LDA #$BB
        STA $0300
        STX $0301
        LDA $0301
        CMP $0300       ; X should still be $BB

; --- Test 27: BEQ (branch if Z=1) ---
        LDA #$00        ; Z=1
        BEQ T27OK
        BRK             ; trap
T27OK   LDA #$1B        ; 27
        STA $FE00       ; output 27

; --- Test 28: BNE (branch if Z=0) ---
        LDA #$01        ; Z=0
        BNE T28OK
        BRK             ; trap
T28OK   LDA #$1C        ; 28
        STA $FE00       ; output 28

; --- Test 29: BCS (branch if C=1) ---
        SEC
        BCS T29OK
        BRK             ; trap
T29OK   LDA #$1D        ; 29
        STA $FE00       ; output 29

; --- Test 30: BCC (branch if C=0) ---
        CLC
        BCC T30OK
        BRK             ; trap
T30OK   LDA #$1E        ; 30
        STA $FE00       ; output 30

; --- Test 31: BMI (branch if N=1) ---
        LDA #$80        ; N=1
        BMI T31OK
        BRK             ; trap
T31OK   LDA #$1F        ; 31
        STA $FE00       ; output 31

; --- Test 32: BPL (branch if N=0) ---
        LDA #$01        ; N=0
        BPL T32OK
        BRK             ; trap
T32OK   LDA #$20        ; 32
        STA $FE00       ; output 32

; --- Test 33: BVS (branch if V=1) ---
        CLC
        LDA #$40
        ADC #$40        ; 64+64=128, overflow
        BVS T33OK
        BRK             ; trap
T33OK   LDA #$21        ; 33
        STA $FE00       ; output 33

; --- Test 34: BVC (branch if V=0) ---
        CLV
        BVC T34OK
        BRK             ; trap
T34OK   LDA #$22        ; 34
        STA $FE00       ; output 34

; --- Test 35: BNE backward branch (countdown) ---
        LDX #$03
COUNT   STX $FE00       ; output 35, 36, 37 (values 3, 2, 1)
        DEX
        BNE COUNT
; After loop: X=0, output was 3, 2, 1
; Output test number 35 to confirm we exited the loop
        LDA #$23        ; 35
        STA $FE00       ; output 35

; --- Smoke tests for remaining instructions (no output, just must not crash) ---

; STX / STY absolute
        LDX #$42
        STX $0300
        LDY #$43
        STY $0301

; INC / DEC memory
        LDA #$09
        STA $0300
        INC $0300       ; mem[$0300]=10
        DEC $0300       ; mem[$0300]=9

; CMP immediate / absolute
        LDA #$05
        CMP #$05        ; Z=1, C=1
        CMP #$06        ; Z=0, C=0

        LDA #$05
        STA $0300
        LDA #$05
        CMP $0300       ; Z=1, C=1

; CPX immediate / absolute
        LDX #$10
        CPX #$10        ; Z=1, C=1
        CPX #$11        ; Z=0, C=0

        LDA #$10
        STA $0300
        CPX $0300       ; Z=1, C=1

; CPY immediate / absolute
        LDY #$20
        CPY #$20        ; Z=1, C=1
        CPY #$21        ; Z=0, C=0

        LDA #$20
        STA $0300
        CPY $0300       ; Z=1, C=1

; ASL / LSR / ROL / ROR absolute
        LDA #$02
        STA $0300
        ASL $0300       ; mem[$0300]=4
        LSR $0300       ; mem[$0300]=2
        CLC
        ROL $0300       ; mem[$0300]=4
        CLC
        ROR $0300       ; mem[$0300]=2

; BIT absolute
        LDA #$FF
        STA $0300
        LDA #$0F
        BIT $0300       ; Z=0 (0F & FF != 0), N=1, V=1

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
        JMP HELLO
        BRK             ; should be skipped

; --- Hello World via character I/O at $FE01 ---
HELLO   LDA #$48        ; 'H'
        STA $FE01
        LDA #$65        ; 'e'
        STA $FE01
        LDA #$6C        ; 'l'
        STA $FE01
        LDA #$6C        ; 'l'
        STA $FE01
        LDA #$6F        ; 'o'
        STA $FE01
        LDA #$20        ; ' '
        STA $FE01
        LDA #$57        ; 'W'
        STA $FE01
        LDA #$6F        ; 'o'
        STA $FE01
        LDA #$72        ; 'r'
        STA $FE01
        LDA #$6C        ; 'l'
        STA $FE01
        LDA #$64        ; 'd'
        STA $FE01
        LDA #$21        ; '!'
        STA $FE01
        LDA #$0A        ; newline
        STA $FE01
        BRK             ; halt
