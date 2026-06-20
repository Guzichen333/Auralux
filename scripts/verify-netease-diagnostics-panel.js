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

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const styles = read('src/renderer/ui-next-static/styles.css');

assertIncludes(adapter, 'UINextMigrationDiagnosticsState', 'Adapter must expose a migration diagnostics state shape');
assertIncludes(adapter, 'diagnostics:', 'Migration dashboard state must include diagnostics');
assertIncludes(adapter, 'buildMigrationDiagnosticsState', 'Adapter must build NetEase migration diagnostics');
assertIncludes(adapter, 'copyMigrationDiagnostics', 'Adapter must provide a copy diagnostics action');
assertIncludes(adapter, 'navigator.clipboard.writeText', 'Diagnostics copy must use the clipboard API when available');
assertIncludes(adapter, 'NetEase API', 'Diagnostics must include NetEase API status');
assertIncludes(adapter, '登录状态', 'Diagnostics must include login state');
assertIncludes(adapter, '失败报告', 'Diagnostics must include failed migration report count');
assertIncludes(adapter, '可重试同步', 'Diagnostics must include retryable sync count');
assertIncludes(adapter, '已脱敏', 'Diagnostics copy must state that sensitive data is redacted');

assertIncludes(shell, 'onCopyMigrationDiagnostics', 'UI-NEXT shell must expose a copy diagnostics handler');
assertIncludes(shell, '_renderMigrationDiagnostics', 'Migration dashboard must render diagnostics');
assertIncludes(shell, '复制诊断信息', 'Diagnostics UI must provide a copy action');
assertIncludes(shell, '可复制给开发者', 'Diagnostics UI must explain the copyable diagnostic purpose');
assertIncludes(shell, 'mb-migration-diagnostics', 'Diagnostics UI must use scoped CSS classes');

assertIncludes(styles, 'mb-migration-diagnostics', 'Diagnostics styles must be present');
assertIncludes(styles, 'mb-migration-diagnostics__grid', 'Diagnostics grid styles must be present');
assertIncludes(styles, 'mb-migration-diagnostics__copy', 'Diagnostics copy control must be styled');

console.log('NetEase diagnostics panel guard passed.');
