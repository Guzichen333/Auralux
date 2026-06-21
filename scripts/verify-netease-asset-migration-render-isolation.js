const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');

const adapter = fs.readFileSync(adapterPath, 'utf8');
const shell = fs.readFileSync(shellPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ ok, label });
}

expect(/private\s+netEaseAssetMigrationInFlight\s*=\s*false/.test(adapter), 'adapter has an in-flight guard for complete NetEase asset migration');
expect(/if\s*\(this\.netEaseAssetMigrationInFlight\)/.test(adapter), 'migration entry returns early when migration is already in flight');
expect(/showToast\(['"`]\u8fc1\u79fb\u6b63\u5728\u8fdb\u884c/.test(adapter), 'duplicate migration click shows a Chinese running-state toast');
expect(/private\s+setNetEaseAssetMigrationRunning\(\s*running:\s*boolean\s*\):\s*void/.test(adapter), 'adapter centralizes migration running state changes');
expect(/renderNetEaseAccountStatus\(\)/.test(adapter), 'adapter uses a focused NetEase account status render path');
expect(!/this\.shell\.state\.neteaseAssetMigrationRunning = true;\s*this\.shell\.render\(\)/.test(adapter), 'migration start does not force a full shell render');
expect(!/this\.shell\.state\.neteaseAssetMigrationRunning = false;\s*this\.shell\.render\(\)/.test(adapter), 'migration finish does not force a full shell render');
expect(/NewMusicShell\.prototype\.renderNetEaseAccountStatus/.test(shell), 'shell exposes a focused NetEase account status renderer');
expect(/replaceChild\(nextAccount, account\)/.test(shell), 'focused renderer swaps only the NetEase account subtree');
expect(!/replaceChild\(account, nextAccount\)/.test(shell), 'focused renderer never restores the full stale account host');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase asset migration render isolation verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase asset migration render isolation verification passed (${checks.length} checks).`);
