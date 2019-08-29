'use strict';

const { bin2dec, dec2bin } = require('./lib/common');
const machine = require('./lib');

/* ##################################################################### */

const testing = () => {
  const cpuRegisters = { ...machine.cpuRegisters };
  const statusFlagMap = { ...machine.statusFlagMap };
  const mainBus = { ...machine.mainBus };
  const systemMemory = [...machine.systemMemory];

  cpuRegisters.status = machine.setStatusFlag({
    statusRegister: cpuRegisters.status,
    flagMap: statusFlagMap,
    flag: 'Z',
    value: true,
  });

  console.log(machine.getStatusFlag(cpuRegisters.status, statusFlagMap, 'Z'));

  cpuRegisters.status = machine.setStatusFlag({
    statusRegister: cpuRegisters.status,
    flagMap: statusFlagMap,
    flag: 'C',
    value: true,
  });

  cpuRegisters.status = machine.setStatusFlag({
    statusRegister: cpuRegisters.status,
    flagMap: statusFlagMap,
    flag: 'B',
    value: true,
  });

  cpuRegisters.status = machine.setStatusFlag({
    statusRegister: cpuRegisters.status,
    flagMap: statusFlagMap,
    flag: 'B',
    value: false,
  });

  console.log(machine.getStatusFlag(cpuRegisters.status, statusFlagMap, 'C'));

  console.log(dec2bin(cpuRegisters.status));

  const { bus, memory } = machine.interfaceMemory({
    bus: mainBus,
    memory: systemMemory,
    read: false,
    write: true,
  });

  const { bus: newBus, memory: newMemory } = machine.interfaceMemory({
    bus,
    memory,
    read: true,
    write: false,
  });

  console.log(newBus, newMemory);
}

testing();
