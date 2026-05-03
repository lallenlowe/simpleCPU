/*
 * snake.c — Snake for simpleCPU
 *
 * Mode 3: 128x96, 16 colors, 4bpp
 * Grid:   32x24 tiles (4x4 pixels each)
 * Border: row 0, row 23, col 0, col 31
 * Controls: WASD
 *
 * Build:
 *   make -f ../../target/cc65/Makefile snake.bin
 * Run:
 *   node dist/index.js programs/games/snake.bin --org 0400
 */

#include "simplecpu.h"

/* ------------------------------------------------------------------ */
/* Config */
/* ------------------------------------------------------------------ */

#define TW        4          /* tile width  (pixels) */
#define TH        4          /* tile height (pixels) */
#define COLS      32         /* grid columns */
#define ROWS      24         /* grid rows   */
#define MAX_SEG   128        /* max snake length (must be power of 2) */
#define SEG_MASK  (MAX_SEG-1)
#define SPEED     3          /* vsync frames per move  (~10 moves/sec @ 30fps) */

/* ------------------------------------------------------------------ */
/* Colors (Mode 3 palette indices 0-15) */
/* ------------------------------------------------------------------ */

#define C_BG      0          /* black        */
#define C_WALL    7          /* light gray   */
#define C_HEAD    10         /* bright green */
#define C_BODY    2          /* dark green   */
#define C_FOOD    12         /* yellow       */

/* ------------------------------------------------------------------ */
/* State */
/* ------------------------------------------------------------------ */

static unsigned char sx[MAX_SEG];   /* snake x (grid coords) */
static unsigned char sy[MAX_SEG];   /* snake y (grid coords) */
static unsigned char shead;         /* index of head in circular buffer */
static unsigned char stail;         /* index of tail in circular buffer */

static signed char   ndx, ndy;      /* pending direction */

static unsigned char food_x, food_y;
static unsigned char score;
static unsigned char fctr;          /* frame counter */

static unsigned int  rng;

/* ------------------------------------------------------------------ */
/* Utilities */
/* ------------------------------------------------------------------ */

static unsigned char rand8(void) {
    /* xorshift16 */
    rng ^= (rng << 7);
    rng ^= (rng >> 9);
    rng ^= (rng << 8);
    return (unsigned char)rng;
}

/* Draw a 4x4 tile at grid position (tx, ty) */
static void draw_tile(unsigned char tx, unsigned char ty, unsigned char col) {
    unsigned char px = tx * TW;
    unsigned char py = ty * TH;
    unsigned char x, y;
    for (y = 0; y < TH; ++y)
        for (x = 0; x < TW; ++x)
            plot3(px + x, py + y, col);
}

/* Clear the whole framebuffer to color 0 */
static void clear_fb(void) {
    unsigned int i;
    for (i = 0; i < 6144; ++i)
        FRAMEBUFFER[i] = 0;
}

/* Draw the border walls */
static void draw_border(void) {
    unsigned char i;
    for (i = 0; i < COLS; ++i) {
        draw_tile(i, 0,        C_WALL);
        draw_tile(i, ROWS - 1, C_WALL);
    }
    for (i = 1; i < ROWS - 1; ++i) {
        draw_tile(0,        i, C_WALL);
        draw_tile(COLS - 1, i, C_WALL);
    }
}

/* Return 1 if (x,y) is occupied by any snake segment */
static unsigned char on_snake(unsigned char x, unsigned char y) {
    unsigned char i = stail;
    while (i != shead) {
        if (sx[i] == x && sy[i] == y) return 1;
        i = (i + 1) & SEG_MASK;
    }
    return (sx[shead] == x && sy[shead] == y);
}

/* Place food at a random empty cell */
static void place_food(void) {
    unsigned char x, y;
    do {
        x = (rand8() % (COLS - 2)) + 1;
        y = (rand8() % (ROWS - 2)) + 1;
    } while (on_snake(x, y));
    food_x = x;
    food_y = y;
    draw_tile(food_x, food_y, C_FOOD);
}

