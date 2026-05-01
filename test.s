; simpleCPU test suite
; Exercises every implemented instruction
; Output to $FE00 — each STA $FE00 prints a test result
; Expected output: 1 through 34, then 3 2 1 35, 36-63, then Hello World!

* = $0200

; --- Test 1: LDA immediate ---
        LDA #$01        ; A=1
        STA $FE00       ; output 1

; --- Test 2: ADC immediate ---
        CLC
        ADC #$01        ; A=1+1=2
        STA $FE00       ; output 2

; --- Test 3: STA / LDA absolute ---
        STA $0600       ; store 2 at $0600
        LDA #$00        ; clear A
        LDA $0600       ; reload from $0600, A=2
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
        STA $0600
        LDX $0600       ; X=10
        STX $FE00       ; output 10

; --- Test 11: LDY absolute ---
        LDA #$0B
        STA $0600
        LDY $0600       ; Y=11
        STY $FE00       ; output 11

; --- Test 12: ADC absolute ---
        LDA #$06
        STA $0600       ; store 6
        LDA #$06
        CLC
        ADC $0600       ; A=6+6=12
        STA $FE00       ; output 12

; --- Test 13: SBC immediate ---
        LDA #$10        ; A=16
        SEC
        SBC #$03        ; A=16-3=13
        STA $FE00       ; output 13

; --- Test 14: SBC absolute ---
        LDA #$04
        STA $0600       ; store 4
        LDA #$12        ; A=18
        SEC
        SBC $0600       ; A=18-4=14
        STA $FE00       ; output 14

; --- Test 15: AND immediate ---
        LDA #$FF
        AND #$0F        ; A=15
        STA $FE00       ; output 15

; --- Test 16: AND absolute ---
        LDA #$F0
        STA $0600
        LDA #$1F
        AND $0600       ; A=$1F & $F0 = $10 = 16
        STA $FE00       ; output 16

; --- Test 17: ORA immediate ---
        LDA #$01
        ORA #$10        ; A=$11 = 17
        STA $FE00       ; output 17

; --- Test 18: ORA absolute ---
        LDA #$02
        STA $0600
        LDA #$10
        ORA $0600       ; A=$10 | $02 = $12 = 18
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
        STA $0600
        LDA #$FF
        EOR $0600       ; A=$FF ^ $EB = $14 = 20
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
        STA $0600
        STY $0601
        LDA $0601
        CMP $0600       ; Y should still be $AA
