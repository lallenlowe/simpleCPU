'use strict';

const { writeBus } = require('../bus');

const interfaceMemory = ({ bus, memory, read, write }) => {
  if (read) {
    const newBus = writeBus({ bus, address: 0, data: memory[bus.address.output] });
    return { bus: newBus, memory };
  }

  if (write) {
    const newMemory = [...memory];
    newMemory[bus.address.output] = bus.data.output;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

module.exports = {
  interfaceMemory,
};
