CC = cc65
AS = ca65
LD = ld65
TARGET_DIR = $(dir $(lastword $(MAKEFILE_LIST)))
CFG = $(TARGET_DIR)simplecpu.cfg
CRT0 = $(TARGET_DIR)crt0.s
CFLAGS = -t none -O
ASFLAGS = --feature loose_string_term --feature labels_without_colons

%.bin: %.c $(CRT0)
	$(CC) $(CFLAGS) -I $(TARGET_DIR) -o $*.s $<
	$(AS) $(ASFLAGS) -o $*.o $*.s
	$(AS) $(ASFLAGS) -o crt0.o $(CRT0)
	$(LD) -C $(CFG) -o $@ crt0.o $*.o $(TARGET_DIR)simplecpu.lib
	@rm -f $*.s $*.o crt0.o

clean:
	rm -f *.o *.s
