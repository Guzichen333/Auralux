const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');
const topSearchPath = path.join(root, 'src/renderer/ui-next-static/components/TopSearch.js');

const adapter = fs.readFileSync(adapterPath, 'utf8');
const shell = fs.readFileSync(shellPath, 'utf8');
const topSearch = fs.readFileSync(topSearchPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/neteaseAssetMigrationRunning\?: boolean/.test(adapter), 'adapter shell state includes migration running flag');
expect(/this\.setNetEaseAssetMigrationRunning\(true\)/.test(adapter), 'adapter marks migration running before account-menu migration starts');
expect(/this\.setNetEaseAssetMigrationRunning\(false\)/.test(adapter), 'adapter clears migration running flag after account-menu migration finishes');
expect(/finally \{[\s\S]*setNetEaseAssetMigrationRunning\(false\)/.test(adapter), 'adapter clears running flag in finally');
expect(/renderNetEaseAccountStatus\(\)/.test(adapter), 'adapter refreshes NetEase account status after running-state changes');

expect(/neteaseAssetMigrationRunning: M\.neteaseAssetMigrationRunning \|\| false/.test(shell), 'shell default state carries migration running flag');
expect(/neteaseAssetMigrationRunning: s\.neteaseAssetMigrationRunning/.test(shell), 'shell passes migration running flag into TopSearch');

expect(/var migrationRunning = !!o\.neteaseAssetMigrationRunning/.test(topSearch), 'TopSearch reads migration running flag');
expect(/migrationRunning \? '\\u67e5\\u770b\\u8fc1\\u79fb\\u8fdb\\u5ea6' : '\\u8fc1\\u79fb\\u5168\\u90e8\\u8d44\\u4ea7'/.test(topSearch), 'TopSearch changes migration action label while running');
expect(/migrationRunning \? o\.onShowNetEaseMigrationProgress : o\.onMigrateAllNetEaseAssets/.test(topSearch), 'TopSearch reopens progress while migration is running');
expect(/migrationRunning \? ' is-running' : ''/.test(topSearch), 'TopSearch adds running styling while running');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase account-menu migration running verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase account-menu migration running verification passed (${checks.length} checks).`);
