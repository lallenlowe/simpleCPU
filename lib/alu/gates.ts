'use strict';

import { Byte } from '../initial-state';

const and = (a: boolean, b: boolean) => {
  return a && b;
};

const or = (a: boolean, b: boolean) => {
  return a || b;
};

const xor = (a: boolean, b: boolean) => {
  if (and(a, b)) {
    return false;
  }
  if (or(a, b)) {
    return true;
  }
  return false;
};

const fullAdder = (a: boolean, b: boolean, c: boolean) => {
  return {
    c: or(and(xor(a, b), c), and(a, b)), // carry
    s: xor(xor(a, b), c), // sum
  };
};

const byteAdder = (a: Byte, b: Byte, c: boolean) => {
  const { c: c1, s: s0 } = fullAdder(a[7], b[7], c);
  const { c: c2, s: s1 } = fullAdder(a[6], b[6], c1);
  const { c: c3, s: s2 } = fullAdder(a[5], b[5], c2);
  const { c: c4, s: s3 } = fullAdder(a[4], b[4], c3);
  const { c: c5, s: s4 } = fullAdder(a[3], b[3], c4);
  const { c: c6, s: s5 } = fullAdder(a[2], b[2], c5);
  const { c: c7, s: s6 } = fullAdder(a[1], b[1], c6);
  const { c: carry, s: s7 } = fullAdder(a[0], b[0], c7);

  const sum: Byte = [s7, s6, s5, s4, s3, s2, s1, s0];
  const overflow = xor(c7, carry);

  return { sum, carry, overflow };
};

export { and, or, xor, fullAdder, byteAdder };
