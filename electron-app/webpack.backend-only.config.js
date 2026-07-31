const backend = require('./gen-webpack.node.config');

backend.config.optimization.splitChunks = false;
backend.config.optimization.concatenateModules = true;

module.exports = [backend.config];
