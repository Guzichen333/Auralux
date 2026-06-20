const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const widget = fs.readFileSync(widgetPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/private lastAssetMigrationProgressRenderAt = 0/.test(widget), 'widget tracks last migration progress render time');
expect(/private pendingAssetMigrationProgressMessage = ''/.test(widget), 'widget stores pending migration progress message');
expect(/private pendingAssetMigrationProgressStatusText = ''/.test(widget), 'widget stores pending migration progress status text');
expect(/private assetMigrationProgressFlushTimer: number \| null = null/.test(widget), 'widget stores a pending progress flush timer');
expect(/private readonly assetMigrationProgressMinIntervalMs = 250/.test(widget), 'widget defines a bounded progress render interval');
expect(/options: \{force\?: boolean; statusText\?: string\} = \{\}/.test(widget), 'progress renderer accepts force and status text options');
expect(/if \(!options\.force && message && now - this\.lastAssetMigrationProgressRenderAt < this\.assetMigrationProgressMinIntervalMs\)/.test(widget), 'progress renderer throttles frequent non-forced messages');
expect(/this\.pendingAssetMigrationProgressMessage = message/.test(widget), 'progress renderer saves latest throttled message');
expect(/this\.assetMigrationProgressFlushTimer = window\.setTimeout/.test(widget), 'progress renderer schedules a delayed flush');
expect(/this\.flushAssetMigrationProgress/.test(widget), 'widget has a progress flush path');
expect(/private flushAssetMigrationProgress\(\): void/.test(widget), 'widget defines progress flush method');
expect(/this\.renderAssetMigrationProgress\(message, \{force: true/.test(widget), 'important migration states force immediate rendering');
expect(/statusText: `\$\{assetMigrationProgress\.label\} \$\{assetMigrationProgress\.current\}\/\$\{assetMigrationProgress\.total\}`/.test(widget), 'migration progress status text is routed through throttled renderer');
expect(!/this\.importStatus\.textContent = `\$\{assetMigrationProgress\.label\} \$\{assetMigrationProgress\.current\}\/\$\{assetMigrationProgress\.total\}`/.test(widget), 'progress callback no longer writes import status directly for every track');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase asset migration progress throttle verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase asset migration progress throttle verification passed (${checks.length} checks).`);
