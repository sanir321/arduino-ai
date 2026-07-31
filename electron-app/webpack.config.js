const path = require('node:path');
const frontend = require('./gen-webpack.config');
const backend = require('./gen-webpack.node.config');
const {
  removeCompressionPlugin,
} = require('./webpack.base');

const mainWindowConfig = frontend[0];
const preloadConfig = frontend[2];

mainWindowConfig.resolve = mainWindowConfig.resolve || {};
mainWindowConfig.resolve.fallback = {
  ...mainWindowConfig.resolve.fallback,
  'fs': false,
  'module': false,
};

backend.config.optimization.splitChunks = false;
backend.config.optimization.concatenateModules = true;

removeCompressionPlugin(mainWindowConfig);
removeCompressionPlugin(preloadConfig);

module.exports = [mainWindowConfig, preloadConfig, backend.config];
