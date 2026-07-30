// @ts-check
/**
 * Patches @theia/core JSDOM for Node.js 18+ compatibility.
 * global.navigator became a getter-only property in Node.js 18+.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@theia',
  'core',
  'lib',
  'browser',
  'test',
  'jsdom.js'
);

if (!fs.existsSync(target)) {
  console.warn('[patch-jsdom] File not found:', target);
  process.exit(0);
}

const content = fs.readFileSync(target, 'utf8');

if (content.includes("Object.defineProperty(global, 'navigator'")) {
  console.log('[patch-jsdom] Already patched, skipping.');
  process.exit(0);
}

const patched = content.replace(
  "global['navigator'] = { userAgent: 'node.js', platform: 'Mac' };",
  `Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'node.js', platform: 'Mac' },
        configurable: true,
        writable: true,
        enumerable: true,
    });`
);

fs.writeFileSync(target, patched, 'utf8');
console.log('[patch-jsdom] Patched successfully.');
