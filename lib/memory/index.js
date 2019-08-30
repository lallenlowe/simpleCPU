'use strict';

const { outputToBus } = require('../bus');

const interfaceMemoryData = ({ bus, memory, output, input }) => {
  if (output) {
    const newBus = outputToBus({ bus, address: 0, data: memory.data[memory.addressRegister] });
    return { bus: newBus, memory };
  }

  if (input) {
    const newMemory = { ...memory };
    newMemory[memory.addressRegister] = bus.data;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceMemoryAddress = ({ bus, memory, output, input }) => {
  if (output) {
    const newBus = outputToBus({
      bus,
      address: memory.addressRegister,
      data: 0,
    });
    return { bus: newBus, memory };
  }

  if (input) {
    const newMemory = { ...memory };
    newMemory.addressRegister = bus.address;
    return { bus, memory: newMemory };
  }

  return { bus, memory };
};

const interfaceMemory = ({
  bus,
  memory,
  output,
  input,
  /* take control word to set input/output flags */
}) => {
  let systemMemory = { ...memory };
  let mainBus = { ...bus };

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryAddress({
    bus: mainBus,
    memory: systemMemory,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: TAKE CONTROL CODE
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemoryData({
    bus: mainBus,
    memory: systemMemory,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: TAKE CONTROL CODE
  }));

  return { bus: mainBus, memory: systemMemory };
};

module.exports = {
  interfaceMemory,
  interfaceMemoryData,
  interfaceMemoryAddress,
};
