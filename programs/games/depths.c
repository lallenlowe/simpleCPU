/*
 * depths.c — DEPTHS: A Roguelike for simpleCPU
 * Phase 1: map generation, FOV, player movement, viewport scrolling
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

#define MAP_W     64        /* dungeon width  — power of 2 for fast y*64 */
#define MAP_H     32        /* dungeon height                             */
#define VIEW_W    24        /* map viewport width  (tiles)                */
#define VIEW_H    20        /* map viewport height (tiles)                */
#define FOV_R      8        /* field-of-view radius (tiles)               */
#define MAX_ROOMS 12        /* max rooms per floor                        */

/* ------------------------------------------------------------------ */
/* Tile encoding                                                        */
/* ------------------------------------------------------------------ */
/* Each map byte:  bits 0-2 = tile type   (0-6)                        */
/*                 bit  3   = F_EXPLORED  (has ever been seen)         */
/*                 bit  4   = F_VISIBLE   (in current FOV)             */

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

/* MAP_W=64 so y*64 = y<<6 — no multiply needed */
#define MAP_IDX(x,y)  (((unsigned int)(y) << 6) | (unsigned char)(x))
#define MAP_AT(x,y)   map_data[MAP_IDX((x),(y))]

/* ------------------------------------------------------------------ */
/* Pixel patterns                                                       */
/* ------------------------------------------------------------------ */
/* 4 bytes; bit 3 = leftmost pixel, bit 0 = rightmost pixel.           */
/* Set bits render as fg colour, clear bits as bg colour.              */

