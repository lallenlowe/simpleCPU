/*
 * depths.c — DEPTHS: A Roguelike for simpleCPU
 * Phase 3: monsters, AI, combat, XP, level-up, death
 *
 * Build:  make -f ../../target/cc65/Makefile depths.bin
 * Run:    node dist/index.js programs/games/depths.bin --org 0400
 * Keys:   WASD=move/attack  >=descend  S/D=level-up choice
 */

#include "simplecpu.h"

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

#define MAP_W        64
#define MAP_H        32
#define VIEW_W       20
#define VIEW_H       20
#define FOV_R         8
#define MAX_ROOMS    12
#define MAX_MONSTERS 16
#define NUM_MON_TYPES 13

#define SEP_X        80
#define STAT_X       84
#define STAT_CHARS   11
#define STAT_LINES   10
#define MSG_Y0       80
#define MSG_Y1       88
#define MSG_CHARS    32
#define FMT_BUF_SIZE 34      /* fits longest message (33 chars + NUL) */

/* ================================================================== */
/* Tile encoding                                                       */
/* ================================================================== */

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
#define MAP_IDX(x,y)   (((unsigned int)(y) << 6) | (unsigned char)(x))
#define MAP_AT(x,y)    map_data[MAP_IDX((x),(y))]

/* ================================================================== */
/* Pixel patterns                                                      */
/* ================================================================== */

