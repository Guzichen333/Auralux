const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assertIncludes = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message);
};

const topSearch = read('src/renderer/ui-next-static/components/TopSearch.js');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const neteaseWidget = read('src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');

assertIncludes(topSearch, 'mb-netease-menu__action--primary', 'Account menu must expose a primary one-click complete asset migration action');
assertIncludes(topSearch, 'onMigrateAllNetEaseAssets', 'TopSearch must receive the migration action callback');
assertIncludes(shell, 'onMigrateAllNetEaseAssets', 'Shell must wire the migration action through TopSearch');
assertIncludes(adapter, 'migrateAllNetEaseAssets', 'UI-NEXT adapter must expose a complete asset migration entry');
assertIncludes(adapter, 'openMigrationDashboard', 'Complete migration should reuse the migration dashboard path');
assertIncludes(neteaseWidget, 'startAssetMigrationFromAccountMenu', 'NetEase widget must expose a public account-menu migration method');
assertIncludes(neteaseWidget, 'openAssetMigration', 'Public method must reuse existing asset migration implementation');

console.log('NetEase account-menu asset migration guard passed.');