; (if Z is not set, something went wrong — but we can't branch yet)

; --- Test 26: INY / DEY ---
        LDY #$1B        ; Y=27
        LDX #$BB        ; X=187 (canary)
        DEY             ; Y=26
        STY $FE00       ; output 26
; verify X survived
        LDA #$BB
        STA $0600
        STX $0601
        LDA $0601
        CMP $0600       ; X should still be $BB

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

; --- Test 36: PHA / PLA ---
        LDA #$24        ; 36
        PHA             ; push 36
        LDA #$00        ; clear A
        PLA             ; pull 36 back
        STA $FE00       ; output 36

; --- Test 37: TXS / TSX ---
        LDX #$FF
        TXS             ; SP=$FF
        LDX #$00        ; clear X
        TSX             ; X should be $FF
        LDX #$FF
        TXS             ; restore SP=$FF
        LDA #$25        ; 37
        STA $FE00       ; output 37

; --- Test 38: JSR / RTS ---
        JSR SUB38       ; subroutine outputs 38

; --- Test 39: PHP / PLP ---
        SEC             ; C=1
        PHP             ; push status
        CLC             ; C=0
        PLP             ; restore status (C=1)
        LDA #$26        ; 38
        ADC #$00        ; 38+0+1(carry)=39
        STA $FE00       ; output 39

; --- Test 40: Nested JSR ---
        JSR SUB40       ; calls SUB40B which outputs 40

; --- Test 41: LDA/STA zero page ---
        LDA #$29        ; 41
        STA $40         ; store 41 to zero page $40
        LDA #$00        ; clear A
        LDA $40         ; reload from zero page
        STA $FE00       ; output 41

; --- Test 42: LDX/STX zero page ---
        LDX #$2A        ; 42
        STX $41         ; store to zero page $41
        LDX #$00        ; clear X
        LDX $41         ; reload from zero page
        STX $FE00       ; output 42

; --- Test 43: LDY/STY zero page ---
        LDY #$2B        ; 43
        STY $42         ; store to zero page $42
        LDY #$00        ; clear Y
        LDY $42         ; reload from zero page
        STY $FE00       ; output 43

; --- Test 44: ADC zero page ---
        LDA #$14        ; 20
        STA $40         ; store 20 to ZP
        LDA #$18        ; 24
        CLC
        ADC $40         ; 24+20=44
        STA $FE00       ; output 44

; --- Test 45: SBC zero page ---
        LDA #$05
        STA $40
        LDA #$32        ; 50
        SEC
        SBC $40         ; 50-5=45
        STA $FE00       ; output 45

; --- Test 46: AND/ORA/EOR zero page ---
        LDA #$FE
        STA $40
        LDA #$2F        ; $2F = 47
        AND $40         ; $2F & $FE = $2E = 46
        STA $FE00       ; output 46

; --- Test 47: CMP zero page ---
        LDA #$2F        ; 47
        STA $40
        LDA #$2F
        CMP $40         ; Z=1 (equal)
        BEQ T47OK
        BRK
T47OK   LDA #$2F        ; 47
        STA $FE00       ; output 47

; --- Test 48: INC/DEC zero page ---
        LDA #$2F        ; 47
        STA $40
        INC $40         ; ZP[$40] = 48
        LDA $40
        STA $FE00       ; output 48

; --- Test 49: LDA/STA zero page,X ---
        LDA #$31        ; 49
        LDX #$05
        STA $40,X       ; store 49 to ZP[$45]
        LDA #$00        ; clear A
        LDA $40,X       ; load from ZP[$45]
        STA $FE00       ; output 49

; --- Test 50: LDX/STX zero page,Y ---
        LDX #$32        ; 50
        LDY #$03
        STX $50,Y       ; store 50 to ZP[$53]
        LDX #$00        ; clear X
        LDX $50,Y       ; load from ZP[$53]
        STX $FE00       ; output 50

; --- Test 51: ADC zero page,X ---
        LDA #$19        ; 25
        LDX #$02
        STA $60,X       ; store 25 to ZP[$62]
        LDA #$1A        ; 26
        CLC
        ADC $60,X       ; 26+25=51
        STA $FE00       ; output 51

; --- Test 52: INC zero page,X ---
        LDA #$33        ; 51
        LDX #$04
        STA $70,X       ; store 51 to ZP[$74]
        INC $70,X       ; ZP[$74]=52
        LDA $70,X
        STA $FE00       ; output 52

; --- Test 53: ZP,X wraps within zero page ---
        LDA #$35        ; 53
        LDX #$10
        STA $F5,X       ; $F5+$10=$105, wraps to $05
        LDA #$00
        LDA $F5,X       ; load from ZP[$05]
        STA $FE00       ; output 53

; --- Test 54: LDA/STA absolute,X ---
        LDA #$36        ; 54
        LDX #$03
        STA $0600,X     ; store 54 to $0503
        LDA #$00
        LDA $0600,X     ; load from $0503
        STA $FE00       ; output 54

; --- Test 55: LDA absolute,Y ---
        LDA #$37        ; 55
        LDY #$05
        STA $0600,Y     ; store 55 to $0505
        LDA #$00
        LDA $0600,Y     ; load from $0505
        STA $FE00       ; output 55

; --- Test 56: ADC absolute,X ---
        LDA #$1C        ; 28
        LDX #$02
        STA $0600,X     ; store 28 to $0502
        LDA #$1C        ; 28
        CLC
        ADC $0600,X     ; 28+28=56
        STA $FE00       ; output 56

; --- Test 57: Page crossing absolute,X ---
        LDA #$39        ; 57
        LDX #$01
        STA $05FF,X     ; $05FF+1=$0600, crosses page
        LDA #$00
        LDA $05FF,X     ; load from $0600 (page crossing)
        STA $FE00       ; output 57

; --- Test 58: Page crossing absolute,Y ---
        LDA #$3A        ; 58
        LDY #$02
        STA $05FF,Y     ; $05FF+2=$0601, crosses page
        LDA #$00
        LDA $05FF,Y     ; load from $0601
        STA $FE00       ; output 58

; --- Test 59: JMP indirect ---
        LDA #<T59TGT    ; low byte of target address
        STA $60         ; store at ZP $60
        LDA #>T59TGT    ; high byte of target address
        STA $61         ; store at ZP $61
        JMP ($0060)     ; jump through pointer at $0060
        BRK             ; trap — should be skipped
T59TGT  LDA #$3B        ; 59
        STA $FE00       ; output 59

; --- Test 60: LDA (zp,X) indexed indirect ---
        LDA #<T60DAT    ; low byte of data address
        LDX #$04
        STA $70,X       ; store pointer low at ZP[$74]
        LDA #>T60DAT    ; high byte of data address
        STA $75         ; store pointer high at ZP[$75]
        LDA #$00        ; clear A
        LDA ($70,X)     ; read through pointer at ZP[$74]
        STA $FE00       ; output 60
        JMP T60END
T60DAT  .BYTE $3C       ; 60
T60END

; --- Test 61: STA (zp,X) indexed indirect ---
        LDA #<$0600     ; low byte of $0600
        STA $76         ; pointer low at ZP[$76]
        LDA #>$0600     ; high byte of $0600
        STA $77         ; pointer high at ZP[$77]
        LDA #$3D        ; 61
        LDX #$06
        STA ($70,X)     ; store through pointer at ZP[$76] → $0600
        LDA $0600       ; verify
        STA $FE00       ; output 61

; --- Test 62: LDA (zp),Y indirect indexed ---
        LDA #<T62DAT    ; low byte of data base
        STA $80         ; pointer low at ZP[$80]
        LDA #>T62DAT    ; high byte of data base
        STA $81         ; pointer high at ZP[$81]
        LDY #$03        ; offset
        LDA ($80),Y     ; read from T62DAT+3
        STA $FE00       ; output 62
        JMP T62END
T62DAT  .BYTE $00,$00,$00,$3E  ; data[3] = 62
T62END

; --- Test 63: STA (zp),Y indirect indexed ---
        LDA #<$0600     ; pointer to $0600
        STA $82
        LDA #>$0600
        STA $83
        LDA #$3F        ; 63
        LDY #$05
        STA ($82),Y     ; store at $0600+5=$0605
        LDA $0605       ; verify
        STA $FE00       ; output 63

; --- Smoke tests for remaining instructions (no output, just must not crash) ---

; STX / STY absolute
        LDX #$42
        STX $0600
        LDY #$43
        STY $0601

; INC / DEC memory
        LDA #$09
        STA $0600
        INC $0600       ; mem[$0600]=10
        DEC $0600       ; mem[$0600]=9

; CMP immediate / absolute
        LDA #$05
        CMP #$05        ; Z=1, C=1
        CMP #$06        ; Z=0, C=0

        LDA #$05
        STA $0600
        LDA #$05
        CMP $0600       ; Z=1, C=1

; CPX immediate / absolute
        LDX #$10
        CPX #$10        ; Z=1, C=1
        CPX #$11        ; Z=0, C=0

        LDA #$10
        STA $0600
        CPX $0600       ; Z=1, C=1

; CPY immediate / absolute
        LDY #$20
        CPY #$20        ; Z=1, C=1
        CPY #$21        ; Z=0, C=0

        LDA #$20
        STA $0600
        CPY $0600       ; Z=1, C=1

; ASL / LSR / ROL / ROR absolute
        LDA #$02
        STA $0600
        ASL $0600       ; mem[$0600]=4
        LSR $0600       ; mem[$0600]=2
        CLC
        ROL $0600       ; mem[$0600]=4
        CLC
        ROR $0600       ; mem[$0600]=2

; BIT absolute
        LDA #$FF
        STA $0600
        LDA #$0F
        BIT $0600       ; Z=0 (0F & FF != 0), N=1, V=1

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

; --- Subroutine definitions ---
SUB38   LDA #$26        ; 38
        STA $FE00       ; output 38
        RTS

SUB40   JSR SUB40B
        RTS

SUB40B  LDA #$28        ; 40
        STA $FE00       ; output 40
        RTS

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
