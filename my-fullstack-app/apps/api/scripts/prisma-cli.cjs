// Resolve Prisma from the package dependency tree instead of relying on a
// platform-specific node_modules/.bin shim.
const { spawnSync } = require('node:child_process');

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
