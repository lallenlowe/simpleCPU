'use strict';

const and = (a: number, b: number) => a & b;

const or = (a: number, b: number) => a | b;

const xor = (a: number, b: number) => a ^ b;

const fullAdder = (a: number, b: number, c: number) => ({
  s: a ^ b ^ c,
  c: (a & b) | ((a ^ b) & c),
});

const bit = (v: number, n: number) => (v >> n) & 1;

const byteAdder = (a: number, b: number, c: number) => {
  const r0 = fullAdder(bit(a, 0), bit(b, 0), c);
  const r1 = fullAdder(bit(a, 1), bit(b, 1), r0.c);
  const r2 = fullAdder(bit(a, 2), bit(b, 2), r1.c);
  const r3 = fullAdder(bit(a, 3), bit(b, 3), r2.c);
  const r4 = fullAdder(bit(a, 4), bit(b, 4), r3.c);
  const r5 = fullAdder(bit(a, 5), bit(b, 5), r4.c);
  const r6 = fullAdder(bit(a, 6), bit(b, 6), r5.c);
  const r7 = fullAdder(bit(a, 7), bit(b, 7), r6.c);

  const sum = r0.s | (r1.s << 1) | (r2.s << 2) | (r3.s << 3) |
              (r4.s << 4) | (r5.s << 5) | (r6.s << 6) | (r7.s << 7);

  const overflow = xor(r6.c, r7.c);

  return { sum, carry: r7.c, overflow };
};

const byteAnd = (a: number, b: number) => a & b;

const byteOr = (a: number, b: number) => a | b;

const byteXor = (a: number, b: number) => a ^ b;

const byteNot = (a: number) => (~a) & 0xFF;

const byteShiftLeft = (a: number) => ({
  result: (a << 1) & 0xFF,
  carry: bit(a, 7),
});

const byteShiftRight = (a: number) => ({
  result: (a >> 1) & 0x7F,
  carry: bit(a, 0),
});

const byteRotateLeft = (a: number, carry: number) => ({
  result: ((a << 1) | carry) & 0xFF,
  carry: bit(a, 7),
});

const byteRotateRight = (a: number, carry: number) => ({
  result: ((a >> 1) | (carry << 7)) & 0xFF,
  carry: bit(a, 0),
});

export {
  and, or, xor, fullAdder, byteAdder,
  byteAnd, byteOr, byteXor, byteNot,
  byteShiftLeft, byteShiftRight, byteRotateLeft, byteRotateRight,
};
