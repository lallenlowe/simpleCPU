'use strict';

import { Byte } from '../initial-state';

const bin2dec = (bin: string): string => {
  return parseInt(bin, 2).toString(10);
};

const dec2bin = (dec: number): string => {
  return (dec >>> 0).toString(2);
};

const numberToByte = (num: number): Byte => {
  return dec2bin(num)
    .substr(-8)
    .padStart(8, '0')
    .split('')
    .map((bit) => {
      return !!+bit;
    });
};

const byteToNumber = (byte: Byte): number => {
  return parseInt(
    byte
      .map((bit) => {
        return bit ? '1' : '0';
      })
      .join(''),
    2,
  );
};

const getLeastSignificantBits = (num: number, bits: number): number => {
  const bitString = dec2bin(num).slice(-bits);

  return parseInt(bitString, 2);
};

export { bin2dec, dec2bin, numberToByte, byteToNumber, getLeastSignificantBits };
