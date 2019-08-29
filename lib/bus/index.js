'use strict';

const writeBus = ({ bus, address, data }) => {
  const newBus = { ...bus };
  newBus.address.input |= address;
  newBus.data.input |= data;

  return newBus;
};

const interfaceBus = ({ bus, readAddress, readData }) => {
  const newBus = { ...bus };
  if (readAddress) {
    newBus.address.output = newBus.address.input;
  }

  if (readData) {
    newBus.data.output = newBus.data.input;
  }

  return newBus;
};

module.exports = {
  writeBus,
  interfaceBus,
};
