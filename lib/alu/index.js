'use strict';

// This is a stand in for a real ALU I'll write later
const operate = ({ registers /* controlWord */ }) => {
  const newRegisters = { ...registers };

  newRegisters.a = newRegisters.x + newRegisters.y;

  return newRegisters;
};

module.exports = {
  operate,
};
