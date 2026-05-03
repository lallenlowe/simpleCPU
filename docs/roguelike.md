# DEPTHS — Roguelike Design Document

A permadeath dungeon crawler for simpleCPU, written in C (cc65).
Inspired by Dungeon Crawl Stone Soup. Target: something actually worth playing.

---

## Design Pillars

These come straight from DCSS's explicit philosophy, applied to our constraints:

1. **Every turn is a decision.** No "safe grinding." Resources deplete, monsters
   act intelligently, and the dungeon is not forgiving. If you're repeating the
   same action safely, something is wrong with the design.

2. **Death is always your fault.** The game never kills you with information you
   couldn't have had. FOV is consistent. Monster stats are visible. Damage
   numbers are shown. Surprises come from *choices*, not from hidden mechanics.

3. **Replayability through variety.** Procedural maps, randomized item
   identification, and level-up stat choices mean no two runs are the same.
   Short enough that you want to start over immediately when you die.

4. **No grinding.** XP comes from killing monsters. There are no level-grinding
   mechanics. The dungeon has exactly as many monsters as it has. You can't
   farm infinite healing between rooms.

5. **Transparent mechanics.** Combat math is shown. Hit chance, damage range,
   and monster HP are all visible. The player is never confused about *why*
   something happened.

---

## Display Layout

Mode 3: 128×96, 4bpp, 16 colors.
Tile size: 4×4 pixels.
Grid: 32 columns × 24 rows.

```
 Col 0          Col 23 Col 24    Col 31
 |               |     |         |
 +---------------+-----+---------+   Row 0
 |               |     |         |
 |  MAP VIEWPORT |  S  | STATUS  |
 |   24 × 20     |  E  |  PANEL  |
 |               |  P  |  8 × 20 |
 |               |     |         |   Row 19
 +---------------+-----+---------+   Row 20
 |    MESSAGE LOG — 32 × 4            Row 23
 +------------------------------------+
```

**Map viewport (cols 0–23, rows 0–19):** 96×80 pixels.
Scrolls to follow the player through the dungeon.

**Separator (col 23):** Single-tile vertical line in wall color.

**Status panel (cols 24–31, rows 0–19):** 32×80 pixels.
Contains player stats rendered with the pixel font (see Font section).

**Message log (cols 0–31, rows 20–23):** 128×16 pixels.
Two lines of scrolling combat and event messages.

---

## Pixel Font

A 4×8 pixel font (4 pixels wide, 8 pixels tall, MSB = leftmost pixel).
Stored as `font_data[char_index][8]` — 8 bytes per glyph, lower 4 bits used.

Characters: `SPACE ! # $ % ( ) * + - . / : ? @ 0-9 A-Z` (~48 glyphs, ~384 bytes).

Status panel capacity: **8 chars wide × 10 lines tall**.
Message log capacity: **32 chars wide × 2 lines tall**.

Font rendering draws only set pixels (plot3 calls), leaving background black.
Status panel only redraws lines whose values have changed since last frame.

---

## Dungeon Map

### Dimensions

**48 tiles wide × 40 tiles tall per floor** (1920 bytes).
Viewport is 24×20, so the player sees roughly half the floor at a time.

### Tile Types (1 byte each)

```c
#define T_WALL     0   /* solid — impassable, opaque              */
#define T_FLOOR    1   /* open  — passable, transparent           */
#define T_DOOR_C   2   /* closed door — passable (opens), opaque  */
#define T_DOOR_O   3   /* open door   — passable, transparent     */
#define T_STAIR_D  4   /* stairs down — enter next floor          */
#define T_STAIR_U  5   /* stairs up   — enter previous floor      */
#define T_WATER    6   /* impassable, transparent                 */
```

### Tile Colors

| Tile         | Color index | Appearance          |
|--------------|-------------|---------------------|
| Wall         | 7 (lt gray) | solid block         |
| Floor        | 8 (dk gray) | dim block           |
| Closed door  | 6 (brown)   | solid block         |
| Open door    | 6 (brown)   | dim block           |
| Stairs down  | 14 (yellow) | solid block         |
| Stairs up    | 15 (white)  | solid block         |
| Water        | 1 (blue)    | solid block         |
| Out-of-FOV (explored) | dimmed version of tile color |

FOV-hidden but explored tiles are drawn at half intensity (color index - 8 or
a fixed "memory" color, TBD).

Unseen tiles are drawn as pure black (color 0).

### Generation Algorithm: BSP Rooms

