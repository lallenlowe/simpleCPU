'use strict';

const outputToBus = ({ bus, address, data }) => {
  const newBus = { ...bus };
  newBus.address |= address;
  newBus.data |= data;

  return newBus;
};

module.exports = {
  outputToBus,
};