/* Wait N frames */
static void pause_frames(unsigned char n) {
    while (n--) waitvsync();
}

/* ------------------------------------------------------------------ */
/* Game init */
/* ------------------------------------------------------------------ */

static void init_game(void) {
    clear_fb();
    draw_border();

    /* Start with 3 segments moving right from grid centre */
    stail  = 0;
    shead  = 2;
    sx[0] = 14; sy[0] = 12;
    sx[1] = 15; sy[1] = 12;
    sx[2] = 16; sy[2] = 12;

    draw_tile(sx[0], sy[0], C_BODY);
    draw_tile(sx[1], sy[1], C_BODY);
    draw_tile(sx[2], sy[2], C_HEAD);

    ndx = 1; ndy = 0;
    score = 0;
    fctr  = 0;

    place_food();
}

/* ------------------------------------------------------------------ */
/* Main loop */
/* ------------------------------------------------------------------ */

void main(void) {
    unsigned char k;
    unsigned char nx, ny;
    unsigned char new_head;

    MODE_REG = 3;
    rng = 0xACE1;

    puts_scpu("\r\nSNAKE  --  WASD to move\r\n");

    init_game();

    while (1) {
        waitvsync();

        /* ---- Input ------------------------------------------------ */
        k = pollkey();
        if (k) {
            if (k == 'w' && ndy == 0) { ndx =  0; ndy = -1; }
            if (k == 's' && ndy == 0) { ndx =  0; ndy =  1; }
            if (k == 'a' && ndx == 0) { ndx = -1; ndy =  0; }
            if (k == 'd' && ndx == 0) { ndx =  1; ndy =  0; }
        }

        /* ---- Throttle movement ------------------------------------ */
        if (++fctr < SPEED) continue;
        fctr = 0;

        /* ---- Compute next head position --------------------------- */
        nx = (unsigned char)(sx[shead] + ndx);
        ny = (unsigned char)(sy[shead] + ndy);

        /* ---- Wall collision --------------------------------------- */
        if (nx == 0 || nx >= COLS - 1 || ny == 0 || ny >= ROWS - 1) {
            puts_scpu("\r\nGAME OVER  Score: ");
            printnum(score);
            puts_scpu("\r\n");
            pause_frames(90);   /* ~3 seconds */
            init_game();
            continue;
        }

        /* ---- Self collision --------------------------------------- */
        if (on_snake(nx, ny)) {
            puts_scpu("\r\nGAME OVER  Score: ");
            printnum(score);
            puts_scpu("\r\n");
            pause_frames(90);
            init_game();
            continue;
        }

        /* ---- Eat food -------------------------------------------- */
        if (nx == food_x && ny == food_y) {
            score++;

            /* Grow: don't remove tail; colour old head as body */
            draw_tile(sx[shead], sy[shead], C_BODY);
            new_head = (shead + 1) & SEG_MASK;
            sx[new_head] = nx;
            sy[new_head] = ny;
            shead = new_head;
            draw_tile(nx, ny, C_HEAD);

            /* Short beep */
            CH1_FREQ_LO  = 200;
            CH1_FREQ_HI  = 0;
            CH1_WAVEFORM = WAVE_SQUARE;
            CH1_VOLUME   = 12;

            place_food();

        } else {
            /* ---- Normal move: erase tail, advance head ----------- */
            draw_tile(sx[stail], sy[stail], C_BG);
            stail = (stail + 1) & SEG_MASK;

            draw_tile(sx[shead], sy[shead], C_BODY);
            new_head = (shead + 1) & SEG_MASK;
            sx[new_head] = nx;
            sy[new_head] = ny;
            shead = new_head;
            draw_tile(nx, ny, C_HEAD);

            CH1_VOLUME = 0;   /* silence */
        }
    }
}