1. Fill 48×40 map with `T_WALL`.
2. Build a BSP tree: recursively split the map until leaf nodes are ≥ 7×7.
   Min split: 8 tiles; min room: 4×4; max recursion depth: 5.
   Produces 8–16 rooms per floor.
3. Carve a random room (4×4 to 10×8) inside each leaf node.
4. Connect sibling rooms with L-shaped corridors (horizontal then vertical, or
   vertical then horizontal — chosen randomly).
5. Place stairs:
   - Stairs **down** in the room farthest from the start room.
   - Stairs **up** in the start room (floor 1 only: this leads to exit/win).
6. Scatter monsters and items (see spawn tables below).

BSP tree nodes are temporary (stack-allocated during generation, ~256 bytes).
Only the final tile map is kept.

### FOV & Exploration (per floor)

Two bitfields, each 240 bytes (1920 bits):

- `fov_map[240]`      — set = currently visible this turn
- `explored[240]`     — set = has ever been seen (persists)

FOV is recomputed each turn after movement using **symmetric shadowcasting**
(8 octants, radius 8). A tile is visible if the shadowcast ray reaches it
without hitting an opaque tile. Doors block LOS when closed, not when open.

Walls adjacent to visible floor are also revealed (so you can see wall faces).

### Multi-floor Persistence

Only one floor is kept in RAM at a time. When the player takes stairs:
- Current floor state (tile map + explored bitmap + monster positions + items)
  is **not** saved — you cannot go back up safely.
- Stairs **up** exist but taking them on floors 2–10 simply says
  "The way back is too dangerous" (blocked). You can only ascend once you
  have the Amulet of Descent.

This avoids needing multi-floor storage and encourages forward pressure.
**Exception:** Taking stairs up with the Amulet triggers the win sequence.

---

## Player

```c
struct Player {
    unsigned char x, y;          /* current position              */
    unsigned char hp, max_hp;    /* current / maximum HP          */
    unsigned char str;           /* strength — damage bonus       */
    unsigned char dex;           /* dexterity — hit/dodge bonus   */
    unsigned char level;         /* character level (1–10)        */
    unsigned int  xp;            /* experience points             */
    unsigned int  gold;          /* gold carried                  */
    unsigned char weapon;        /* equipped weapon (item idx/FF) */
    unsigned char armor;         /* equipped armor  (item idx/FF) */
    unsigned char depth;         /* current dungeon floor (1–10)  */
    unsigned char has_amulet;    /* found the Amulet of Descent   */
};
```

**Starting stats:** HP 20/20, STR 4, DEX 4, LV 1, Dagger equipped.

**Level-up (XP thresholds: 50, 120, 220, 360, 550, 800, 1100, 1500, 2000):**
- +5 max HP (restored to full)
- Player chooses: **+2 STR** or **+2 DEX**
- Prompt shown in message log: "Level up! [S]trength or [D]exterity?"

This choice is the core replayability hook. STR builds hit hard but get hit.
DEX builds hit accurately and dodge, but deal less damage.

---

## Monsters

### Pool

16 monsters per floor (pool of 16 struct slots, reused per floor).

```c
struct Monster {
    unsigned char type;    /* index into monster_type table  */
    unsigned char x, y;    /* position (0,0 = dead/unused)   */
    unsigned char hp;      /* current HP                     */
    unsigned char state;   /* IDLE=0, CHASE=1, FLEE=2        */
    unsigned char seen;    /* has ever been in player's FOV  */
};
```

### Monster Types (12 total)

| # | Glyph | Name         | HP  | STR | DEX | XP  | Color      | First Floor |
|---|-------|--------------|-----|-----|-----|-----|------------|-------------|
| 0 | r     | Rat          |  4  |  1  |  5  |  5  | 9  (red)   | 1           |
| 1 | k     | Kobold       |  6  |  2  |  4  |  8  | 2  (green) | 1           |
| 2 | g     | Goblin       |  8  |  3  |  4  | 12  | 10 (lt grn)| 2           |
| 3 | b     | Giant Bat    |  6  |  2  |  6  | 10  | 8  (gray)  | 2           |
| 4 | o     | Orc          | 12  |  4  |  3  | 18  | 6  (brown) | 3           |
| 5 | s     | Skeleton     | 10  |  3  |  2  | 15  | 15 (white) | 3           |
| 6 | O     | Orc Warrior  | 18  |  6  |  4  | 30  | 14 (yellow)| 4           |
| 7 | T     | Troll        | 24  |  7  |  2  | 40  | 2  (green) | 4           |
| 8 | G     | Ogre         | 28  |  8  |  2  | 55  | 8  (gray)  | 5           |
| 9 | V     | Vampire      | 20  |  6  |  6  | 60  | 5  (purple)| 5           |
|10 | D     | Demon        | 30  |  9  |  5  | 80  | 9  (red)   | 7           |
|11 | L     | Lich         | 25  |  8  |  7  | 90  | 15 (white) | 7           |

