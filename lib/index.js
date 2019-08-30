'use strict';

const machine = require('./initial-state');
const { interfaceMemory } = require('./memory');
const { interfaceAllCPURegisters } = require('./register');
const { interfaceBus } = require('./bus');

const cycle = (machineState /* take command for setting read and write flags */) => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;

  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters /* pass command for setting read write flags */,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    read: false,
    write: false,
  }));

  mainBus = interfaceBus({ bus: mainBus, readAddress: false, readData: false });

  cpuRegisters.pc++;

  const newMachineState = { cpuRegisters, mainBus, systemMemory };
  setImmediate(() => cycle(newMachineState));
  if (cpuRegisters.pc % 10000 === 0) {
    console.log(newMachineState);
  }
};

/* ##################################################################### */

const start = () => {
  const cpuRegisters = machine.setupCpuRegisters();
  const mainBus = machine.setupBus();
  const systemMemory = machine.setupMemory();

  cycle({ cpuRegisters, mainBus, systemMemory });
};

module.exports = {
  start,
};
