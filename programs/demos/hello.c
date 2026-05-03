#include "simplecpu.h"

void main(void) {
    unsigned char x, y;

    MODE_REG = 3;

    /* Draw color bars */
    for (y = 0; y < MODE3_H; ++y) {
        for (x = 0; x < MODE3_W; ++x) {
            plot3(x, y, x & 0x0F);
        }
    }

    puts_scpu("Hello from C!\r\n");

    /* Spin with vsync */
    while (1) {
        waitvsync();
    }
}
