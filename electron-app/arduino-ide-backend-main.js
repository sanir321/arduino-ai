// @ts-check
'use strict';

if (process.send) {
  const util = require('util');
  for (const name of ['log', 'trace', 'debug', 'info', 'warn', 'error']) {
    console[name] = function () {
      const args = Object.values(arguments);
      const message = util.format(...args);
      process.send?.({ severity: name, message });
    };
  }
}

require('./src-gen/backend/main');
