'use strict';

const { outputToBus } = require('../bus');

const interfaceRegister = ({ bus, register, output, input }) => {
  if (output) {
    const newBus = outputToBus({ bus, address: 0, data: register });
    return { bus: newBus, register };
  }

  if (input) {
    return { bus, register: bus.data };
  }

  return { bus, register };
};

const interfaceAllCPURegisters = ({
  bus,
  registers,
  output,
  input,
  /* take command for setting read and write flags */
}) => {
  const cpuRegisters = { ...registers };
  let mainBus = { ...bus };
  ({ bus: mainBus, register: cpuRegisters.x } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.x,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: TAKE CONTROL CODE
  }));

  ({ bus: mainBus, register: cpuRegisters.y } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.y,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: TAKE CONTROL CODE
  }));

  ({ bus: mainBus, register: cpuRegisters.a } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.a,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: ALWAYS FALSE, a REGISTER IS WRITTEN TO DIRECTLY BY ALU
  }));

  ({ bus: mainBus, register: cpuRegisters.pc } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.pc,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: REASERCH! NOT SURE IF WE NEED TO BE ABLE TO INPUT BUS VALUE TO PROGRAM COUNTER REGISTER
  }));

  ({ bus: mainBus, register: cpuRegisters.sp } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.sp,
    output: output & false, // TODO: TAKE CONTROL CODE
    input: input & false, // TODO: TAKE CONTROL CODE
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
