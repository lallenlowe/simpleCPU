'use strict';

const { dec2bin } = require('../lib/common');
const machine = require('../lib/initial-state');
const { interfaceMemory } = require('../lib/memory');
const { setStatusFlag, getStatusFlag, interfaceRegister } = require('../lib/register');

const test = () => {
  const cpuRegisters = machine.setupCpuRegisters();
  const statusFlagMap = machine.getStatusFlagMap();
  let mainBus = machine.setupBus();
  let systemMemory = machine.setupMemory();

  cpuRegisters.status = setStatusFlag({
    statusRegister: cpuRegisters.status,
    flagMap: statusFlagMap,
    flag: 'Z',
    value: true,
  });

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: false,
    input: true,
  }));

  ({ bus: mainBus, memory: systemMemory } = interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    output: true,
    input: false,
  }));

  ({ bus: mainBus, register: cpuRegisters.x } = interfaceRegister({
    bus: mainBus,
    register: cpuRegisters.x,
    output: false,
    input: true,
  }));

  console.log(getStatusFlag(cpuRegisters.status, statusFlagMap, 'Z'));
  console.log(dec2bin(cpuRegisters.status));
  console.log(mainBus, systemMemory);
  console.log(cpuRegisters);
};

test();
