const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, needle, message) {
    if (!source.includes(needle)) {
        throw new Error(message);
    }
}

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const sidebar = read('src/renderer/ui-next-static/components/Sidebar.js');
const styles = read('src/renderer/ui-next-static/styles.css');

assertContains(adapter, 'UINextNetEaseAccountCenterState', 'Adapter must define an account-center state shape');
assertContains(adapter, 'neteaseAccountCenter?', 'Shell state must expose a NetEase account-center summary');
assertContains(adapter, 'refreshNetEaseAccountCenterState', 'Adapter must refresh account-center state from migration/sync data');
assertContains(adapter, 'buildNetEaseAccountCenterState', 'Adapter must build a derived account-center summary');
assertContains(adapter, 'likedPlaylistCount', 'Account center must expose liked/favorites migration count');
assertContains(adapter, 'createdPlaylistCount', 'Account center must expose created playlist migration count');
assertContains(adapter, 'favoritePlaylistCount', 'Account center must expose favorite/subscribed playlist migration count');
assertContains(adapter, 'recentPlaybackCount', 'Account center must expose recent playback migration count');
assertContains(adapter, 'failureCount', 'Account center must expose migration/sync failures');
assertContains(adapter, 'retryableCount', 'Account center must expose retryable sync count');
assertContains(adapter, 'lastSyncText', 'Account center must expose last sync text');
assertContains(adapter, 'this.refreshNetEaseAccountCenterState()', 'Adapter must refresh account center when account or dashboard state changes');

assertContains(shell, 'neteaseAccountCenter', 'NewMusicShell state must initialize account-center data');
assertContains(shell, 'onOpenNetEaseLogin', 'Shell must pass a login action to Sidebar');
assertContains(shell, 'onOpenMigrationDashboard', 'Shell must pass a migration dashboard action to Sidebar');
assertContains(shell, 'onCopyMigrationDiagnostics', 'Shell must pass diagnostics copy action to Sidebar');

assertContains(sidebar, 'mb-account-center', 'Sidebar must render a dedicated account-center block');
assertContains(sidebar, 'assetPill', 'Sidebar must render asset summary pills');
assertContains(sidebar, 'accountCenter.failureCount', 'Sidebar must render failure count');
assertContains(sidebar, 'accountCenter.retryableCount', 'Sidebar must render retryable count');
assertContains(sidebar, 'onOpenNetEaseLogin', 'Sidebar must expose a login/relogin action');
assertContains(sidebar, 'onOpenMigrationDashboard', 'Sidebar must expose a migration dashboard action');
assertContains(sidebar, 'onCopyMigrationDiagnostics', 'Sidebar must expose diagnostics copy action');

assertContains(styles, '.mb-account-center', 'Styles must include account-center layout');
assertContains(styles, '.mb-account-center__assets', 'Styles must include asset summary layout');
assertContains(styles, '.mb-account-center__actions', 'Styles must include account-center action layout');

console.log('NetEase account center hub guard passed.');
