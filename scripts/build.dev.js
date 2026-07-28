/** Build script for development — compiles extension then runs webpack */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

function run(cmd, cwd) {
    console.log(`[${path.basename(cwd)}] $ ${cmd}`);
    execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '' } });
}

// 1. Generate Theia source files
console.log('\n=== Generating source files ===');
run('node node_modules/@theia/application-manager/lib/generator/index.js', root);

// 2. Compile arduino-ide-extension
console.log('\n=== Compiling arduino-ide-extension ===');
run('node node_modules/typescript/bin/tsc --noEmitOnError false --project arduino-ide-extension/tsconfig.json', root);

// 3. Copy index.html
console.log('\n=== Copying frontend assets ===');
const srcGen = path.join(root, 'electron-app', 'src-gen', 'frontend');
const libDir = path.join(root, 'electron-app', 'lib', 'frontend');
fs.mkdirSync(libDir, { recursive: true });
fs.copyFileSync(path.join(srcGen, 'index.html'), path.join(libDir, 'index.html'));
fs.copyFileSync(path.join(srcGen, 'secondary-window.html'), path.join(libDir, 'secondary-window.html'));

// 4. Webpack
console.log('\n=== Running webpack ===');
run('node node_modules/webpack/bin/webpack.js --config electron-app/gen-webpack.config.js --mode development', root);

console.log('\n=== Build complete ===');
