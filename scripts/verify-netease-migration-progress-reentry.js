const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');
const topSearchPath = path.join(root, 'src/renderer/ui-next-static/components/TopSearch.js');

const widget = fs.readFileSync(widgetPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const shell = fs.readFileSync(shellPath, 'utf8');
const topSearch = fs.readFileSync(topSearchPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/showAssetMigrationProgressModal\(\)/.test(widget), 'NetEase widget exposes migration progress re-entry');
expect(/this\.showModal\(this\.importModal\)/.test(widget), 'progress re-entry reopens the import modal');
expect(/this\.importAssetsCancelBtn\?\.focus\(\)/.test(widget), 'progress re-entry focuses the cancel action when available');

expect(/showActiveNetEaseMigration\(\)/.test(adapter), 'UI-NEXT adapter exposes active migration re-entry');
expect(/__newShellNetEase\?\.showAssetMigrationProgressModal/.test(adapter), 'adapter delegates re-entry to NetEase widget');
expect(/showToast\('网易云资产迁移正在后台进行/.test(adapter), 'adapter provides a visible fallback when modal is unavailable');

expect(/onShowNetEaseMigrationProgress/.test(shell), 'shell passes active migration re-entry handler to top search');
expect(/adapter\.showActiveNetEaseMigration/.test(shell), 'shell handler delegates to adapter re-entry method');

expect(/migrationRunning \? '\\u67e5\\u770b\\u8fc1\\u79fb\\u8fdb\\u5ea6'/.test(topSearch), 'top-right menu labels running action as progress re-entry');
expect(/migrationRunning \? o\.onShowNetEaseMigrationProgress : o\.onMigrateAllNetEaseAssets/.test(topSearch), 'top-right running action reopens migration progress instead of being disabled');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase migration progress re-entry verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase migration progress re-entry verification passed (${checks.length} checks).`);
