const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bootstrap = fs.readFileSync(path.join(root, 'src/renderer/src/ui-next/bootstrap.ts'), 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(
  /function renderStartupError\(error: unknown,\s*onEnterLocalMode: \(\) => void\): void/.test(bootstrap),
  'startup error renderer accepts a local-mode enter callback'
);
expect(
  /mb-startup-error__skip/.test(bootstrap),
  'startup error screen renders a top-right skip button'
);
expect(
  /进入本地模式/.test(bootstrap),
  'skip button copy clearly enters local mode'
);
expect(
  /data-startup-enter-local/.test(bootstrap),
  'skip button has a stable selector'
);
expect(
  bootstrap.includes("querySelector<HTMLButtonElement>('[data-startup-enter-local]')"),
  'startup error screen binds the skip button by stable selector'
);
expect(
  /enterLocalModeFromStartupError/.test(bootstrap),
  'bootstrap exposes a dedicated local-mode entry path after startup API failure'
);
expect(
  /mountUINext\(\{skipStartupWarmup: true\}\)/.test(bootstrap),
  'local-mode entry skips the failed startup warmup gate'
);
expect(
  /let startupLocalModeRequested = false;/.test(bootstrap),
  'local-mode entry is guarded against duplicate clicks'
);
expect(
  /async function mountUINext\(options: \{skipStartupWarmup\?: boolean\} = \{\}\): Promise<void>/.test(bootstrap),
  'mountUINext supports an explicit startup-warmup bypass option'
);
expect(
  /const warmup = options\.skipStartupWarmup/.test(bootstrap),
  'mountUINext bypasses warmup only for the explicit local-mode path'
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('Startup API failure manual enter verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`Startup API failure manual enter verification passed (${checks.length} checks).`);
