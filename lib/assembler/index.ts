'use strict';

import * as fs from 'fs';
import { instructionMap } from '../control';

const loadAssemblyFile = (path: string): string[][] => {
  const file = fs.readFileSync(path, { encoding: 'utf8' });
  const lines = file.split('\n');

  return lines.map((line) => {
    return line.split(' ');
  });
};

const decimalToHex = (dec: number, padding: number) => {
  var hex = Number(dec).toString(16);

  while (hex.length < padding) {
    hex = '0' + hex;
  }

  return hex;
};

const buildHex = (instructions: string[][]) => {
  const hexArray = instructions.map((line) => {
    if (line.length === 3) {
      const index = decimalToHex(parseInt(line[0], 16), 4);
      const cmd = decimalToHex(instructionMap[line[1]], 2);
      const addr = decimalToHex(parseInt(line[2]), 4);
      return `${index}${cmd}${addr}`;
    }
    const index = decimalToHex(parseInt(line[0], 16), 4);
    const addr = decimalToHex(parseInt(line[1]), 6);
    return `${index}${addr}`;
  });

  return hexArray.join('');
};

const assemble = (inputPath: string, outputPath: string) => {
  const commandLines = loadAssemblyFile(inputPath);
  const hexString = buildHex(commandLines);
  console.log(hexString);

  fs.writeFileSync(outputPath, hexString, { encoding: 'hex' });
};

assemble('testing.s', 'testing.bin');
