const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const servicePath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');

const service = fs.readFileSync(servicePath, 'utf8');
const widget = fs.readFileSync(widgetPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/interface NetEaseMigrationPreflight/.test(service), 'asset migration service defines a preflight summary');
expect(/async prepareMigrationPreflight\(\): Promise<NetEaseMigrationPreflight>/.test(service), 'asset migration service exposes prepareMigrationPreflight');
expect(/const preview = await this\.getMigrationPreview\(\)/.test(service), 'preflight reuses existing migration preview');
expect(/totalTracks:/.test(service), 'preflight reports total track count');
expect(/estimatedPlaylists:/.test(service), 'preflight reports estimated playlist count');
expect(/groups: preview\.groups/.test(service), 'preflight surfaces grouped asset counts');
expect(/preview,/.test(service), 'preflight carries the resolved preview for migration reuse');
expect(/async migratePreview\(preview: NetEaseMigrationPreview, onProgress\?: ProgressHandler\): Promise<MigrationSummary>/.test(service), 'service can migrate an already prepared preview');
expect(/return await this\.migratePreview\(preview, onProgress\)/.test(service), 'migrateAllAssets delegates to prepared-preview migration');

expect(/private pendingAssetMigrationPreview: NetEaseMigrationPreview \| null = null/.test(widget), 'widget stores the pending migration preview');
expect(/private isAssetMigrationRunning = false/.test(widget), 'widget tracks an in-flight asset migration');
expect(/prepareAssetMigrationPreflight/.test(widget), 'widget has a preflight preparation step');
expect(/netEaseAssetMigrationService\.prepareMigrationPreflight\(\)/.test(widget), 'widget asks service for preflight');
expect(/renderAssetMigrationPreflight/.test(widget), 'widget renders a migration preflight summary');
expect(/this\.pendingAssetMigrationPreview = preflight\.preview/.test(widget), 'widget caches preview from preflight');
expect(/window\.confirm/.test(widget), 'widget asks for confirmation before full migration');
expect(/migratePreview\(this\.pendingAssetMigrationPreview/.test(widget), 'widget migrates the already confirmed preview');
expect(/this\.pendingAssetMigrationPreview = null/.test(widget), 'widget clears stale preview after migration');
expect(/if \(this\.isAssetMigrationRunning\)/.test(widget), 'widget ignores duplicate migration requests while running');
expect(/this\.isAssetMigrationRunning = true/.test(widget), 'widget marks migration as running before async preflight');
expect(/this\.isAssetMigrationRunning = false/.test(widget), 'widget clears migration running flag in finally');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase asset migration preflight verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase asset migration preflight verification passed (${checks.length} checks).`);
