const palette: [number, number, number][] = [
  // 0x00–0x0F: CGA/EGA-style primaries
  [0x00, 0x00, 0x00], // 0  black
  [0xaa, 0x00, 0x00], // 1  dark red
  [0x00, 0xaa, 0x00], // 2  dark green
  [0xaa, 0x55, 0x00], // 3  brown/dark yellow
  [0x00, 0x00, 0xaa], // 4  dark blue
  [0xaa, 0x00, 0xaa], // 5  dark magenta
  [0x00, 0xaa, 0xaa], // 6  dark cyan
  [0xaa, 0xaa, 0xaa], // 7  light gray
  [0x55, 0x55, 0x55], // 8  dark gray
  [0xff, 0x55, 0x55], // 9  light red
  [0x55, 0xff, 0x55], // 10 light green
  [0xff, 0xff, 0x55], // 11 yellow
  [0x55, 0x55, 0xff], // 12 light blue
  [0xff, 0x55, 0xff], // 13 light magenta
  [0x55, 0xff, 0xff], // 14 light cyan
  [0xff, 0xff, 0xff], // 15 white

  // 0x10–0xE7: 6×6×6 color cube (216 colors)
  ...(() => {
    const colors: [number, number, number][] = [];
    const levels = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
    for (let r = 0; r < 6; r++)
      for (let g = 0; g < 6; g++)
        for (let b = 0; b < 6; b++)
          colors.push([levels[r], levels[g], levels[b]]);
    return colors;
  })(),

  // 0xE8–0xFF: 24-step grayscale ramp
  ...(() => {
    const colors: [number, number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const v = Math.round((i / 23) * 255);
      colors.push([v, v, v]);
    }
    return colors;
  })(),
];

export { palette };