**Floor 10 only:** The Dragon (BOSS) — HP 60, STR 14, DEX 4, XP 500, color 9.
Guards the Amulet of Descent. One per floor 10 map.

### Spawn Table

On floor generation, roll `floor_number + 2` monsters (max 16).
Randomly select from types with `min_floor <= current_floor`.
Each monster is placed in a random room that doesn't contain the player or stairs.

### Monster AI

Each monster takes one turn per player turn (simultaneous resolution, player first).

**IDLE:** Monster has not seen the player yet.
- Each turn: 30% chance to move one step in a random valid direction.
- On player entry to FOV range (radius 8): switch to CHASE.
  Print: `"The [name] notices you!"`

**CHASE:** Monster is pursuing the player.
- Move one step toward player each turn (greedy: reduce larger of |dx|, |dy|).
- If player is adjacent: attack instead of moving.
- If player leaves FOV for 5+ consecutive turns: return to IDLE.
- At HP < 25% of max: switch to FLEE.

**FLEE:** Monster is running away.
- Move one step away from player each turn (reverse of chase logic).
- If cornered (no valid flee direction): attack instead.
- At HP > 50% (healed by some mechanic): return to CHASE.

Monsters do **not** path through each other or the player. They queue up
in corridors, which creates natural tactical chokepoint situations.

Monsters do **not** open doors. This gives the player a safe retreat mechanic.

---

## Items & Inventory

### Inventory

8 item slots. Items are picked up by walking over them (`g` to grab, or
auto-pickup for gold).

Display: inventory shown on `i` keypress — replaces message log temporarily,
showing 8 slots with item names and equipped markers.

### Item Types

**Weapons (6):**
| Name        | Damage bonus | Tile color |
|-------------|-------------|------------|
| Dagger      | +0          | 11 (cyan)  |
| Short Sword | +2          | 11 (cyan)  |
| Sword       | +4          | 11 (cyan)  |
| Battle Axe  | +6          | 11 (cyan)  |
| Spear       | +3          | 11 (cyan)  |
| Mace        | +3          | 11 (cyan)  |

**Armors (4):**
| Name         | Defense | Tile color |
|--------------|---------|------------|
| Leather      | 1       | 6 (brown)  |
| Scale Mail   | 2       | 6 (brown)  |
| Chain Mail   | 3       | 6 (brown)  |
| Plate Armour | 5       | 6 (brown)  |

**Potions (5 types, color-coded per run):**
At run start, shuffle 5 colors (red, blue, green, purple, yellow) among 5
potion effects. Player sees "red potion" until they drink it — then it's
identified for the rest of the run.

| Effect        | Description                       |
|---------------|-----------------------------------|
| Heal          | Restore 10 HP                     |
| Heal+         | Restore full HP                   |
| Strength      | +2 STR permanently                |
| Agility       | +2 DEX permanently                |
| Poison        | Lose 8 HP (cursed!)               |

**Scrolls (4 types, labeled with nonsense words per run):**
Same identification mechanic as potions.

| Effect        | Description                                  |
|---------------|----------------------------------------------|
| Identify      | Identifies one item of your choice           |
| Teleport      | Random teleport to any floor tile            |
| Magic Map     | Reveals full floor map (explored = all)      |
| Blink         | Short-range random teleport (3–5 tiles)      |

**Gold:** Auto-picked up. Amounts: 5, 10, 25, 50, 100.

### Spawn Table (per floor)

- 2–3 weapons (scaled to floor: floor 1 only daggers/short swords, etc.)
- 1–2 armors
- 2–4 potions
- 1–2 scrolls
- 3–6 gold piles

---

## Combat

Turn order: **player moves/acts first, then all monsters act**.

### Player Attacks (bump into monster)

```
to_hit  = d8 + player.dex - monster.dex
          (d8 is 1-8 random)
hit     = (to_hit >= 5)

damage  = d6 + player.str + weapon_bonus - 0
          (minimum 1, no monster armor for simplicity — they just have HP)
```

