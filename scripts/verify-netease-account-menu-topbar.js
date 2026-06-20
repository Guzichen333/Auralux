const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assertIncludes = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message);
};
const assertNotIncludes = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message);
};

const topSearch = read('src/renderer/ui-next-static/components/TopSearch.js');
const sidebar = read('src/renderer/ui-next-static/components/Sidebar.js');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const styles = read('src/renderer/ui-next-static/styles.css');

assertIncludes(topSearch, 'neteaseAccountTrigger', 'Topbar must render a NetEase avatar-only account trigger');
assertIncludes(topSearch, 'mb-netease-account-trigger', 'Topbar trigger must use scoped account trigger styles');
assertIncludes(topSearch, 'mb-netease-menu', 'Topbar must render a secondary NetEase account menu');
assertIncludes(topSearch, 'neteaseAvatarUrl', 'Topbar trigger must receive the NetEase avatar URL');
assertIncludes(topSearch, 'mb-netease-menu__assets', 'NetEase menu must expose asset summary counts');
assertIncludes(topSearch, 'onOpenMigrationDashboard', 'NetEase menu must expose migration dashboard action');
assertIncludes(topSearch, 'onCopyMigrationDiagnostics', 'NetEase menu must expose diagnostics copy action');
assertNotIncludes(topSearch, '网易云在线', 'Topbar trigger must not render long inline NetEase status text');

assertNotIncludes(sidebar, 'mb-account-center', 'Sidebar must not render the account center block');
assertNotIncludes(sidebar, 'neteaseAvatarUrl', 'Sidebar must not own the NetEase avatar account UI');

assertIncludes(shell, 'neteaseMenuOpen', 'Shell state must track the topbar NetEase menu open state');
assertIncludes(shell, 'toggleNetEaseMenu', 'Shell must expose a menu toggle handler');
assertIncludes(shell, 'closeNetEaseMenu', 'Shell must close the menu after actions');
assertIncludes(shell, 'neteaseAvatarUrl: s.neteaseAvatarUrl', 'Shell must pass avatar URL to TopSearch');
assertIncludes(shell, 'onOpenMigrationDashboard', 'Shell must pass migration dashboard action to TopSearch');
assertIncludes(shell, 'onCopyMigrationDiagnostics', 'Shell must pass diagnostics action to TopSearch');

assertIncludes(styles, '.mb-netease-account-trigger', 'Styles must include topbar account trigger');
assertIncludes(styles, '.mb-netease-menu', 'Styles must include topbar account menu');
assertIncludes(styles, '.mb-netease-menu__assets', 'Styles must include menu asset summary');
assertNotIncludes(styles, '.mb-account-center', 'Sidebar account-center styles must be removed');

console.log('NetEase topbar account menu guard passed.');
