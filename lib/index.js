'use strict';

const machine = require('./initial-state');
const { interfaceMemory } = require('./memory');
const { interfaceAllCPURegisters } = require('./register');
const alu = require('./alu');

const cycle = (machineState) => {
  let { cpuRegisters, mainBus, systemMemory } = machineState;

  /* Output pass first since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: true,
    input: false,
    /* pass control word for setting input/output flags */
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
    /* pass control word for setting input/output flags */
  }));

  /* Input pass next since real hardware is parallel and this is synchronous */
  ({ bus: mainBus, registers: cpuRegisters } = interfaceAllCPURegisters({
    bus: mainBus,
    registers: cpuRegisters,
    output: false,
    input: true,
    /* pass control word for setting input/output flags */
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
    /* pass control word for setting input/output flags */
  }));

  cpuRegisters = alu.operate({ registers: cpuRegisters /* control word */ });

  cpuRegisters.pc++; // increment the program counter

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