Monster dies at HP ≤ 0. Grants XP. Prints: `"You kill the [name]!"`

### Monster Attacks (monster adjacent to player)

```
to_hit  = d8 + monster.str - player.dex
hit     = (to_hit >= 5)

damage  = d6 + monster.str - player_armor_defense
          (minimum 1)
```

Player dies at HP ≤ 0. Prints: `"The [name] kills you!"` then GAME OVER screen.

### Message Format

Every attack prints one line:
- `"You hit the rat (3)."`    ← damage in parens
- `"You miss the troll."`
- `"The orc hits you (5)."`
- `"The goblin misses."`

This is the DCSS standard — always transparent about what happened and why.

### Sound

| Event           | Tone                                     |
|-----------------|------------------------------------------|
| Player hits     | CH1: short square wave, mid frequency    |
| Player misses   | CH1: very short low tone                 |
| Player is hit   | CH1: short buzz, lower frequency         |
| Monster dies    | CH1: descending two-note tone            |
| Player levels   | CH1+CH2: ascending chord                 |
| Item picked up  | CH1: soft high ping                      |
| Stairs taken    | CH1: two-note descend                    |
| Player dies     | All channels: somber falling tone        |

---

## Controls

| Key       | Action                                 |
|-----------|----------------------------------------|
| WASD      | Move / attack (bump)                   |
| `g`       | Pick up item at current tile           |
| `i`       | Open inventory                         |
| `e`       | Equip item (from inventory)            |
| `u`       | Use item / drink potion / read scroll  |
| `d`       | Drop item                              |
| `>` or `e`| Descend stairs (when standing on them) |
| `<`       | Ascend stairs (when standing on them)  |
| `m`       | Review message log (last 8 messages)   |
| `?`       | Help screen (keybindings)              |
| Ctrl-C    | Quit                                   |

---

## Win Condition

The **Amulet of Descent** is found on floor 10 (guarded by the Dragon).
Once picked up:
- Message: `"You grasp the Amulet. Now escape with your life!"`
- Stairs up become usable on all floors.
- The dungeon starts becoming more dangerous (more monsters spawn in cleared rooms — not implemented in v1, but the narrative tension is there).

Reaching floor 1's up-stair with the Amulet triggers the win screen.

**Win screen:**
- Mode 3 cleared, text printed via IO_PUTCHAR
- Shows: "YOU WIN!", floor reached, gold collected, monsters killed, turns taken
- Waits for keypress, then returns to dungeon start screen

---

## Floors & Difficulty Scaling

| Floor | Monsters | Monster pool expands to include... | Extra features      |
|-------|----------|-------------------------------------|---------------------|
| 1     | 3        | Rat, Kobold                         | —                   |
| 2     | 4        | + Goblin, Giant Bat                 | —                   |
| 3     | 5        | + Orc, Skeleton                     | Water tiles appear  |
| 4     | 6        | + Orc Warrior, Troll                | —                   |
| 5     | 7        | + Ogre, Vampire                     | More rooms          |
| 6     | 8        | (same)                              | —                   |
| 7     | 9        | + Demon, Lich                       | —                   |
| 8     | 10       | (same)                              | —                   |
| 9     | 11       | (same)                              | —                   |
| 10    | 12 + Dragon | (same)                           | Dragon guards Amulet|

**Item quality scaling:** Weapons and armors spawned on deeper floors trend
toward higher-tier versions (weighted random — floor 7 can still spawn a
dagger, but rarely).

---

## Implementation Phases

### Phase 1 — Foundation (session 1)
- [ ] Map struct + BSP generator (rooms, corridors)
- [ ] Viewport renderer (4×4 tile drawing, 24×20 scrolling view)
- [ ] FOV: symmetric shadowcasting (8 octants, radius 8)
- [ ] Explored bitmap (dims tiles after leaving FOV)
- [ ] Player movement (WASD), wall collision
- [ ] Separator line + blank status panel + blank message log areas

**Milestone:** Walk around a generated dungeon. See walls reveal as you explore.

### Phase 2 — Text & Stats (session 2)
- [ ] 4×8 pixel font (uppercase A–Z, 0–9, punctuation)
- [ ] `draw_text(x, y, color, str)` routine
- [ ] Status panel rendering (HP, LV, STR, DEX, XP, Gold, Floor, Weapon, Armor)
- [ ] Message log (2-line rolling, `add_message(str)`)
- [ ] Stairs (generation, descend action, floor counter)

