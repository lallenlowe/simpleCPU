; echo.s — reads keyboard input and echoes it back
; Ctrl+D (EOT, $04) to quit
; Memory map:
;   $FE01 = ASCII character output
;   $FE02 = input status (1 = data ready)
;   $FE03 = input data (reading clears status)

poll:
  LDA $FE02       ; check if input ready
  BEQ poll        ; loop until data available
  LDA $FE03       ; read the byte
  CMP #$04        ; is it Ctrl+D (EOT)?
  BEQ done        ; if so, quit
  STA $FE01       ; echo character to output
  JMP poll        ; go back for more
done:
  BRK             ; halt
