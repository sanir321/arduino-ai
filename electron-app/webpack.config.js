const path = require('node:path');
const frontend = require('./gen-webpack.config');
const backend = require('./gen-webpack.node.config');
const {
  removeCompressionPlugin,
} = require('./webpack.base');

const mainWindowConfig = frontend[0];
const preloadConfig = frontend[2];

backend.config.optimization.splitChunks = false;
backend.config.optimization.concatenateModules = true;

removeCompressionPlugin(mainWindowConfig);
removeCompressionPlugin(preloadConfig);

module.exports = [mainWindowConfig, preloadConfig, backend.config];
