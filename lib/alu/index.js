'use strict';

const operate = ({ registers /* controlWord */ }) => {
  const newRegisters = { ...registers };

  newRegisters.a = newRegisters.x + newRegisters.y;

  return newRegisters;
};

module.exports = {
  operate,
};
