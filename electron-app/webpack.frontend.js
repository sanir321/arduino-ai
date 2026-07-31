const frontend = require('./gen-webpack.config');
const { removeCompressionPlugin } = require('./webpack.base');

const mainWindowConfig = frontend[0];
removeCompressionPlugin(mainWindowConfig);

module.exports = mainWindowConfig;
