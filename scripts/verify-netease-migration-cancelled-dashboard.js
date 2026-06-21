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

expect(/cancelledCount: number/.test(adapter), 'migration dashboard summary tracks cancelled reports');
expect(/cancelledCount: reports\.filter\(\(report\) => report\.status === 'cancelled'\)\.length/.test(adapter), 'adapter counts cancelled reports');
expect(/if \(status === 'cancelled'\) return '已取消'/.test(adapter), 'adapter formats cancelled report status as Chinese');
expect(/取消报告 \$\{cancelledReportCount\} 个/.test(adapter), 'diagnostics summary includes cancelled report count');
expect(/const cancelledReportCount = reports\.filter\(\(report\) => report\.status === 'cancelled'\)\.length/.test(adapter), 'diagnostics counts cancelled reports separately');

expect(/cancelledCount: 0/.test(shell), 'shell default migration dashboard includes cancelled count');
expect(/metric\('已取消', summary\.cancelledCount, 'muted'\)/.test(shell), 'migration dashboard renders cancelled metric');
expect(/report\.status === 'cancelled'/.test(shell), 'migration report row can style cancelled reports');
expect(/取消原因/.test(shell), 'cancelled report toggle text does not say failure reason');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase migration cancelled dashboard verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase migration cancelled dashboard verification passed (${checks.length} checks).`);
