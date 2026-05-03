/*
 * depths.c — DEPTHS: A Roguelike for simpleCPU
 * Phase 2: pixel font, status panel, message log, stair descent
 *
 * Build:
 *   make -f ../../target/cc65/Makefile depths.bin
 * Run:
 *   node dist/index.js programs/games/depths.bin --org 0400
 */

#include "simplecpu.h"

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

#define MAP_W      64
#define MAP_H      32
#define VIEW_W     20        /* map viewport width  — narrowed to give status room */
#define VIEW_H     20
#define FOV_R       8
#define MAX_ROOMS  12

/* Status panel: pixel x=80 onward (12 chars × 4px = 48px → x=84..127) */
#define SEP_X      80        /* separator pixel x (2 dark pixels)       */
#define STAT_X     84        /* first status char pixel x                */
#define STAT_CHARS 11        /* chars per status line                    */
#define STAT_LINES 10        /* lines in status panel                    */

/* Message log: pixel rows 80-95, full 128px width */
#define MSG_Y0     80        /* pixel y of message line 0               */
#define MSG_Y1     88        /* pixel y of message line 1               */
#define MSG_CHARS  32        /* chars per message line                   */

/* ------------------------------------------------------------------ */
/* Tile encoding                                                        */
/* ------------------------------------------------------------------ */

#define T_WALL    0
#define T_FLOOR   1
#define T_DOOR_C  2
#define T_DOOR_O  3
#define T_STAIR_D 4
#define T_STAIR_U 5
#define T_WATER   6

#define F_EXPLORED 0x08
#define F_VISIBLE  0x10

#define TILE_TYPE(t)   ((t) & 0x07)
#define IS_EXPLORED(t) ((t) & F_EXPLORED)
#define IS_VISIBLE(t)  ((t) & F_VISIBLE)

#define MAP_IDX(x,y)  (((unsigned int)(y) << 6) | (unsigned char)(x))
#define MAP_AT(x,y)   map_data[MAP_IDX((x),(y))]

/* ------------------------------------------------------------------ */
/* Pixel patterns (4×4, bit3=left pixel)                               */
/* ------------------------------------------------------------------ */

