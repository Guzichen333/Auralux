const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const servicePath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAssetMigrationService.ts');

const widget = fs.readFileSync(widgetPath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/private async recordAssetMigrationCancelledReport/.test(widget), 'widget records a visible cancellation report');
expect(/externalId: 'asset-migration-cancelled'/.test(widget), 'cancel report uses a stable external id');
expect(/status: 'cancelled'/.test(widget), 'cancel report is persisted with cancelled status');
expect(/if \(this\.assetMigrationCancelRequested\) \{[\s\S]*return false;[\s\S]*\}/.test(widget), 'preflight stops before confirmation when cancellation is already requested');
expect(/this\.recordAssetMigrationCancelledReport\(/.test(widget), 'cancel path records cancellation in the widget');
expect(/cancelledSummary\([\s\S]*netEaseMigrationReportService\.recordPlaylistImport/.test(service), 'service cancelled summary records a dashboard-visible report');
expect(/externalId: 'asset-migration-cancelled'/.test(service), 'service cancel summary uses stable cancel report id');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase migration preflight cancel report verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase migration preflight cancel report verification passed (${checks.length} checks).`);
