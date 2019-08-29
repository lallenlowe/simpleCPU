'use strict';

const { writeBus } = require('../bus');

const interfaceRegister = ({ bus, register, read, write }) => {
  if (read) {
    const newBus = writeBus({ bus, address: 0, data: register });
    return { bus: newBus, register };
  }

  if (write) {
    return { bus, register: bus.data.output };
  }

  return { bus, register };
};

const interfaceAllCPURegisters = ({
  bus,
  registers /* take command for setting read and write flags */,
}) => {
  const cpuRegisters = { ...registers };
  let mainBus = { ...bus };
  ({ bus: mainBus, register: cpuRegisters.x } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.x,
    read: false,
    write: false,
  }));

  ({ bus: mainBus, register: cpuRegisters.y } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.y,
    read: false,
    write: false,
  }));

  ({ bus: mainBus, register: cpuRegisters.a } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.a,
    read: false,
    write: false,
  }));

  // TODO: is this needed?
  ({ bus: mainBus, register: cpuRegisters.pc } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.pc,
    read: false,
    write: false,
  }));

  ({ bus: mainBus, register: cpuRegisters.sp } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.sp,
    read: false,
    write: false,
  }));

  return { bus: mainBus, registers: cpuRegisters };
};

// return true or false for given flag
const getStatusFlag = (statusRegister, flagMap, flag) => {
  const flagValue = statusRegister & flagMap[flag];
  return flagValue > 0;
};

// return a new statusRegister
const setStatusFlag = ({ statusRegister, flagMap, flag, value }) => {
  if (value) {
    return statusRegister | flagMap[flag];
  }

  const inverseFlagMap = ~flagMap[flag];
  return statusRegister & inverseFlagMap;
};

module.exports = {
  interfaceRegister,
  interfaceAllCPURegisters,
  getStatusFlag,
  setStatusFlag,
};
