const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const typesPath = path.join(root, 'src/renderer/src/features/netease/types.ts');
const servicePath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const topSearchPath = path.join(root, 'src/renderer/ui-next-static/components/TopSearch.js');

const types = fs.readFileSync(typesPath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');
const widget = fs.readFileSync(widgetPath, 'utf8');
const topSearch = fs.readFileSync(topSearchPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/phase\?:\s*'preflight'\s*\|\s*'fetching'\s*\|\s*'writing'\s*\|\s*'refreshing'\s*\|\s*'completed'\s*\|\s*'cancelled'\s*\|\s*'failed'/.test(types), 'migration progress supports explicit lifecycle phases');
expect(/interface NetEaseMigrationControl/.test(types), 'migration control type exists');
expect(/isCancelled\(\): boolean/.test(types), 'migration control exposes cancellation state');

expect(/control\?:\s*NetEaseMigrationControl/.test(service), 'migration service accepts an optional cancellation control');
expect(/private ensureNotCancelled/.test(service), 'migration service checks cancellation at stage boundaries');
expect(/phase:\s*'fetching'/.test(service), 'migration service reports fetching phase');
expect(/phase:\s*'writing'/.test(service), 'migration service reports writing phase');
expect(/phase:\s*'cancelled'/.test(service), 'migration service can return cancelled progress state');
expect(/status:\s*'cancelled'/.test(service), 'migration reports can be marked cancelled or partial-cancelled');

expect(/private assetMigrationCancelRequested = false/.test(widget), 'widget tracks cancel request state');
expect(/ensureAssetMigrationCancelButton/.test(widget), 'widget creates a cancel button for long migrations');
expect(/cancelAssetMigration\(\)/.test(widget), 'widget exposes a cancel action');
expect(/isCancelled:\s*\(\)\s*=>\s*this\.assetMigrationCancelRequested/.test(widget), 'widget passes cancellation control into migration service');
expect(/this\.setAssetMigrationCancelVisible\(true\)/.test(widget), 'widget shows cancel action while migration is running');
expect(/this\.setAssetMigrationCancelVisible\(false\)/.test(widget), 'widget hides cancel action after migration exits');

expect(/migrationRunning \? '\\u67e5\\u770b\\u8fc1\\u79fb\\u8fdb\\u5ea6'/.test(topSearch), 'top-right menu still exposes running state during migration');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase migration progress lifecycle verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase migration progress lifecycle verification passed (${checks.length} checks).`);
