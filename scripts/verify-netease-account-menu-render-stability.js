const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');
const shell = fs.readFileSync(shellPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/_detachReusableNetEaseMenu/.test(shell), 'shell defines a reusable NetEase menu detach helper');
expect(/_restoreReusableNetEaseMenu/.test(shell), 'shell defines a reusable NetEase menu restore helper');
expect(/neteaseAssetMigrationRunning[\s\S]*neteaseMenuOpen/.test(shell), 'render preservation is gated to running migration with open menu');
expect(/querySelector\(['"]\.mb-netease-account['"]\)/.test(shell), 'shell can find the existing NetEase account node');
expect(/querySelector\(['"]\.mb-netease-menu['"]\)/.test(shell), 'shell preserves only the open NetEase dropdown menu');
expect(/replaceChild\(menu, nextMenu\)/.test(shell), 'shell restores the dropdown menu into the newly rendered account host');
expect(!/replaceChild\(account, nextAccount\)/.test(shell), 'shell does not replace the full account host');
expect(/preservedNetEaseMenu/.test(shell), 'render carries a preserved NetEase dropdown menu across full-shell render');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase account menu render stability verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase account menu render stability verification passed (${checks.length} checks).`);
