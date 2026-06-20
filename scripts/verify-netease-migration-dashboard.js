const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(source, needle, message) {
    if (!source.includes(needle)) {
        throw new Error(message);
    }
}

function assertFileExists(relativePath) {
    if (!fs.existsSync(path.join(root, relativePath))) {
        throw new Error(`Missing ${relativePath}`);
    }
}

assertFileExists('src/renderer/src/features/netease/service/NetEaseMigrationReportService.ts');
assertFileExists('src/renderer/src/features/netease/service/NetEaseSyncStateService.ts');

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const sidebar = read('src/renderer/ui-next-static/components/Sidebar.js');
const styles = read('src/renderer/ui-next-static/styles.css');

assertIncludes(adapter, 'netEaseMigrationReportService', 'UI-NEXT adapter must read migration reports');
assertIncludes(adapter, 'migrationDashboard', 'UI-NEXT shell state must expose migration dashboard data');
assertIncludes(adapter, 'openMigrationDashboard', 'UI-NEXT adapter must expose a migration dashboard navigation method');
assertIncludes(adapter, 'retryMigrationDashboardSync', 'Migration dashboard must expose a retry entry for failed/conflict sync states');
assertIncludes(adapter, 'buildMigrationDashboardState', 'Adapter must summarize reports and sync states into a dashboard state');
assertIncludes(adapter, 'getRecentReports()', 'Dashboard summary must use persisted recent migration reports');
assertIncludes(adapter, 'getAllPlaylistSyncStates()', 'Dashboard summary must include trusted sync states');
assertIncludes(adapter, 'retryPlaylistSync', 'Dashboard retry must reuse the trusted sync retry path');

assertIncludes(shell, 'migration-dashboard', 'UI-NEXT shell must render a migration dashboard view');
assertIncludes(shell, '_renderMigrationDashboard', 'UI-NEXT shell must define the migration dashboard renderer');
assertIncludes(shell, 'onRetryMigrationDashboardSync', 'Dashboard UI must wire retry actions to the adapter');
assertIncludes(shell, 'onToggleMigrationReportFailures', 'Dashboard UI must allow failed report details to expand');

if (!sidebar.includes('迁移状态') && !sidebar.includes('\\u8fc1\\u79fb\\u72b6\\u6001')) {
    throw new Error('Sidebar must expose a Chinese migration status entry');
}

assertIncludes(styles, 'mb-migration', 'Migration dashboard styles must be present');
assertIncludes(styles, 'mb-migration-sync', 'Migration sync status styles must be present');
assertIncludes(styles, 'mb-migration-report', 'Migration report styles must be present');

console.log('NetEase migration dashboard guard passed.');
