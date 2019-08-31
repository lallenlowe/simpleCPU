'use strict';

const bin2dec = (bin: string): string => {
  return parseInt(bin, 2).toString(10);
};

const dec2bin = (dec: number): string => {
  return (dec >>> 0).toString(2);
};

const getLeastSignificantBits = (num: number, bits: number): number => {
  const bitString = dec2bin(num).slice(-bits);

  return parseInt(bitString, 2);
};

export { bin2dec, dec2bin, getLeastSignificantBits };
