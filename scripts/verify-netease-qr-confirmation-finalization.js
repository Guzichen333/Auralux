const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const authPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAuthService.ts');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');

const auth = fs.readFileSync(authPath, 'utf8');
const widget = fs.readFileSync(widgetPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/private readonly qrConfirmAttempts = 12;/.test(auth), 'QR confirmation uses a longer bounded account verification window');
expect(/private readonly qrConfirmIntervalMs = 1000;/.test(auth), 'QR confirmation retry interval is explicit');
expect(/async confirmQRLogin\(cookie\?: string\): Promise<NetEaseQRConfirmationResult>/.test(auth), 'confirmQRLogin returns profile plus diagnostics');
expect(/for\s*\(\s*let\s+attempt\s*=\s*0;\s*attempt\s*<\s*this\.qrConfirmAttempts;\s*attempt\+\+\s*\)/.test(auth), 'confirmQRLogin uses the bounded retry constants');
expect(/const profile = await this\.getAccountProfile\([\s\S]*?if \(profile\) \{[\s\S]*?return \{profile,\s*diagnostics\};/.test(auth), 'confirmQRLogin verifies and returns account profile before success');
expect(/if \(cookie\) \{[\s\S]*?netEaseApiClient\.setCookie\(cookie\);[\s\S]*?\}/.test(auth), 'confirmQRLogin adopts QR cookie when present');
expect(/netEaseApiClient\.clearCookie\(\);[\s\S]*?return \{profile:\s*null,\s*diagnostics\};/.test(auth), 'failed QR finalization clears stale cookie and returns diagnostics');

expect(/const confirmation = await netEaseAuthService\.confirmQRLogin\(result\.cookie\)/.test(widget), 'QR polling stores the confirmation result');
expect(/const accountProfile = confirmation\.profile/.test(widget), 'QR polling reads the verified account profile');
expect(/if \(!accountProfile\)/.test(widget), 'QR polling handles confirmed-but-unverified login');
expect(/this\.isLoggedIn = true;[\s\S]*?this\.updateStatusIndicator\(\);[\s\S]*?window\.dispatchEvent\(new CustomEvent\('netease-login-status-changed'/.test(widget), 'successful QR finalization updates status and broadcasts login change');
expect(/accountProfile\.nickname/.test(widget), 'successful QR finalization can show the verified nickname');

expect(/window\.addEventListener\('netease-login-status-changed', \(\) => \{[\s\S]*?syncNetEaseStatus\(0,\s*\{force:\s*true\}\)/.test(adapter), 'UI-NEXT force-refreshes account state after QR login change');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase QR confirmation finalization verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase QR confirmation finalization verification passed (${checks.length} checks).`);
