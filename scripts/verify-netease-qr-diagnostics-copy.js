const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const widget = fs.readFileSync(widgetPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/lastQRLoginDiagnosticsText\s*=\s*''/.test(widget), 'widget stores last QR diagnostic text');
expect(/ensureQRLoginDiagnosticsActions/.test(widget), 'widget creates QR diagnostic actions');
expect(/netease-copy-qr-diagnostics-btn/.test(widget), 'copy diagnostics button has stable id');
expect(/copyQRLoginDiagnostics/.test(widget), 'copy diagnostics handler exists');
expect(/navigator\.clipboard\.writeText\(this\.lastQRLoginDiagnosticsText\)/.test(widget), 'copy handler writes diagnostic text to clipboard');
expect(/buildQRLoginDiagnosticsText/.test(widget), 'widget builds a copyable diagnostic payload');
expect(/NetEase QR Login Diagnostics/.test(widget), 'copyable diagnostics include an English debug header');
expect(/endpoint: \$\{netEaseApiClient\.apiEndpoint\}/.test(widget), 'copyable diagnostics include API endpoint');
expect(/cookieAdopted: \$\{diagnostics\.cookieAdopted\}/.test(widget), 'copyable diagnostics include cookie adoption without raw cookie');
expect(/attempts: \$\{diagnostics\.attempts\}/.test(widget), 'copyable diagnostics include attempts');
expect(/lastAccountCheck: \$\{diagnostics\.lastAccountCheck\}/.test(widget), 'copyable diagnostics include last account check');
expect(/this\.lastQRLoginDiagnosticsText = this\.buildQRLoginDiagnosticsText\(confirmation\.diagnostics, diagnosticsText\)/.test(widget), 'failure path stores copyable diagnostics');
expect(/this\.setQRDiagnosticsActionsVisible\(true\)/.test(widget), 'failure path reveals diagnostic actions');
expect(/this\.clearQRLoginDiagnostics\(\)/.test(widget), 'QR restart clears stale diagnostics');
expect(/this\.setQRRetryLabel\(true\)/.test(widget), 'failure or expiry makes retry label explicit');
expect(!/result\.cookie[\s\S]{0,120}lastQRLoginDiagnosticsText/.test(widget), 'copyable diagnostics do not include raw QR cookie');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase QR diagnostics copy verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase QR diagnostics copy verification passed (${checks.length} checks).`);