static const unsigned char PAT_BLANK[]   = { 0x00, 0x00, 0x00, 0x00 };
static const unsigned char PAT_WALL[]    = { 0x0F, 0x0F, 0x0F, 0x0F };
static const unsigned char PAT_FLOOR[]   = { 0x00, 0x06, 0x06, 0x00 };
static const unsigned char PAT_DOOR[]    = { 0x06, 0x06, 0x06, 0x06 };
static const unsigned char PAT_STAIR_D[] = { 0x06, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_STAIR_U[] = { 0x02, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_WATER[]   = { 0x05, 0x0F, 0x05, 0x0F };
static const unsigned char PAT_PLAYER[]  = { 0x06, 0x0F, 0x06, 0x00 };

/* Monster sizes: small=2x2 blob, medium=3-wide, large=full, boss=full+eye */
static const unsigned char PAT_MON_S[] = { 0x0C, 0x0C, 0x00, 0x00 };
static const unsigned char PAT_MON_M[] = { 0x0E, 0x0F, 0x0E, 0x00 };
static const unsigned char PAT_MON_L[] = { 0x0F, 0x0F, 0x0F, 0x06 };
static const unsigned char PAT_MON_B[] = { 0x0F, 0x0B, 0x0F, 0x0F };

/* ================================================================== */
/* Font (4×8, ASCII 32–90)                                            */
/* ================================================================== */

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

/* ================================================================== */
/* Monster types                                                       */
/* ================================================================== */

static const unsigned char mtype_hp[NUM_MON_TYPES]     = { 4, 6, 8, 6,12,10,18,24,28,20,30,25,60};
static const unsigned char mtype_str[NUM_MON_TYPES]    = { 1, 2, 3, 2, 4, 3, 6, 7, 8, 6, 9, 8,14};
static const unsigned char mtype_dex[NUM_MON_TYPES]    = { 5, 4, 4, 6, 3, 2, 4, 2, 2, 6, 5, 7, 4};
static const unsigned char mtype_xp[NUM_MON_TYPES]     = { 5, 8,12,10,18,15,30,40,55,60,80,90,250};
static const unsigned char mtype_color[NUM_MON_TYPES]  = { 9, 2,10, 8, 3, 7, 6, 2, 8, 5, 1,15,11};
static const unsigned char mtype_mfloor[NUM_MON_TYPES] = { 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 7, 7,10};
static const unsigned char mtype_size[NUM_MON_TYPES]   = { 0, 0, 0, 0, 1, 1, 1, 2, 2, 1, 2, 1, 3};

static const char *mon_names[NUM_MON_TYPES] = {
    "RAT","KOBOLD","GOBLIN","BAT","ORC","SKELETON",
    "ORC WARRIOR","TROLL","OGRE","VAMPIRE","DEMON","LICH","DRAGON"
};

/* ================================================================== */
/* XP thresholds (level 1→2 needs 50 XP, etc.)                       */
/* ================================================================== */

static const unsigned int xp_thresh[9] = {
    50, 120, 220, 360, 550, 800, 1100, 1500, 2000
};

/* ================================================================== */
/* Game state                                                          */
/* ================================================================== */

static unsigned char map_data[MAP_W * MAP_H];

static unsigned char px, py;
static unsigned char cam_x, cam_y;
static unsigned char depth;

static unsigned char num_rooms;
static unsigned char room_cx[MAX_ROOMS], room_cy[MAX_ROOMS];
static unsigned char room_rx[MAX_ROOMS], room_ry[MAX_ROOMS];
static unsigned char room_rw[MAX_ROOMS], room_rh[MAX_ROOMS];

static unsigned int  rng;

/* Player */
static unsigned char player_hp, player_maxhp;
static unsigned char player_str, player_dex, player_def;
static unsigned char player_level;
static unsigned int  player_xp, player_gold;
static unsigned char player_wpn[5], player_arm[5];
static unsigned char pending_levelup;

/* Monsters */
typedef struct {
    unsigned char type;
    unsigned char x, y;
    unsigned char hp;
    unsigned char state;        /* 0=IDLE 1=CHASE 2=FLEE */
    unsigned char idle_turns;   /* frames since lost sight of player */
} Monster;

static Monster monsters[MAX_MONSTERS];
static unsigned char num_monsters;

/* Sound */
static unsigned char snd_frames;

/* Message + format buffer */
static unsigned char msg[2][MSG_CHARS + 1];
static unsigned char fmt_buf[FMT_BUF_SIZE];
static unsigned char fmt_len;

/* ================================================================== */
/* RNG                                                                 */
/* ================================================================== */

static unsigned char rand8(void) {
    rng ^= rng << 7; rng ^= rng >> 9; rng ^= rng << 8;
    return (unsigned char)rng;
}

/* ================================================================== */
/* Sound                                                               */
/* ================================================================== */

static void snd_tick(void) {
    if (snd_frames > 0 && --snd_frames == 0) {
        CH1_VOLUME = 0; CH2_VOLUME = 0;
    }
}

static void snd_play(unsigned char fl, unsigned char fh,
                      unsigned char wave, unsigned char vol,
                      unsigned char frames) {
    CH1_FREQ_LO=fl; CH1_FREQ_HI=fh; CH1_WAVEFORM=wave;
    CH1_VOLUME=vol; snd_frames=frames;
}

static void snd_strike(void)  { snd_play(160,0,WAVE_SQUARE,   10,2); }
static void snd_miss(void)    { snd_play( 60,0,WAVE_SQUARE,    6,1); }
static void snd_hurt(void)    { snd_play( 80,0,WAVE_SQUARE,   12,3); }
static void snd_kill(void)    { snd_play(200,0,WAVE_SAWTOOTH,  8,3); }
static void snd_levelup(void) { snd_play(250,0,WAVE_TRIANGLE, 15,6); }

/* ================================================================== */
/* Format helpers                                                      */
/* ================================================================== */

static void fmt_reset(void)            { fmt_len=0; fmt_buf[0]=0; }
static void fmt_chr(unsigned char c)   {
    if (fmt_len < FMT_BUF_SIZE-1) { fmt_buf[fmt_len++]=c; fmt_buf[fmt_len]=0; }
}
static void fmt_str(const char *s)     { while(*s) fmt_chr((unsigned char)*s++); }
static void fmt_u8(unsigned char n)    {
    if (n>=100) fmt_chr((unsigned char)('0'+n/100));
    if (n>=10)  fmt_chr((unsigned char)('0'+(n/10)%10));
    fmt_chr((unsigned char)('0'+n%10));
}
static void fmt_u16(unsigned int n)    {
    if (n>=1000) fmt_chr((unsigned char)('0'+n/1000));
    if (n>=100)  fmt_chr((unsigned char)('0'+(n/100)%10));
    if (n>=10)   fmt_chr((unsigned char)('0'+(n/10)%10));
    fmt_chr((unsigned char)('0'+n%10));
}
static void fmt_pad(unsigned char w)   { while(fmt_len<w) fmt_chr(' '); }

/* ================================================================== */
/* Drawing — characters (defined early; used by message + status)     */
/* ================================================================== */

static void draw_char(unsigned char bx, unsigned char by,
                       unsigned char c, unsigned char color) {
    const unsigned char *glyph;
    unsigned char row, p, c0, c1, c2, c3;
    unsigned char *fb;
    if (c<FONT_FIRST||c>FONT_LAST) glyph=font_data[0];
    else                            glyph=font_data[c-FONT_FIRST];
    fb = FRAMEBUFFER + (((unsigned int)by)<<6) + (bx>>1);
    for (row=0; row<8; row++, fb+=64) {
        p=glyph[row];
        c0=(p&0x08)?color:0; c1=(p&0x04)?color:0;
        c2=(p&0x02)?color:0; c3=(p&0x01)?color:0;
        fb[0]=(c0<<4)|c1; fb[1]=(c2<<4)|c3;
    }
}

/* ================================================================== */
/* Message log (needs draw_char — defined above)                       */
/* ================================================================== */

static void draw_messages(void) {
    unsigned char i;
    for (i=0; i<MSG_CHARS; i++) {
        draw_char((unsigned char)(i<<2), MSG_Y0, msg[0][i], 15);
        draw_char((unsigned char)(i<<2), MSG_Y1, msg[1][i],  8);
    }
}

static void add_message(const unsigned char *s) {
    unsigned char i;
    for (i=0; i<=MSG_CHARS; i++) msg[1][i]=msg[0][i];
    for (i=0; i<MSG_CHARS; i++) msg[0][i]=' ';
    msg[0][MSG_CHARS]=0;
    for (i=0; i<MSG_CHARS && s[i]; i++) msg[0][i]=s[i];
    draw_messages();
}

/* ================================================================== */
/* Drawing — tile patterns                                             */
/* ================================================================== */

static void draw_pattern(unsigned char bx, unsigned char by,
                          const unsigned char *pat,
                          unsigned char fg, unsigned char bg) {
    unsigned char row, p, c0, c1, c2, c3;
    unsigned char *fb = FRAMEBUFFER + (((unsigned int)by)<<6) + (bx>>1);
    for (row=0; row<4; row++, fb+=64) {
        p=pat[row];
        c0=(p&0x08)?fg:bg; c1=(p&0x04)?fg:bg;
        c2=(p&0x02)?fg:bg; c3=(p&0x01)?fg:bg;
        fb[0]=(c0<<4)|c1; fb[1]=(c2<<4)|c3;
    }
}

static void draw_map_tile(unsigned char sx, unsigned char sy,
                           unsigned char tile) {
    unsigned char t=TILE_TYPE(tile);
    unsigned char bx=(unsigned char)(sx<<2), by=(unsigned char)(sy<<2);
    if (!IS_EXPLORED(tile)) { draw_pattern(bx,by,PAT_BLANK,0,0); return; }
    if (!IS_VISIBLE(tile))  { draw_pattern(bx,by,(t==T_WALL)?PAT_WALL:PAT_FLOOR,8,0); return; }
    switch(t) {
        case T_WALL:    draw_pattern(bx,by,PAT_WALL,    7, 0); break;
        case T_FLOOR:   draw_pattern(bx,by,PAT_FLOOR,   8, 0); break;
        case T_DOOR_C:  draw_pattern(bx,by,PAT_DOOR,    3, 0); break;
        case T_DOOR_O:  draw_pattern(bx,by,PAT_FLOOR,   3, 0); break;
        case T_STAIR_D: draw_pattern(bx,by,PAT_STAIR_D,11, 0); break;
        case T_STAIR_U: draw_pattern(bx,by,PAT_STAIR_U,15, 0); break;
        case T_WATER:   draw_pattern(bx,by,PAT_WATER,   4,12); break;
        default:        draw_pattern(bx,by,PAT_BLANK,   0, 0); break;
    }
}

static void draw_viewport(void) {
    unsigned char vx, vy;
    for (vy=0; vy<VIEW_H; vy++)
        for (vx=0; vx<VIEW_W; vx++)
            draw_map_tile(vx, vy, MAP_AT(cam_x+vx, cam_y+vy));
}

/* ================================================================== */
/* Drawing — monsters                                                  */
/* ================================================================== */

static void draw_monster(unsigned char vx, unsigned char vy,
                          unsigned char mi) {
    unsigned char sz    = mtype_size[monsters[mi].type];
    unsigned char color = mtype_color[monsters[mi].type];
    unsigned char bx = (unsigned char)(vx<<2);
    unsigned char by = (unsigned char)(vy<<2);
    switch(sz) {
        case 0:  draw_pattern(bx,by,PAT_MON_S,color,0); break;
        case 1:  draw_pattern(bx,by,PAT_MON_M,color,0); break;
        case 2:  draw_pattern(bx,by,PAT_MON_L,color,0); break;
        default: draw_pattern(bx,by,PAT_MON_B,color,0); break;
    }
}

static void draw_monsters_in_view(void) {
    unsigned char mi, vx, vy;
    for (mi=0; mi<num_monsters; mi++) {
        if (!monsters[mi].hp) continue;
        if (monsters[mi].x < cam_x || monsters[mi].x >= cam_x+VIEW_W) continue;
        if (monsters[mi].y < cam_y || monsters[mi].y >= cam_y+VIEW_H) continue;
        if (!IS_VISIBLE(MAP_AT(monsters[mi].x, monsters[mi].y))) continue;
        vx = monsters[mi].x - cam_x;
        vy = monsters[mi].y - cam_y;
        draw_monster(vx, vy, mi);
    }
}

/* Redraw just the map tile (+ any monster) at map coords (mx,my) */
static void redraw_tile(unsigned char mx, unsigned char my) {
    unsigned char vx, vy, mi;
    if (mx<cam_x || mx>=cam_x+VIEW_W || my<cam_y || my>=cam_y+VIEW_H) return;
    vx = mx - cam_x; vy = my - cam_y;
    draw_map_tile(vx, vy, MAP_AT(mx, my));
    /* redraw monster on tile if any */
    for (mi=0; mi<num_monsters; mi++) {
        if (!monsters[mi].hp) continue;
        if (monsters[mi].x==mx && monsters[mi].y==my &&
            IS_VISIBLE(MAP_AT(mx,my))) {
            draw_monster(vx, vy, mi);
            break;
        }
    }
}

/* ================================================================== */
/* Drawing — player                                                    */
/* ================================================================== */

static void draw_player(void) {
    unsigned char vx=px-cam_x, vy=py-cam_y;
    if (vx<VIEW_W && vy<VIEW_H)
        draw_pattern((unsigned char)(vx<<2),(unsigned char)(vy<<2),PAT_PLAYER,15,0);
}

/* ================================================================== */
/* Drawing — status panel                                              */
/* ================================================================== */

static void stat_draw_line(unsigned char line, unsigned char color) {
    unsigned char i, bx=STAT_X, by=(unsigned char)(line*8);
    fmt_pad(STAT_CHARS);
    for (i=0; i<STAT_CHARS; i++, bx+=4)
        draw_char(bx, by, fmt_buf[i], color);
}

static unsigned char hp_color(void) {
    unsigned char pct=(unsigned char)((unsigned int)player_hp*100/player_maxhp);
    return (pct>66) ? 10 : (pct>33 ? 11 : 9);
}

static void draw_status_panel(void) {
    fmt_reset(); fmt_str("HP:"); fmt_u8(player_hp); fmt_chr('/'); fmt_u8(player_maxhp);
    stat_draw_line(0, hp_color());

    fmt_reset(); fmt_str("LV:"); fmt_u8(player_level); fmt_str(" FL:"); fmt_u8(depth);
    stat_draw_line(1, 15);

    fmt_reset(); fmt_str("XP:"); fmt_u16(player_xp);
    stat_draw_line(2, 11);

    fmt_reset(); fmt_str("ST:"); fmt_u8(player_str); fmt_str(" DX:"); fmt_u8(player_dex);
    stat_draw_line(3, 15);

    fmt_reset(); fmt_str("DEF:"); fmt_u8(player_def);
    stat_draw_line(4, 15);

    fmt_reset(); fmt_str("GOLD:"); fmt_u16(player_gold);
    stat_draw_line(5, 11);

    fmt_reset(); fmt_str("WP:"); fmt_str((const char *)player_wpn);
    stat_draw_line(6, 14);

    fmt_reset(); fmt_str("AR:"); fmt_str((const char *)player_arm);
    stat_draw_line(7, 7);

    fmt_reset(); stat_draw_line(8, 0);
    fmt_reset(); stat_draw_line(9, 0);
}

/* ================================================================== */
/* UI chrome                                                           */
/* ================================================================== */

static void draw_ui(void) {
    unsigned int  base; unsigned char i;
    for (i=0; i<80; i++) { base=((unsigned int)i<<6)|40; FRAMEBUFFER[base]=0x88; }
    base=(unsigned int)80<<6;
    for (i=0; i<64; i++) FRAMEBUFFER[base+i]=0x88;
}

/* ================================================================== */
/* Camera                                                              */
/* ================================================================== */

static void update_camera(void) {
    if (px>=VIEW_W/2) cam_x=px-VIEW_W/2; else cam_x=0;
    if ((unsigned char)(cam_x+VIEW_W)>MAP_W) cam_x=MAP_W-VIEW_W;
    if (py>=VIEW_H/2) cam_y=py-VIEW_H/2; else cam_y=0;
    if ((unsigned char)(cam_y+VIEW_H)>MAP_H) cam_y=MAP_H-VIEW_H;
}

/* ================================================================== */
/* FOV                                                                 */
/* ================================================================== */

static unsigned char has_los(unsigned char x0, unsigned char y0,
                               unsigned char x1, unsigned char y1) {
    unsigned char x=x0, y=y0, adx, ady;
    signed char sx, sy, err, e2;
    if (x1>=x0){adx=x1-x0;sx=1;}else{adx=x0-x1;sx=-1;}
    if (y1>=y0){ady=y1-y0;sy=1;}else{ady=y0-y1;sy=-1;}
    err=(signed char)adx-(signed char)ady;
    for(;;){
        if(x==x1&&y==y1) return 1;
        if(!(x==x0&&y==y0)&&TILE_TYPE(MAP_AT(x,y))==T_WALL) return 0;
        e2=(signed char)(err+err);
        if((signed char)(e2+(signed char)ady)>0){err=(signed char)(err-(signed char)ady);x=(unsigned char)((int)x+sx);}
        if((signed char)((signed char)adx-e2)>0){err=(signed char)(err+(signed char)adx);y=(unsigned char)((int)y+sy);}
    }
}

static void compute_fov(void) {
    signed char dx, dy; unsigned char adx_m, ady_m; int tx, ty; unsigned int i;
    for (i=0; i<(unsigned int)(MAP_W*MAP_H); i++) map_data[i]&=(unsigned char)~F_VISIBLE;
    MAP_AT(px,py)|=F_VISIBLE|F_EXPLORED;
    for (dy=-FOV_R; dy<=FOV_R; dy++) {
        ty=(int)py+(int)dy; if(ty<0||ty>=MAP_H) continue;
        ady_m=(dy<0)?(unsigned char)(-dy):(unsigned char)dy;
        for (dx=-FOV_R; dx<=FOV_R; dx++) {
            tx=(int)px+(int)dx; if(tx<0||tx>=MAP_W) continue;
            adx_m=(dx<0)?(unsigned char)(-dx):(unsigned char)dx;
            if((unsigned char)(adx_m+ady_m)>FOV_R+(FOV_R>>1)) continue;
            if(has_los(px,py,(unsigned char)tx,(unsigned char)ty))
                MAP_AT(tx,ty)|=F_VISIBLE|F_EXPLORED;
        }
    }
}

/* ================================================================== */
/* Map generation                                                      */
/* ================================================================== */

static unsigned char rooms_overlap(unsigned char rx,unsigned char ry,
                                    unsigned char rw,unsigned char rh) {
    unsigned char i;
    for (i=0; i<num_rooms; i++)
        if(!(rx+rw+1<room_rx[i]||room_rx[i]+room_rw[i]+1<rx||
             ry+rh+1<room_ry[i]||room_ry[i]+room_rh[i]+1<ry)) return 1;
    return 0;
}

static void carve_room(unsigned char rx,unsigned char ry,
                        unsigned char rw,unsigned char rh) {
    unsigned char x,y;
    for(y=ry;y<(unsigned char)(ry+rh);y++)
        for(x=rx;x<(unsigned char)(rx+rw);x++) MAP_AT(x,y)=T_FLOOR;
}

static void carve_h(unsigned char x1,unsigned char x2,unsigned char y) {
    unsigned char x,t; if(x1>x2){t=x1;x1=x2;x2=t;}
    for(x=x1;x<=x2;x++) if(TILE_TYPE(MAP_AT(x,y))==T_WALL) MAP_AT(x,y)=T_FLOOR;
}
static void carve_v(unsigned char x,unsigned char y1,unsigned char y2) {
    unsigned char y,t; if(y1>y2){t=y1;y1=y2;y2=t;}
    for(y=y1;y<=y2;y++) if(TILE_TYPE(MAP_AT(x,y))==T_WALL) MAP_AT(x,y)=T_FLOOR;
}

static void gen_map(void) {
    unsigned char i,rw,rh,rx,ry,rx_range,ry_range; unsigned int j;
    for(j=0;j<(unsigned int)(MAP_W*MAP_H);j++) map_data[j]=T_WALL;
    num_rooms=0;
    for(i=0;i<80&&num_rooms<MAX_ROOMS;i++){
        rw=4+(rand8()%7); rh=3+(rand8()%5);
        rx_range=(unsigned char)(MAP_W-rw-2); ry_range=(unsigned char)(MAP_H-rh-2);
        rx=1+rand8()%rx_range; ry=1+rand8()%ry_range;
        if(rooms_overlap(rx,ry,rw,rh)) continue;
        carve_room(rx,ry,rw,rh);
        room_rx[num_rooms]=rx; room_ry[num_rooms]=ry;
        room_rw[num_rooms]=rw; room_rh[num_rooms]=rh;
        room_cx[num_rooms]=rx+rw/2; room_cy[num_rooms]=ry+rh/2;
        num_rooms++;
    }
    for(i=1;i<num_rooms;i++){
        if(rand8()&1){carve_h(room_cx[i-1],room_cx[i],room_cy[i-1]);carve_v(room_cx[i],room_cy[i-1],room_cy[i]);}
        else         {carve_v(room_cx[i-1],room_cy[i-1],room_cy[i]);carve_h(room_cx[i-1],room_cx[i],room_cy[i]);}
    }
    if(num_rooms>2){
        carve_h(room_cx[num_rooms-1],room_cx[0],room_cy[num_rooms-1]);
        carve_v(room_cx[0],room_cy[num_rooms-1],room_cy[0]);
    }
    MAP_AT(room_cx[0],room_cy[0])=T_STAIR_U;
    if(num_rooms>1) MAP_AT(room_cx[num_rooms-1],room_cy[num_rooms-1])=T_STAIR_D;
    px=room_cx[0]; py=room_cy[0];
}

/* ================================================================== */
/* Monster spawning                                                    */
/* ================================================================== */

static void spawn_monsters(void) {
    unsigned char i, count, type, ri, tries;
    for(i=0;i<MAX_MONSTERS;i++) monsters[i].hp=0;
    count=depth+2; if(count>MAX_MONSTERS) count=MAX_MONSTERS;
    num_monsters=0;
    for(i=0;i<count;i++){
        type=0;
        for(tries=0;tries<20;tries++){
            type=rand8()%NUM_MON_TYPES;
            if(mtype_mfloor[type]<=depth) break;
        }
        ri=(num_rooms>1)?(1+rand8()%(num_rooms-1)):0;
        monsters[num_monsters].x    =room_rx[ri]+rand8()%room_rw[ri];
        monsters[num_monsters].y    =room_ry[ri]+rand8()%room_rh[ri];
        monsters[num_monsters].type =type;
        monsters[num_monsters].hp   =mtype_hp[type];
        monsters[num_monsters].state=0;
        monsters[num_monsters].idle_turns=0;
        num_monsters++;
    }
}

/* ================================================================== */
/* Combat                                                              */
/* ================================================================== */

static void check_levelup(void) {
    if (player_level>=9) return;
    if (player_xp>=xp_thresh[player_level-1]) {
        player_level++;
        player_maxhp+=5; player_hp=player_maxhp;
        pending_levelup=1;
        add_message((const unsigned char *)"LEVEL UP! PRESS S=STR OR D=DEX.");
    }
}

/* Returns monster index at (x,y) or 255 if none */
static unsigned char monster_at(unsigned char x, unsigned char y) {
    unsigned char i;
    for(i=0;i<num_monsters;i++)
        if(monsters[i].hp && monsters[i].x==x && monsters[i].y==y) return i;
    return 255;
}

static void player_attack(unsigned char mi) {
    unsigned char type=monsters[mi].type;
    unsigned char roll, to_hit, dmg;
    unsigned char kx, ky;

    roll   =(rand8()%8)+1;
    to_hit =roll+player_dex;

    if(to_hit>=mtype_dex[type]+5){          /* HIT */
        dmg=(rand8()%6)+1+player_str; if(!dmg) dmg=1;

        if(dmg>=monsters[mi].hp){           /* KILL */
            kx=monsters[mi].x; ky=monsters[mi].y;
            player_xp+=mtype_xp[type];
            monsters[mi].hp=0; monsters[mi].x=0; monsters[mi].y=0;
            redraw_tile(kx,ky);
            check_levelup();
            fmt_reset(); fmt_str("YOU KILL THE "); fmt_str(mon_names[type]); fmt_chr('!');
            add_message(fmt_buf);
            snd_kill();
        } else {                            /* HIT but alive */
            monsters[mi].hp-=dmg;
            /* check flee */
            if(monsters[mi].hp < mtype_hp[type]/4+1 && monsters[mi].state!=2){
                monsters[mi].state=2;
            }
            fmt_reset(); fmt_str("YOU HIT THE "); fmt_str(mon_names[type]);
            fmt_str(" ("); fmt_u8(dmg); fmt_chr(')'); fmt_chr('.');
            add_message(fmt_buf);
            snd_strike();
        }
    } else {                                /* MISS */
        fmt_reset(); fmt_str("YOU MISS THE "); fmt_str(mon_names[type]); fmt_chr('.');
        add_message(fmt_buf);
        snd_miss();
    }
    draw_status_panel();
}

static void monster_attack(unsigned char mi) {
    unsigned char type=monsters[mi].type;
    unsigned char roll, to_hit, dmg;

    roll   =(rand8()%8)+1;
    to_hit =roll+mtype_str[type];

    if(to_hit>=player_dex+5){               /* HIT */
        dmg=(rand8()%6)+1+mtype_str[type];
        dmg=(dmg>player_def)?(unsigned char)(dmg-player_def):1;
        if(dmg>=player_hp) player_hp=0; else player_hp-=dmg;
        fmt_reset(); fmt_str("THE "); fmt_str(mon_names[type]);
        fmt_str(" HITS YOU ("); fmt_u8(dmg); fmt_chr(')'); fmt_chr('.');
        add_message(fmt_buf);
        snd_hurt();
    } else {                                /* MISS */
        fmt_reset(); fmt_str("THE "); fmt_str(mon_names[type]); fmt_str(" MISSES.");
        add_message(fmt_buf);
    }
    draw_status_panel();
}

/* ================================================================== */
/* Monster AI                                                          */
/* ================================================================== */

static unsigned char mon_can_move(unsigned char mi,
                                   unsigned char nx, unsigned char ny) {
    unsigned char j;
    if(!nx || nx>=MAP_W-1 || !ny || ny>=MAP_H-1) return 0;
    if(TILE_TYPE(MAP_AT(nx,ny))==T_WALL)   return 0;
    if(TILE_TYPE(MAP_AT(nx,ny))==T_DOOR_C) return 0;   /* monsters can't open doors */
    if(nx==px && ny==py)                   return 0;
    for(j=0;j<num_monsters;j++)
        if(j!=mi && monsters[j].hp && monsters[j].x==nx && monsters[j].y==ny) return 0;
    return 1;
}

static void mon_move(unsigned char mi, unsigned char nx, unsigned char ny) {
    unsigned char ox=monsters[mi].x, oy=monsters[mi].y;
    redraw_tile(ox, oy);
    monsters[mi].x=nx; monsters[mi].y=ny;
    if(IS_VISIBLE(MAP_AT(nx,ny))) {
        if(nx>=cam_x&&nx<cam_x+VIEW_W&&ny>=cam_y&&ny<cam_y+VIEW_H) {
            unsigned char vx=nx-cam_x, vy=ny-cam_y;
            draw_map_tile(vx,vy,MAP_AT(nx,ny));
            draw_monster(vx,vy,mi);
        }
    }
}

static void mon_step_toward(unsigned char mi,
                              signed char sdx, signed char sdy) {
    unsigned char nx=(unsigned char)((int)monsters[mi].x+sdx);
    unsigned char ny=(unsigned char)((int)monsters[mi].y+sdy);
    /* Try diagonal first, then cardinal */
    if(sdx&&sdy&&mon_can_move(mi,nx,ny))        { mon_move(mi,nx,ny); return; }
    nx=(unsigned char)((int)monsters[mi].x+sdx); ny=monsters[mi].y;
    if(sdx&&mon_can_move(mi,nx,ny))              { mon_move(mi,nx,ny); return; }
    nx=monsters[mi].x; ny=(unsigned char)((int)monsters[mi].y+sdy);
    if(sdy&&mon_can_move(mi,nx,ny))              { mon_move(mi,nx,ny); return; }
}

static void monster_act(unsigned char mi) {
    unsigned char type=monsters[mi].type;
    unsigned char vis =IS_VISIBLE(MAP_AT(monsters[mi].x,monsters[mi].y));
    signed char   dx  =(signed char)((int)px-(int)monsters[mi].x);
    signed char   dy  =(signed char)((int)py-(int)monsters[mi].y);
    unsigned char adx =(dx<0)?(unsigned char)(-dx):(unsigned char)dx;
    unsigned char ady =(dy<0)?(unsigned char)(-dy):(unsigned char)dy;
    signed char   sdx =(dx>0)?1:(dx<0?-1:0);
    signed char   sdy =(dy>0)?1:(dy<0?-1:0);
    unsigned char d;

    if(monsters[mi].state==0){              /* IDLE */
        if(vis){
            monsters[mi].state=1; monsters[mi].idle_turns=0;
            fmt_reset(); fmt_str("THE "); fmt_str(mon_names[type]); fmt_str(" NOTICES YOU!");
            add_message(fmt_buf);
        } else if((rand8()&3)==0){          /* 25% wander */
            static const signed char wdx[4]={0,0,1,-1};
            static const signed char wdy[4]={-1,1,0,0};
            unsigned char wx, wy;
            d=rand8()%4;
            wx=(unsigned char)((int)monsters[mi].x+wdx[d]);
            wy=(unsigned char)((int)monsters[mi].y+wdy[d]);
            if(mon_can_move(mi,wx,wy)) mon_move(mi,wx,wy);
        }
        return;
    }

    if(monsters[mi].state==2){              /* FLEE */
        if(!vis){ monsters[mi].state=0; return; }
        if(adx<=1&&ady<=1){ monster_attack(mi); return; }  /* cornered */
        mon_step_toward(mi,(signed char)(-sdx),(signed char)(-sdy));
        return;
    }

    /* CHASE */
    if(!vis){ if(++monsters[mi].idle_turns>5) monsters[mi].state=0; return; }
    monsters[mi].idle_turns=0;
    if(adx<=1&&ady<=1){ monster_attack(mi); return; }
    mon_step_toward(mi,sdx,sdy);
    (void)type;
}

static void monsters_turn(void) {
    unsigned char i;
    for(i=0;i<num_monsters;i++) if(monsters[i].hp) monster_act(i);
}

/* ================================================================== */
/* Game over / new game                                                */
/* ================================================================== */

static void enter_floor(void);   /* forward declaration */

static void init_player(void) {
    player_hp=20; player_maxhp=20;
    player_str=4; player_dex=4; player_def=0;
    player_level=1; player_xp=0; player_gold=0; pending_levelup=0;
    player_wpn[0]='D';player_wpn[1]='A';player_wpn[2]='G';player_wpn[3]='R';player_wpn[4]=0;
    player_arm[0]='N';player_arm[1]='O';player_arm[2]='N';player_arm[3]='E';player_arm[4]=0;
}

static void game_over(void) {
    unsigned char i;
    add_message((const unsigned char *)"YOU HAVE DIED. ANY KEY TO RESTART.");
    draw_messages();
    while(!pollkey()) waitvsync();
    /* Reset */
    init_player();
    depth=1;
    rng+=(unsigned int)0x4321;
    for(i=0;i<MSG_CHARS;i++){msg[0][i]=' ';msg[1][i]=' ';}
    msg[0][MSG_CHARS]=msg[1][MSG_CHARS]=0;
    enter_floor();
    add_message((const unsigned char *)"DEPTHS AWAITS. GOOD LUCK.");
}

/* ================================================================== */
/* Floor transition                                                    */
/* ================================================================== */

static void enter_floor(void) {
    unsigned int i;
    for(i=0;i<6144;i++) FRAMEBUFFER[i]=0;
    gen_map();
    spawn_monsters();
    update_camera();
    compute_fov();
    draw_ui();
    draw_viewport();
    draw_monsters_in_view();
    draw_player();
    draw_status_panel();
    draw_messages();
}

/* ================================================================== */
/* Main                                                                */
/* ================================================================== */

void main(void) {
    unsigned char k, nx, ny, mi;
    unsigned char i;

    MODE_REG=3;
    init_player();
    for(i=0;i<MSG_CHARS;i++){msg[0][i]=' ';msg[1][i]=' ';}
    msg[0][MSG_CHARS]=msg[1][MSG_CHARS]=0;
    depth=1; rng=0xACE3;

    enter_floor();
    add_message((const unsigned char *)"WELCOME TO DEPTHS. WASD MOVE > DESCEND");

    while(1){
        waitvsync();
        snd_tick();
        k=pollkey(); if(!k) continue;

        /* Level-up stat choice */
        if(pending_levelup){
            if(k=='s'||k=='S'){
                player_str+=2; pending_levelup=0;
                add_message((const unsigned char *)"STR +2. YOU ARE STRONGER!");
                snd_levelup();
            } else if(k=='d'||k=='D'){
                player_dex+=2; pending_levelup=0;
                add_message((const unsigned char *)"DEX +2. YOU ARE SWIFTER!");
                snd_levelup();
            }
            draw_status_panel(); continue;
        }

        /* Stairs */
        if(k=='>'){
            if(TILE_TYPE(MAP_AT(px,py))==T_STAIR_D){
                depth++; rng^=(unsigned int)depth<<5;
                enter_floor();
                add_message((const unsigned char *)"YOU DESCEND DEEPER INTO THE DARK.");
            }
            continue;
        }

        /* Movement / attack */
        nx=px; ny=py;
        if     (k=='w') ny--;
        else if(k=='s') ny++;
        else if(k=='a') nx--;
        else if(k=='d') nx++;
        else continue;

        if(nx>=MAP_W||ny>=MAP_H) continue;

        mi=monster_at(nx,ny);
        if(mi!=255){
            player_attack(mi);
        } else {
            if(TILE_TYPE(MAP_AT(nx,ny))==T_WALL) continue;
            px=nx; py=ny;
            update_camera(); compute_fov();
            draw_viewport(); draw_monsters_in_view(); draw_player();
        }

        /* All monsters act */
        monsters_turn();

        if(!player_hp) game_over();
    }
}
