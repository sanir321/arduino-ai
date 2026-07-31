const path = require('node:path');
const configs = require('./webpack.config');
const [mainWindowConfig, preloadConfig] = configs;

module.exports = [mainWindowConfig, preloadConfig];
