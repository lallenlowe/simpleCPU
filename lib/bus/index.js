'use strict';

const { setupBus } = require('../initial-state');

const outputToBus = ({ bus, data }) => {
  const newBus = { ...bus };
  newBus.data |= data;

  return newBus;
};

const clearBus = setupBus;

module.exports = {
  outputToBus,
  clearBus,
};