static const unsigned char PAT_BLANK[]   = { 0x00, 0x00, 0x00, 0x00 };
static const unsigned char PAT_WALL[]    = { 0x0F, 0x0F, 0x0F, 0x0F };
static const unsigned char PAT_FLOOR[]   = { 0x00, 0x06, 0x06, 0x00 };
static const unsigned char PAT_DOOR[]    = { 0x06, 0x06, 0x06, 0x06 };
static const unsigned char PAT_STAIR_D[] = { 0x06, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_STAIR_U[] = { 0x02, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_WATER[]   = { 0x05, 0x0F, 0x05, 0x0F };
static const unsigned char PAT_PLAYER[]  = { 0x06, 0x0F, 0x06, 0x00 };

/* ------------------------------------------------------------------ */
/* Pixel font — 4×8, ASCII 32-90                                        */
/* ------------------------------------------------------------------ */
/* Each entry: 8 bytes, one per pixel row.                             */
/* Bit 3 = leftmost pixel, bit 0 = rightmost.                         */

#define FONT_FIRST 32
#define FONT_LAST  90

static const unsigned char font_data[59][8] = {
/* 32 ' ' */ {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00},
/* 33 '!' */ {0x04,0x04,0x04,0x04,0x04,0x00,0x04,0x00},
/* 34 '"' */ {0x0A,0x0A,0x00,0x00,0x00,0x00,0x00,0x00},
/* 35 '#' */ {0x0A,0x0F,0x0A,0x0F,0x0A,0x00,0x00,0x00},
/* 36 '$' */ {0x04,0x0F,0x08,0x07,0x01,0x0F,0x04,0x00},
/* 37 '%' */ {0x09,0x02,0x04,0x00,0x04,0x02,0x09,0x00},
/* 38 '&' */ {0x06,0x09,0x06,0x0A,0x09,0x09,0x06,0x00},
/* 39 '\''*/ {0x06,0x04,0x08,0x00,0x00,0x00,0x00,0x00},
/* 40 '(' */ {0x02,0x04,0x08,0x08,0x08,0x04,0x02,0x00},
/* 41 ')' */ {0x08,0x04,0x02,0x02,0x02,0x04,0x08,0x00},
/* 42 '*' */ {0x00,0x0A,0x04,0x0F,0x04,0x0A,0x00,0x00},
/* 43 '+' */ {0x00,0x04,0x04,0x0F,0x04,0x04,0x00,0x00},
/* 44 ',' */ {0x00,0x00,0x00,0x00,0x06,0x04,0x08,0x00},
/* 45 '-' */ {0x00,0x00,0x00,0x0F,0x00,0x00,0x00,0x00},
/* 46 '.' */ {0x00,0x00,0x00,0x00,0x00,0x06,0x06,0x00},
/* 47 '/' */ {0x01,0x01,0x02,0x02,0x04,0x04,0x08,0x00},
/* 48 '0' */ {0x06,0x09,0x09,0x09,0x09,0x09,0x06,0x00},
/* 49 '1' */ {0x04,0x0C,0x04,0x04,0x04,0x04,0x0E,0x00},
/* 50 '2' */ {0x06,0x09,0x01,0x02,0x04,0x08,0x0F,0x00},
/* 51 '3' */ {0x0E,0x01,0x01,0x06,0x01,0x01,0x0E,0x00},
/* 52 '4' */ {0x03,0x05,0x09,0x0F,0x01,0x01,0x01,0x00},
/* 53 '5' */ {0x0F,0x08,0x08,0x0E,0x01,0x01,0x0E,0x00},
/* 54 '6' */ {0x06,0x08,0x08,0x0E,0x09,0x09,0x06,0x00},
/* 55 '7' */ {0x0F,0x01,0x02,0x02,0x04,0x04,0x04,0x00},
/* 56 '8' */ {0x06,0x09,0x09,0x06,0x09,0x09,0x06,0x00},
/* 57 '9' */ {0x06,0x09,0x09,0x07,0x01,0x01,0x06,0x00},
/* 58 ':' */ {0x00,0x06,0x06,0x00,0x06,0x06,0x00,0x00},
/* 59 ';' */ {0x00,0x06,0x06,0x00,0x06,0x04,0x08,0x00},
/* 60 '<' */ {0x01,0x02,0x04,0x08,0x04,0x02,0x01,0x00},
/* 61 '=' */ {0x00,0x00,0x0F,0x00,0x0F,0x00,0x00,0x00},
/* 62 '>' */ {0x08,0x04,0x02,0x01,0x02,0x04,0x08,0x00},
/* 63 '?' */ {0x06,0x09,0x01,0x02,0x04,0x00,0x04,0x00},
/* 64 '@' */ {0x06,0x09,0x0B,0x0B,0x0A,0x09,0x06,0x00},
/* 65 'A' */ {0x06,0x09,0x09,0x0F,0x09,0x09,0x09,0x00},
/* 66 'B' */ {0x0E,0x09,0x09,0x0E,0x09,0x09,0x0E,0x00},
/* 67 'C' */ {0x07,0x08,0x08,0x08,0x08,0x08,0x07,0x00},
/* 68 'D' */ {0x0E,0x09,0x09,0x09,0x09,0x09,0x0E,0x00},
/* 69 'E' */ {0x0F,0x08,0x08,0x0E,0x08,0x08,0x0F,0x00},
/* 70 'F' */ {0x0F,0x08,0x08,0x0E,0x08,0x08,0x08,0x00},
/* 71 'G' */ {0x06,0x09,0x08,0x08,0x0B,0x09,0x06,0x00},
/* 72 'H' */ {0x09,0x09,0x09,0x0F,0x09,0x09,0x09,0x00},
/* 73 'I' */ {0x0E,0x04,0x04,0x04,0x04,0x04,0x0E,0x00},
/* 74 'J' */ {0x01,0x01,0x01,0x01,0x01,0x09,0x06,0x00},
/* 75 'K' */ {0x09,0x0A,0x0C,0x08,0x0C,0x0A,0x09,0x00},
/* 76 'L' */ {0x08,0x08,0x08,0x08,0x08,0x08,0x0F,0x00},
/* 77 'M' */ {0x09,0x0F,0x09,0x09,0x09,0x09,0x09,0x00},
/* 78 'N' */ {0x09,0x0D,0x0D,0x0B,0x0B,0x09,0x09,0x00},
/* 79 'O' */ {0x06,0x09,0x09,0x09,0x09,0x09,0x06,0x00},
/* 80 'P' */ {0x0E,0x09,0x09,0x0E,0x08,0x08,0x08,0x00},
/* 81 'Q' */ {0x06,0x09,0x09,0x09,0x09,0x0A,0x07,0x00},
/* 82 'R' */ {0x0E,0x09,0x09,0x0E,0x0C,0x0A,0x09,0x00},
/* 83 'S' */ {0x07,0x08,0x08,0x06,0x01,0x01,0x0E,0x00},
/* 84 'T' */ {0x0F,0x04,0x04,0x04,0x04,0x04,0x04,0x00},
/* 85 'U' */ {0x09,0x09,0x09,0x09,0x09,0x09,0x06,0x00},
/* 86 'V' */ {0x09,0x09,0x09,0x09,0x09,0x06,0x04,0x00},
/* 87 'W' */ {0x09,0x09,0x09,0x09,0x0B,0x0F,0x09,0x00},
/* 88 'X' */ {0x09,0x06,0x06,0x00,0x06,0x06,0x09,0x00},
/* 89 'Y' */ {0x09,0x09,0x06,0x04,0x04,0x04,0x04,0x00},
/* 90 'Z' */ {0x0F,0x01,0x02,0x06,0x04,0x08,0x0F,0x00},
};

/* ------------------------------------------------------------------ */
/* Game state                                                           */
/* ------------------------------------------------------------------ */

static unsigned char map_data[MAP_W * MAP_H];

static unsigned char px, py;
static unsigned char cam_x, cam_y;
static unsigned char depth;

static unsigned char num_rooms;
static unsigned char room_cx[MAX_ROOMS];
static unsigned char room_cy[MAX_ROOMS];
static unsigned char room_rx[MAX_ROOMS];
static unsigned char room_ry[MAX_ROOMS];
static unsigned char room_rw[MAX_ROOMS];
static unsigned char room_rh[MAX_ROOMS];

static unsigned int  rng;

/* ------------------------------------------------------------------ */
/* Player stats                                                         */
/* ------------------------------------------------------------------ */

static unsigned char player_hp;
static unsigned char player_maxhp;
static unsigned char player_str;
static unsigned char player_dex;
static unsigned char player_def;
static unsigned char player_level;
static unsigned int  player_xp;
static unsigned int  player_gold;

/* 4-char abbreviated names (5 bytes incl. NUL) */
static unsigned char player_wpn[5];
static unsigned char player_arm[5];

/* ------------------------------------------------------------------ */
/* Message log                                                          */
/* ------------------------------------------------------------------ */

static unsigned char msg[2][MSG_CHARS + 1];

/* ------------------------------------------------------------------ */
/* Format buffer (for building status strings)                          */
/* ------------------------------------------------------------------ */

static unsigned char fmt_buf[STAT_CHARS + 1];
static unsigned char fmt_len;

static void fmt_reset(void) { fmt_len = 0; fmt_buf[0] = 0; }

static void fmt_chr(unsigned char c) {
    if (fmt_len < STAT_CHARS) {
        fmt_buf[fmt_len++] = c;
        fmt_buf[fmt_len]   = 0;
    }
}

static void fmt_str(const unsigned char *s) {
    while (*s) fmt_chr(*s++);
}

static void fmt_u8(unsigned char n) {
    if (n >= 100) fmt_chr((unsigned char)('0' + n / 100));
    if (n >= 10)  fmt_chr((unsigned char)('0' + (n / 10) % 10));
    fmt_chr((unsigned char)('0' + n % 10));
}

static void fmt_u16(unsigned int n) {
    if (n >= 1000) fmt_chr((unsigned char)('0' + n / 1000));
    if (n >= 100)  fmt_chr((unsigned char)('0' + (n / 100) % 10));
    if (n >= 10)   fmt_chr((unsigned char)('0' + (n / 10)  % 10));
    fmt_chr((unsigned char)('0' + n % 10));
}

static void fmt_pad(unsigned char w) {
    while (fmt_len < w) fmt_chr(' ');
}

/* ------------------------------------------------------------------ */
/* RNG                                                                  */
/* ------------------------------------------------------------------ */

static unsigned char rand8(void) {
    rng ^= rng << 7;
    rng ^= rng >> 9;
    rng ^= rng << 8;
    return (unsigned char)rng;
}

/* ------------------------------------------------------------------ */
/* Drawing — tiles                                                       */
/* ------------------------------------------------------------------ */

static void draw_pattern(unsigned char bx, unsigned char by,
                          const unsigned char *pat,
                          unsigned char fg, unsigned char bg) {
    unsigned char row, p, c0, c1, c2, c3;
    unsigned char *fb = FRAMEBUFFER + (((unsigned int)by) << 6) + (bx >> 1);
    for (row = 0; row < 4; row++, fb += 64) {
        p  = pat[row];
        c0 = (p & 0x08) ? fg : bg;
        c1 = (p & 0x04) ? fg : bg;
        c2 = (p & 0x02) ? fg : bg;
        c3 = (p & 0x01) ? fg : bg;
        fb[0] = (c0 << 4) | c1;
        fb[1] = (c2 << 4) | c3;
    }
}

static void draw_map_tile(unsigned char sx, unsigned char sy,
                           unsigned char tile) {
    unsigned char t  = TILE_TYPE(tile);
    unsigned char bx = (unsigned char)(sx << 2);
    unsigned char by = (unsigned char)(sy << 2);
    if (!IS_EXPLORED(tile)) {
        draw_pattern(bx, by, PAT_BLANK, 0, 0);
        return;
    }
    if (!IS_VISIBLE(tile)) {
        draw_pattern(bx, by, (t == T_WALL) ? PAT_WALL : PAT_FLOOR, 8, 0);
        return;
    }
    switch (t) {
        case T_WALL:    draw_pattern(bx, by, PAT_WALL,     7,  0); break;
        case T_FLOOR:   draw_pattern(bx, by, PAT_FLOOR,    8,  0); break;
        case T_DOOR_C:  draw_pattern(bx, by, PAT_DOOR,     3,  0); break;
        case T_DOOR_O:  draw_pattern(bx, by, PAT_FLOOR,    3,  0); break;
        case T_STAIR_D: draw_pattern(bx, by, PAT_STAIR_D, 11,  0); break;
        case T_STAIR_U: draw_pattern(bx, by, PAT_STAIR_U, 15,  0); break;
        case T_WATER:   draw_pattern(bx, by, PAT_WATER,    4, 12); break;
        default:        draw_pattern(bx, by, PAT_BLANK,    0,  0); break;
    }
}

static void draw_viewport(void) {
    unsigned char vx, vy;
    for (vy = 0; vy < VIEW_H; vy++)
        for (vx = 0; vx < VIEW_W; vx++)
            draw_map_tile(vx, vy, MAP_AT(cam_x + vx, cam_y + vy));
}

static void draw_player(void) {
    unsigned char vx = px - cam_x;
    unsigned char vy = py - cam_y;
    if (vx < VIEW_W && vy < VIEW_H)
        draw_pattern((unsigned char)(vx << 2),
                     (unsigned char)(vy << 2),
                     PAT_PLAYER, 15, 0);
}

/* ------------------------------------------------------------------ */
/* Drawing — font                                                        */
/* ------------------------------------------------------------------ */

/* Draw one character at pixel (bx, by). bx must be multiple of 4.    */
static void draw_char(unsigned char bx, unsigned char by,
                       unsigned char c, unsigned char color) {
    const unsigned char *glyph;
    unsigned char row, p, c0, c1, c2, c3;
    unsigned char *fb;

    if (c < FONT_FIRST || c > FONT_LAST)
        glyph = font_data[0];           /* fallback: space */
    else
        glyph = font_data[c - FONT_FIRST];

    fb = FRAMEBUFFER + (((unsigned int)by) << 6) + (bx >> 1);
    for (row = 0; row < 8; row++, fb += 64) {
        p  = glyph[row];
        c0 = (p & 0x08) ? color : 0;
        c1 = (p & 0x04) ? color : 0;
        c2 = (p & 0x02) ? color : 0;
        c3 = (p & 0x01) ? color : 0;
        fb[0] = (c0 << 4) | c1;
        fb[1] = (c2 << 4) | c3;
    }
}

/* Draw a NUL-terminated string at pixel (bx, by). */
static void draw_str(unsigned char bx, unsigned char by,
                      const unsigned char *s, unsigned char color) {
    while (*s) {
        draw_char(bx, by, *s++, color);
        bx += 4;
    }
}

/* ------------------------------------------------------------------ */
/* Status panel                                                          */
/* ------------------------------------------------------------------ */

/* Draw one status panel line (0-9) using the current fmt_buf content. */
static void stat_draw_line(unsigned char line, unsigned char color) {
    unsigned char i;
    unsigned char bx = STAT_X;
    unsigned char by = (unsigned char)(line * 8);
    /* Pad fmt_buf to full width with spaces */
    fmt_pad(STAT_CHARS);
    for (i = 0; i < STAT_CHARS; i++, bx += 4)
        draw_char(bx, by, fmt_buf[i], color);
}

/* HP bar color: green → yellow → red as HP drops */
static unsigned char hp_color(void) {
    unsigned char pct = (unsigned char)((unsigned int)player_hp * 100 / player_maxhp);
    if (pct > 66) return 10;    /* green  */
    if (pct > 33) return 11;    /* yellow */
    return 9;                   /* red    */
}

static void draw_status_panel(void) {
    /* Line 0: HP */
    fmt_reset();
    fmt_str((const unsigned char *)"HP:");
    fmt_u8(player_hp); fmt_chr('/'); fmt_u8(player_maxhp);
    stat_draw_line(0, hp_color());

    /* Line 1: Level and Floor */
    fmt_reset();
    fmt_str((const unsigned char *)"LV:"); fmt_u8(player_level);
    fmt_str((const unsigned char *)" FL:"); fmt_u8(depth);
    stat_draw_line(1, 15);

    /* Line 2: XP */
    fmt_reset();
    fmt_str((const unsigned char *)"XP:"); fmt_u16(player_xp);
    stat_draw_line(2, 11);

    /* Line 3: STR and DEX */
    fmt_reset();
    fmt_str((const unsigned char *)"ST:"); fmt_u8(player_str);
    fmt_str((const unsigned char *)" DX:"); fmt_u8(player_dex);
    stat_draw_line(3, 15);

    /* Line 4: DEF */
    fmt_reset();
    fmt_str((const unsigned char *)"DEF:"); fmt_u8(player_def);
    stat_draw_line(4, 15);

    /* Line 5: Gold */
    fmt_reset();
    fmt_str((const unsigned char *)"GOLD:"); fmt_u16(player_gold);
    stat_draw_line(5, 11);

    /* Line 6: Weapon */
    fmt_reset();
    fmt_str((const unsigned char *)"WP:"); fmt_str(player_wpn);
    stat_draw_line(6, 14);

    /* Line 7: Armor */
    fmt_reset();
    fmt_str((const unsigned char *)"AR:"); fmt_str(player_arm);
    stat_draw_line(7, 7);

    /* Lines 8-9: blank */
    fmt_reset();
    stat_draw_line(8, 0);
    fmt_reset();
    stat_draw_line(9, 0);
}

/* ------------------------------------------------------------------ */
/* Message log                                                           */
/* ------------------------------------------------------------------ */

static void draw_messages(void) {
    unsigned char i;
    for (i = 0; i < MSG_CHARS; i++) {
        draw_char((unsigned char)(i << 2), MSG_Y0, msg[0][i], 15);
        draw_char((unsigned char)(i << 2), MSG_Y1, msg[1][i],  8);
    }
}

static void add_message(const unsigned char *s) {
    unsigned char i;
    /* Scroll: line 0 → line 1 */
    for (i = 0; i <= MSG_CHARS; i++) msg[1][i] = msg[0][i];
    /* Fill line 0 with spaces, then copy s */
    for (i = 0; i < MSG_CHARS; i++) msg[0][i] = ' ';
    msg[0][MSG_CHARS] = 0;
    for (i = 0; i < MSG_CHARS && s[i]; i++) msg[0][i] = s[i];
    draw_messages();
}

/* ------------------------------------------------------------------ */
/* UI chrome                                                            */
/* ------------------------------------------------------------------ */

static void draw_ui(void) {
    unsigned int  base;
    unsigned char i;

    /* Separator: 2 dark-gray pixels at x=80-81 (byte offset 40) */
    for (i = 0; i < 80; i++) {
        base = ((unsigned int)i << 6) | 40;
        FRAMEBUFFER[base] = 0x88;
    }

    /* Message log top divider: pixel row 80, full width */
    base = (unsigned int)80 << 6;
    for (i = 0; i < 64; i++) FRAMEBUFFER[base + i] = 0x88;
}

/* ------------------------------------------------------------------ */
/* Camera                                                               */
/* ------------------------------------------------------------------ */

static void update_camera(void) {
    if (px >= VIEW_W / 2) cam_x = px - VIEW_W / 2; else cam_x = 0;
    if ((unsigned char)(cam_x + VIEW_W) > MAP_W) cam_x = MAP_W - VIEW_W;
    if (py >= VIEW_H / 2) cam_y = py - VIEW_H / 2; else cam_y = 0;
    if ((unsigned char)(cam_y + VIEW_H) > MAP_H) cam_y = MAP_H - VIEW_H;
}

/* ------------------------------------------------------------------ */
/* Field of View                                                        */
/* ------------------------------------------------------------------ */

static unsigned char has_los(unsigned char x0, unsigned char y0,
                               unsigned char x1, unsigned char y1) {
    unsigned char x, y, adx, ady;
    signed char   sx, sy, err, e2;

    x = x0; y = y0;
    if (x1 >= x0) { adx = x1 - x0; sx =  1; }
    else           { adx = x0 - x1; sx = -1; }
    if (y1 >= y0) { ady = y1 - y0; sy =  1; }
    else           { ady = y0 - y1; sy = -1; }
    err = (signed char)adx - (signed char)ady;

    for (;;) {
        if (x == x1 && y == y1) return 1;
        if (!(x == x0 && y == y0) &&
            TILE_TYPE(MAP_AT(x, y)) == T_WALL) return 0;
        e2 = (signed char)(err + err);
        if ((signed char)(e2 + (signed char)ady) > 0) {
            err = (signed char)(err - (signed char)ady);
            x   = (unsigned char)((int)x + sx);
        }
        if ((signed char)((signed char)adx - e2) > 0) {
            err = (signed char)(err + (signed char)adx);
            y   = (unsigned char)((int)y + sy);
        }
    }
}

static void compute_fov(void) {
    signed char   dx, dy;
    unsigned char adx_m, ady_m;
    int           tx, ty;
    unsigned int  i;

    for (i = 0; i < (unsigned int)(MAP_W * MAP_H); i++)
        map_data[i] &= (unsigned char)~F_VISIBLE;

    MAP_AT(px, py) |= F_VISIBLE | F_EXPLORED;

    for (dy = -FOV_R; dy <= FOV_R; dy++) {
        ty    = (int)py + (int)dy;
        if (ty < 0 || ty >= MAP_H) continue;
        ady_m = (dy < 0) ? (unsigned char)(-dy) : (unsigned char)dy;
        for (dx = -FOV_R; dx <= FOV_R; dx++) {
            tx    = (int)px + (int)dx;
            if (tx < 0 || tx >= MAP_W) continue;
            adx_m = (dx < 0) ? (unsigned char)(-dx) : (unsigned char)dx;
            if ((unsigned char)(adx_m + ady_m) > FOV_R + (FOV_R >> 1)) continue;
            if (has_los(px, py, (unsigned char)tx, (unsigned char)ty))
                MAP_AT(tx, ty) |= F_VISIBLE | F_EXPLORED;
        }
    }
}

/* ------------------------------------------------------------------ */
/* Map generation                                                        */
/* ------------------------------------------------------------------ */

static unsigned char rooms_overlap(unsigned char rx, unsigned char ry,
                                    unsigned char rw, unsigned char rh) {
    unsigned char i;
    for (i = 0; i < num_rooms; i++) {
        if (!(rx + rw + 1 < room_rx[i] ||
              room_rx[i] + room_rw[i] + 1 < rx ||
              ry + rh + 1 < room_ry[i] ||
              room_ry[i] + room_rh[i] + 1 < ry)) return 1;
    }
    return 0;
}

static void carve_room(unsigned char rx, unsigned char ry,
                        unsigned char rw, unsigned char rh) {
    unsigned char x, y;
    for (y = ry; y < (unsigned char)(ry + rh); y++)
        for (x = rx; x < (unsigned char)(rx + rw); x++)
            MAP_AT(x, y) = T_FLOOR;
}

static void carve_h(unsigned char x1, unsigned char x2, unsigned char y) {
    unsigned char x, t;
    if (x1 > x2) { t = x1; x1 = x2; x2 = t; }
    for (x = x1; x <= x2; x++)
        if (TILE_TYPE(MAP_AT(x, y)) == T_WALL) MAP_AT(x, y) = T_FLOOR;
}

static void carve_v(unsigned char x, unsigned char y1, unsigned char y2) {
    unsigned char y, t;
    if (y1 > y2) { t = y1; y1 = y2; y2 = t; }
    for (y = y1; y <= y2; y++)
        if (TILE_TYPE(MAP_AT(x, y)) == T_WALL) MAP_AT(x, y) = T_FLOOR;
}

static void gen_map(void) {
    unsigned char i, rw, rh, rx, ry, rangex, rangey;
    unsigned int  j;

    for (j = 0; j < (unsigned int)(MAP_W * MAP_H); j++) map_data[j] = T_WALL;
    num_rooms = 0;

    for (i = 0; i < 80 && num_rooms < MAX_ROOMS; i++) {
        rw     = 4 + (rand8() % 7);
        rh     = 3 + (rand8() % 5);
        rangex = (unsigned char)(MAP_W - rw - 2);
        rangey = (unsigned char)(MAP_H - rh - 2);
        rx     = 1 + rand8() % rangex;
        ry     = 1 + rand8() % rangey;
        if (rooms_overlap(rx, ry, rw, rh)) continue;
        carve_room(rx, ry, rw, rh);
        room_rx[num_rooms] = rx;  room_ry[num_rooms] = ry;
        room_rw[num_rooms] = rw;  room_rh[num_rooms] = rh;
        room_cx[num_rooms] = rx + rw / 2;
        room_cy[num_rooms] = ry + rh / 2;
        num_rooms++;
    }

    for (i = 1; i < num_rooms; i++) {
        if (rand8() & 1) {
            carve_h(room_cx[i-1], room_cx[i], room_cy[i-1]);
            carve_v(room_cx[i],   room_cy[i-1], room_cy[i]);
        } else {
            carve_v(room_cx[i-1], room_cy[i-1], room_cy[i]);
            carve_h(room_cx[i-1], room_cx[i],   room_cy[i]);
        }
    }
    if (num_rooms > 2) {
        carve_h(room_cx[num_rooms-1], room_cx[0], room_cy[num_rooms-1]);
        carve_v(room_cx[0], room_cy[num_rooms-1], room_cy[0]);
    }

    MAP_AT(room_cx[0], room_cy[0]) = T_STAIR_U;
    if (num_rooms > 1)
        MAP_AT(room_cx[num_rooms-1], room_cy[num_rooms-1]) = T_STAIR_D;

    px = room_cx[0];
    py = room_cy[0];
}

/* ------------------------------------------------------------------ */
/* New floor setup                                                       */
/* ------------------------------------------------------------------ */

static void enter_floor(void) {
    unsigned int i;
    /* Clear framebuffer */
    for (i = 0; i < 6144; i++) FRAMEBUFFER[i] = 0;
    gen_map();
    update_camera();
    compute_fov();
    draw_ui();
    draw_viewport();
    draw_player();
    draw_status_panel();
    draw_messages();
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

void main(void) {
    unsigned char k, nx, ny;

    MODE_REG = 3;

    /* Init player */
    player_hp    = 20;
    player_maxhp = 20;
    player_str   = 4;
    player_dex   = 4;
    player_def   = 0;
    player_level = 1;
    player_xp    = 0;
    player_gold  = 0;
    player_wpn[0]='D'; player_wpn[1]='A'; player_wpn[2]='G'; player_wpn[3]='R'; player_wpn[4]=0;
    player_arm[0]='N'; player_arm[1]='O'; player_arm[2]='N'; player_arm[3]='E'; player_arm[4]=0;

    /* Init message buffers to spaces */
    {
        unsigned char i;
        for (i = 0; i < MSG_CHARS; i++) { msg[0][i] = ' '; msg[1][i] = ' '; }
        msg[0][MSG_CHARS] = msg[1][MSG_CHARS] = 0;
    }

    depth = 1;
    rng   = 0xACE3;

    enter_floor();
    add_message((const unsigned char *)"WELCOME TO DEPTHS. WASD MOVE > DESCEND");

    while (1) {
        waitvsync();
        k = pollkey();
        if (!k) continue;

        /* — Stairs — */
        if (k == '>') {
            if (TILE_TYPE(MAP_AT(px, py)) == T_STAIR_D) {
                depth++;
                rng ^= (unsigned int)depth << 5;    /* stir RNG */
                enter_floor();
                add_message((const unsigned char *)"YOU DESCEND DEEPER INTO THE DARK.");
            }
            continue;
        }

        /* — Movement — */
        nx = px; ny = py;
        if      (k == 'w') ny--;
        else if (k == 's') ny++;
        else if (k == 'a') nx--;
        else if (k == 'd') nx++;
        else continue;

        if (nx >= MAP_W || ny >= MAP_H) continue;
        if (TILE_TYPE(MAP_AT(nx, ny)) == T_WALL) continue;

        px = nx; py = ny;
        update_camera();
        compute_fov();
        draw_viewport();
        draw_player();
    }
}