**Milestone:** Full HUD. Can descend floors. Stats displayed.

### Phase 3 — Combat (session 3)
- [ ] Monster struct + spawn table per floor
- [ ] Monster rendering (colored tiles, visible only in FOV)
- [ ] AI: IDLE wander, CHASE toward player, FLEE at low HP
- [ ] Turn system (player acts, then all monsters act)
- [ ] Bump-to-attack combat (hit/miss/damage formula)
- [ ] XP gain + level-up prompt (stat choice)
- [ ] Death screen
- [ ] Sound for combat events

**Milestone:** Complete game loop. Permadeath working. Can win by surviving.

### Phase 4 — Items (session 4)
- [ ] Item structs + spawn per floor
- [ ] Item rendering on map
- [ ] `g` to pick up; inventory system (8 slots)
- [ ] `e` equip weapon/armor; stat recalculation
- [ ] Potions: randomized colors, identify on use
- [ ] Scrolls: randomized names, identify on read
- [ ] Gold: auto-pickup, display in status
- [ ] Inventory screen (`i` key)

**Milestone:** Full item loop. Interesting decisions on every floor.

### Phase 5 — Win Condition & Polish (session 5)
- [ ] Amulet of Descent (floor 10 special item, Dragon guard)
- [ ] Win screen (score, stats, gold)
- [ ] Game over screen with cause of death
- [ ] Score calculation (gold + depth + monsters killed + turns survived)
- [ ] Help screen (`?`)
- [ ] Message log review (`m`)
- [ ] Tuning pass (balance monster HP/damage, item frequency, difficulty curve)

**Milestone:** Complete, shippable game.

### Stretch Goals (future)
- [ ] Status effects: poison (lose 1 HP/turn), confused (random movement)
- [ ] Special rooms: treasure vault (locked door, lots of gold/items), monster den
- [ ] Shops: spend gold for identified items (one shop per floor 3+)
- [ ] God system (simplified): altar on floor 5, sacrifice kills for power
- [ ] Two character classes at start: Fighter (STR focus) vs Rogue (DEX focus)
- [ ] Spells: scroll of Fire, Ice, Lightning (damage variants)
- [ ] Ranged weapons: bow + arrows
- [ ] Doors: monsters can't open them (tactical retreat mechanic)
- [ ] Message log persists between floors

---

## Memory Budget

```
Map tile data:       48 × 40 × 1 byte   = 1,920 bytes
FOV bitmap:          1920 / 8            =   240 bytes
Explored bitmap:     1920 / 8            =   240 bytes
Monsters:            16 × 6 bytes        =    96 bytes
Items on floor:      24 × 4 bytes        =    96 bytes
Inventory:           8 × 1 byte          =     8 bytes
Player struct:                           =    16 bytes
Message buffers:     2 × 33 bytes        =    66 bytes
Pixel font:          48 × 8 bytes        =   384 bytes
Monster type table:  12 × 10 bytes       =   120 bytes
BSP tree (temp):     32 × 8 bytes        =   256 bytes (generation only)
                                         ─────────────
Total data:                              ~ 3.4 KB

Estimated code:                          ~ 6–8 KB
Total:                                   ~ 10–12 KB (of 31 KB available)
Headroom:                                ~ 19 KB
```

---

## Technical Notes

- **Only one floor in RAM.** New floor generated on descent. No save-state.
- **BSP on 6502:** Recursive BSP with depth limit 5 uses ~40 bytes of stack per
  level = ~200 bytes stack during generation. Well within $0100–$01FF.
- **FOV per turn:** Shadowcasting 8 octants, radius 8. Clears fov_map, then
  marks visible tiles. ~200 tile checks per turn — fast enough.
- **Turn loop:** Player input → player action → all monster actions → redraw
  changed tiles only (dirty-flag approach). Full redraws only on floor change
  or magic map scroll.
- **Item identification:** At run start, shuffle a fixed array of
  5 potion colors and 4 scroll labels. These indices are stored in two 5-byte
  and 4-byte arrays. Identified flags are 1 bit each (1 byte suffices for each).
- **RNG:** Same xorshift16 from Snake. Seeded differently each run (from a
  frame counter tick at the title screen — player input timing provides entropy).
- **cc65 zero page:** cc65 uses $00–$1F for its own ZP variables. Our game ZP
  variables start at $20. Available ZP: $20–$EF = 208 bytes.
  Candidates for ZP: player x/y, viewport origin, current FOV calculation
  variables (heavily accessed per turn).
