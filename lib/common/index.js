'use strict';

const bin2dec = (bin) => {
    return parseInt(bin, 2).toString(10);
};

const dec2bin = (dec) => {
    return (dec >>> 0).toString(2);
};

module.exports = {
    bin2dec,
    dec2bin,
};
