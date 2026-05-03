#ifndef _SIMPLECPU_H
#define _SIMPLECPU_H

/* --- Character I/O --- */
#define IO_PRINTNUM  (*(unsigned char*)0xFE00)
#define IO_PUTCHAR   (*(unsigned char*)0xFE01)
#define IO_STATUS    (*(unsigned char*)0xFE02)
#define IO_DATA      (*(unsigned char*)0xFE03)

/* --- Graphics --- */
#define MODE_REG     (*(unsigned char*)0xFE04)
#define VSYNC        (*(unsigned char*)0xFE05)

#define FRAMEBUFFER  ((unsigned char*)0x8000)

/* Mode 1: 64x48, 16 colors, 4bpp (1536 bytes) */
#define MODE1_W  64
#define MODE1_H  48

/* Mode 2: 256x192, 1bpp (6144 bytes) */
#define MODE2_W  256
#define MODE2_H  192

/* Mode 3: 128x96, 16 colors, 4bpp (6144 bytes) */
#define MODE3_W  128
#define MODE3_H  96

/* Mode 4: 128x128, 256 colors, 8bpp (16384 bytes) */
#define MODE4_W  128
#define MODE4_H  128

/* --- Sound --- */
#define CH1_FREQ_LO  (*(unsigned char*)0xFE06)
#define CH1_FREQ_HI  (*(unsigned char*)0xFE07)
#define CH1_WAVEFORM (*(unsigned char*)0xFE08)
#define CH1_VOLUME   (*(unsigned char*)0xFE09)

#define CH2_FREQ_LO  (*(unsigned char*)0xFE0A)
#define CH2_FREQ_HI  (*(unsigned char*)0xFE0B)
#define CH2_WAVEFORM (*(unsigned char*)0xFE0C)
#define CH2_VOLUME   (*(unsigned char*)0xFE0D)

#define CH3_FREQ_LO  (*(unsigned char*)0xFE0E)
#define CH3_FREQ_HI  (*(unsigned char*)0xFE0F)
#define CH3_WAVEFORM (*(unsigned char*)0xFE10)
#define CH3_VOLUME   (*(unsigned char*)0xFE11)

#define NOISE_RATE   (*(unsigned char*)0xFE12)
#define NOISE_VOLUME (*(unsigned char*)0xFE13)

/* Waveform constants */
#define WAVE_SINE     0
#define WAVE_SQUARE   1
#define WAVE_SAWTOOTH 2
#define WAVE_TRIANGLE 3

/* --- Mouse --- */
#define MOUSE_X      (*(unsigned char*)0xFE14)
#define MOUSE_Y      (*(unsigned char*)0xFE15)
#define MOUSE_BTN    (*(unsigned char*)0xFE16)

/* --- Hardware sprites (8 sprites, 8x8, 1bpp) --- */
#define SPR_PATTERNS ((unsigned char*)0x7E00)

#define SPR0_X       (*(unsigned char*)0xFE20)
#define SPR0_Y       (*(unsigned char*)0xFE21)
#define SPR0_PAT     (*(unsigned char*)0xFE22)
#define SPR0_COL     (*(unsigned char*)0xFE23)

#define SPR1_X       (*(unsigned char*)0xFE24)
#define SPR1_Y       (*(unsigned char*)0xFE25)
#define SPR1_PAT     (*(unsigned char*)0xFE26)
#define SPR1_COL     (*(unsigned char*)0xFE27)

#define SPR2_X       (*(unsigned char*)0xFE28)
#define SPR2_Y       (*(unsigned char*)0xFE29)
#define SPR2_PAT     (*(unsigned char*)0xFE2A)
#define SPR2_COL     (*(unsigned char*)0xFE2B)

#define SPR3_X       (*(unsigned char*)0xFE2C)
#define SPR3_Y       (*(unsigned char*)0xFE2D)
#define SPR3_PAT     (*(unsigned char*)0xFE2E)
#define SPR3_COL     (*(unsigned char*)0xFE2F)

#define SPR4_X       (*(unsigned char*)0xFE30)
#define SPR4_Y       (*(unsigned char*)0xFE31)
#define SPR4_PAT     (*(unsigned char*)0xFE32)
#define SPR4_COL     (*(unsigned char*)0xFE33)

#define SPR5_X       (*(unsigned char*)0xFE34)
#define SPR5_Y       (*(unsigned char*)0xFE35)
#define SPR5_PAT     (*(unsigned char*)0xFE36)
#define SPR5_COL     (*(unsigned char*)0xFE37)

#define SPR6_X       (*(unsigned char*)0xFE38)
#define SPR6_Y       (*(unsigned char*)0xFE39)
#define SPR6_PAT     (*(unsigned char*)0xFE3A)
#define SPR6_COL     (*(unsigned char*)0xFE3B)

#define SPR7_X       (*(unsigned char*)0xFE3C)
#define SPR7_Y       (*(unsigned char*)0xFE3D)
#define SPR7_PAT     (*(unsigned char*)0xFE3E)
#define SPR7_COL     (*(unsigned char*)0xFE3F)

/* --- Helper functions --- */

/* Wait for vsync */
static void waitvsync(void) {
    VSYNC = 1;
    while (VSYNC) {}
}

/* Read a key (blocking) */
static unsigned char getkey(void) {
    while (!(IO_STATUS & 0x80)) {}
    return IO_DATA & 0x7F;
}

/* Read a key (non-blocking, returns 0 if none) */
static unsigned char pollkey(void) {
    if (IO_STATUS & 0x80) return IO_DATA & 0x7F;
    return 0;
}

/* Print a character */
static void putch(unsigned char c) {
    IO_PUTCHAR = c;
}

/* Print a string */
static void puts_scpu(const char *s) {
    while (*s) {
        IO_PUTCHAR = *s++;
    }
}

/* Print a decimal number */
static void printnum(unsigned char n) {
    IO_PRINTNUM = n;
}

/* Set a pixel in Mode 3 (128x96, 4bpp) */
static void plot3(unsigned char x, unsigned char y, unsigned char color) {
    unsigned int offset = (unsigned int)y * 64 + (x >> 1);
    unsigned char *p = FRAMEBUFFER + offset;
    if (x & 1) {
        *p = (*p & 0xF0) | (color & 0x0F);
    } else {
        *p = (*p & 0x0F) | ((color & 0x0F) << 4);
    }
}

/* Set a pixel in Mode 4 (128x128, 8bpp) */
static void plot4(unsigned char x, unsigned char y, unsigned char color) {
    FRAMEBUFFER[(unsigned int)y * 128 + x] = color;
}

#endif