static const unsigned char PAT_BLANK[]   = { 0x00, 0x00, 0x00, 0x00 };
static const unsigned char PAT_WALL[]    = { 0x0F, 0x0F, 0x0F, 0x0F };
static const unsigned char PAT_FLOOR[]   = { 0x00, 0x06, 0x06, 0x00 };
static const unsigned char PAT_DOOR[]    = { 0x06, 0x06, 0x06, 0x06 };
static const unsigned char PAT_STAIR_D[] = { 0x06, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_STAIR_U[] = { 0x02, 0x0F, 0x06, 0x02 };
static const unsigned char PAT_WATER[]   = { 0x05, 0x0F, 0x05, 0x0F };
static const unsigned char PAT_PLAYER[]  = { 0x06, 0x0F, 0x06, 0x00 };

/* ------------------------------------------------------------------ */
/* Game state                                                           */
/* ------------------------------------------------------------------ */

static unsigned char map_data[MAP_W * MAP_H];   /* 2048 bytes          */

static unsigned char px, py;                    /* player position     */
static unsigned char cam_x, cam_y;              /* viewport top-left   */
static unsigned char depth;                     /* current floor       */

/* Room data (used during generation only, kept for future use) */
static unsigned char num_rooms;
static unsigned char room_cx[MAX_ROOMS];
static unsigned char room_cy[MAX_ROOMS];
static unsigned char room_rx[MAX_ROOMS];
static unsigned char room_ry[MAX_ROOMS];
static unsigned char room_rw[MAX_ROOMS];
static unsigned char room_rh[MAX_ROOMS];

static unsigned int  rng;

/* ------------------------------------------------------------------ */
/* RNG — xorshift16                                                     */
/* ------------------------------------------------------------------ */

static unsigned char rand8(void) {
    rng ^= rng << 7;
    rng ^= rng >> 9;
    rng ^= rng << 8;
    return (unsigned char)rng;
}

/* ------------------------------------------------------------------ */
/* Graphics                                                             */
/* ------------------------------------------------------------------ */

/*
 * Draw a 4x4 pixel pattern at pixel position (bx, by).
 * bx must be a multiple of 4. Set bits → fg, clear bits → bg.
 */
static void draw_pattern(unsigned char bx, unsigned char by,
                          const unsigned char *pat,
                          unsigned char fg, unsigned char bg) {
    unsigned char row, p, c0, c1, c2, c3;
    unsigned int  base;
    unsigned char off = bx >> 1;    /* byte offset within row */
    for (row = 0; row < 4; row++) {
        base = ((unsigned int)(by + row) << 6) | off;
        p  = pat[row];
        c0 = (p >> 3) & 1 ? fg : bg;
        c1 = (p >> 2) & 1 ? fg : bg;
        c2 = (p >> 1) & 1 ? fg : bg;
        c3 = (p >> 0) & 1 ? fg : bg;
        FRAMEBUFFER[base]   = (c0 << 4) | c1;
        FRAMEBUFFER[base+1] = (c2 << 4) | c3;
    }
}

/* Render one map tile at viewport screen coords (sx, sy) */
static void draw_map_tile(unsigned char sx, unsigned char sy,
                           unsigned char tile) {
    unsigned char t  = TILE_TYPE(tile);
    unsigned char bx = (unsigned char)(sx << 2);   /* sx * 4 */
    unsigned char by = (unsigned char)(sy << 2);   /* sy * 4 */

    if (!IS_EXPLORED(tile)) {
        draw_pattern(bx, by, PAT_BLANK, 0, 0);
        return;
    }
    if (!IS_VISIBLE(tile)) {
        /* Memory: walls solid dim, everything else faint dot */
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

/* Render the full map viewport */
static void draw_viewport(void) {
    unsigned char vx, vy;
    for (vy = 0; vy < VIEW_H; vy++)
        for (vx = 0; vx < VIEW_W; vx++)
            draw_map_tile(vx, vy, MAP_AT(cam_x + vx, cam_y + vy));
}

/* Draw the player sprite over the viewport */
static void draw_player(void) {
    unsigned char vx = px - cam_x;
    unsigned char vy = py - cam_y;
    if (vx < VIEW_W && vy < VIEW_H)
        draw_pattern((unsigned char)(vx << 2),
                     (unsigned char)(vy << 2),
                     PAT_PLAYER, 15, 0);
}

/*
 * Draw the static UI chrome:
 *   — 4-pixel dark-gray separator at pixel x=96 (tile col 24)
 *   — 1-row dark-gray divider at pixel y=80 (between map and message log)
 * Everything else (status panel, message log) starts as black.
 */
static void draw_ui(void) {
    unsigned int  base;
    unsigned char i;

    /* Separator: pixel columns 96-99, rows 0-79 */
    for (i = 0; i < 80; i++) {
        base = ((unsigned int)i << 6) | 48;   /* byte offset 48 = pixel x 96 */
        FRAMEBUFFER[base]   = 0x88;
        FRAMEBUFFER[base+1] = 0x88;
    }

    /* Message log top divider: pixel row 80, full width */
    base = (unsigned int)80 << 6;
    for (i = 0; i < 64; i++)
        FRAMEBUFFER[base + i] = 0x88;
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

/*
 * Bresenham line-of-sight: returns 1 if (x1,y1) is visible from (x0,y0).
 * Walls block vision but are themselves visible (you see the wall face).
 */
static unsigned char has_los(unsigned char x0, unsigned char y0,
                               unsigned char x1, unsigned char y1) {
    int dx, dy, sx, sy, adx, ady, err, e2, x, y;

    dx  = (int)x1 - (int)x0;
    dy  = (int)y1 - (int)y0;
    sx  = dx > 0 ?  1 : (dx < 0 ? -1 : 0);
    sy  = dy > 0 ?  1 : (dy < 0 ? -1 : 0);
    adx = dx < 0 ? -dx : dx;
    ady = dy < 0 ? -dy : dy;
    err = adx - ady;
    x   = (int)x0;
    y   = (int)y0;

    for (;;) {
        if (x == (int)x1 && y == (int)y1) return 1;

        /* Intermediate wall blocks vision (skip source tile) */
        if (!(x == (int)x0 && y == (int)y0) &&
            TILE_TYPE(MAP_AT(x, y)) == T_WALL) return 0;

        e2 = 2 * err;
        if (e2 > -ady) { err -= ady; x += sx; }
        if (e2 <  adx) { err += adx; y += sy; }
    }
}

/* Recompute FOV from player position */
static void compute_fov(void) {
    int dx, dy, tx, ty;
    unsigned int i;

    /* Clear F_VISIBLE on all tiles */
    for (i = 0; i < (unsigned int)(MAP_W * MAP_H); i++)
        map_data[i] &= (unsigned char)~F_VISIBLE;

    /* Player tile always lit */
    MAP_AT(px, py) |= F_VISIBLE | F_EXPLORED;

    /* Check every tile in the FOV_R square */
    for (dy = -FOV_R; dy <= FOV_R; dy++) {
        ty = (int)py + dy;
        if (ty < 0 || ty >= MAP_H) continue;
        for (dx = -FOV_R; dx <= FOV_R; dx++) {
            tx = (int)px + dx;
            if (tx < 0 || tx >= MAP_W) continue;
            if (has_los(px, py, (unsigned char)tx, (unsigned char)ty))
                MAP_AT(tx, ty) |= F_VISIBLE | F_EXPLORED;
        }
    }
}

/* ------------------------------------------------------------------ */
/* Map generation — random rooms + L-shaped corridor connections        */
/* ------------------------------------------------------------------ */

static unsigned char rooms_overlap(unsigned char rx, unsigned char ry,
                                    unsigned char rw, unsigned char rh) {
    unsigned char i;
    for (i = 0; i < num_rooms; i++) {
        /* AABB overlap with 1-tile margin */
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
        if (TILE_TYPE(MAP_AT(x, y)) == T_WALL)
            MAP_AT(x, y) = T_FLOOR;
}

static void carve_v(unsigned char x, unsigned char y1, unsigned char y2) {
    unsigned char y, t;
    if (y1 > y2) { t = y1; y1 = y2; y2 = t; }
    for (y = y1; y <= y2; y++)
        if (TILE_TYPE(MAP_AT(x, y)) == T_WALL)
            MAP_AT(x, y) = T_FLOOR;
}

static void gen_map(void) {
    unsigned char i, rw, rh, rx, ry;
    unsigned char rangex, rangey;
    unsigned int  j;

    /* Fill with walls */
    for (j = 0; j < (unsigned int)(MAP_W * MAP_H); j++)
        map_data[j] = T_WALL;

    num_rooms = 0;

    /* Place rooms (up to 80 attempts) */
    for (i = 0; i < 80 && num_rooms < MAX_ROOMS; i++) {
        rw     = 4 + (rand8() % 7);                          /* 4-10 wide */
        rh     = 3 + (rand8() % 5);                          /* 3-7  tall */
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

    /* Connect rooms with L-shaped corridors */
    for (i = 1; i < num_rooms; i++) {
        if (rand8() & 1) {
            carve_h(room_cx[i-1], room_cx[i], room_cy[i-1]);
            carve_v(room_cx[i],   room_cy[i-1], room_cy[i]);
        } else {
            carve_v(room_cx[i-1], room_cy[i-1], room_cy[i]);
            carve_h(room_cx[i-1], room_cx[i],   room_cy[i]);
        }
    }

    /* One extra corridor: last room back to first (creates loops) */
    if (num_rooms > 2) {
        carve_h(room_cx[num_rooms-1], room_cx[0], room_cy[num_rooms-1]);
        carve_v(room_cx[0], room_cy[num_rooms-1], room_cy[0]);
    }

    /* Stairs */
    MAP_AT(room_cx[0], room_cy[0]) = T_STAIR_U;
    if (num_rooms > 1)
        MAP_AT(room_cx[num_rooms-1], room_cy[num_rooms-1]) = T_STAIR_D;

    /* Player starts at upstairs */
    px = room_cx[0];
    py = room_cy[0];
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

void main(void) {
    unsigned char k, nx, ny;
    unsigned int  i;

    MODE_REG = 3;

    /* Clear framebuffer */
    for (i = 0; i < 6144; i++) FRAMEBUFFER[i] = 0;

    depth = 1;
    rng   = 0xACE3;

    /* Generate and display the first floor */
    gen_map();
    update_camera();
    compute_fov();
    draw_ui();
    draw_viewport();
    draw_player();

    puts_scpu("\r\nDEPTHS  --  WASD to move\r\n");

    while (1) {
        waitvsync();

        k = pollkey();
        if (!k) continue;

        nx = px; ny = py;
        if      (k == 'w') ny--;
        else if (k == 's') ny++;
        else if (k == 'a') nx--;
        else if (k == 'd') nx++;
        else continue;

        /* Bounds + wall check (unsigned wrap handles ny-- at 0) */
        if (nx >= MAP_W || ny >= MAP_H) continue;
        if (TILE_TYPE(MAP_AT(nx, ny)) == T_WALL) continue;

        px = nx; py = ny;
        update_camera();
        compute_fov();
        draw_viewport();
        draw_player();
    }
}
