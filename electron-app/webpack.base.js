// @ts-check
'use strict';

const path = require('node:path');

function resolvePackagePath(target, baseDir = __dirname) {
  const resolvePackageJsonPath = require('resolve-package-path');
  const packageJsonPath = resolvePackageJsonPath(target, baseDir);
  if (!packageJsonPath) {
    throw new Error(
      `Could not resolve package '${target}'. Base dir: ${baseDir}`
    );
  }
  return path.join(packageJsonPath, '..');
}

function removeCompressionPlugin(config) {
  const CompressionPlugin = require('compression-webpack-plugin');
  for (let i = config.plugins?.length || 0; i >= 0; i--) {
    const plugin = config.plugins?.[i];
    if (plugin instanceof CompressionPlugin) {
      config.plugins?.splice(i, 1);
    }
  }
}

module.exports = {
  removeCompressionPlugin,
};
