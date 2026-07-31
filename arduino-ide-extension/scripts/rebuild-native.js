// @ts-check
/**
 * Rebuilds native Node.js addons required by the Arduino IDE tests.
 */
const { execSync } = require('child_process');
const path = require('path');

const modules = ['drivelist'];

for (const mod of modules) {
  const modPath = path.join(__dirname, '..', 'node_modules', mod);
  const buildPath = path.join(modPath, 'build', 'Release', `${mod}.node`);
  if (require('fs').existsSync(buildPath)) {
    console.log(`[rebuild-native] ${mod} already built, skipping.`);
    continue;
  }
  console.log(`[rebuild-native] Building ${mod}...`);
  try {
    execSync(`npx node-gyp rebuild --directory="${modPath}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log(`[rebuild-native] ${mod} built successfully.`);
  } catch (err) {
    console.warn(`[rebuild-native] Failed to build ${mod}:`, err.message);
  }
}
