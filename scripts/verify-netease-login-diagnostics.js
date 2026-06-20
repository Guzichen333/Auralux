const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const authPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAuthService.ts');
const typesPath = path.join(root, 'src/renderer/src/features/netease/types.ts');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');

const auth = fs.readFileSync(authPath, 'utf8');
const types = fs.readFileSync(typesPath, 'utf8');
const widget = fs.readFileSync(widgetPath, 'utf8');

const checks = [];

function expect(ok, label) {
  checks.push({ok, label});
}

expect(/export interface NetEaseQRConfirmationResult/.test(types), 'types expose QR confirmation diagnostic result');
expect(/profile: NetEaseAccountProfile \| null/.test(types), 'QR confirmation result carries verified profile');
expect(/diagnostics: \{/.test(types), 'QR confirmation result carries diagnostics');
expect(/cookieAdopted: boolean/.test(types), 'diagnostics include cookie adoption state');
expect(/attempts: number/.test(types), 'diagnostics include verification attempts');
expect(/lastAccountCheck: 'not-started' \| 'missing-cookie' \| 'profile-found' \| 'profile-missing' \| 'request-failed'/.test(types), 'diagnostics include last account-check state');

expect(/NetEaseQRConfirmationResult/.test(auth), 'auth service imports QR confirmation diagnostic result');
expect(/async confirmQRLogin\(cookie\?: string\): Promise<NetEaseQRConfirmationResult>/.test(auth), 'confirmQRLogin returns diagnostic result');
expect(/const diagnostics: NetEaseQRConfirmationResult\['diagnostics'\]/.test(auth), 'confirmQRLogin builds a diagnostic payload');
expect(/cookieAdopted: Boolean\(cookie\)/.test(auth), 'confirmQRLogin records whether QR cookie was present');
expect(/diagnostics\.attempts = attempt \+ 1/.test(auth), 'confirmQRLogin records account verification attempts');
expect(/onCheck\?\.\('missing-cookie'\)/.test(auth), 'confirmQRLogin can report missing-cookie checks');
expect(/onCheck\?\.\('profile-found'\)/.test(auth), 'confirmQRLogin can report successful profile checks');
expect(/onCheck\?\.\('profile-missing'\)/.test(auth), 'confirmQRLogin can report profile-missing checks');
expect(/onCheck\?\.\('request-failed'\)/.test(auth), 'confirmQRLogin can report request failures');
expect(/return \{profile, diagnostics\}/.test(auth), 'confirmQRLogin returns profile with diagnostics on success');
expect(/return \{profile: null, diagnostics\}/.test(auth), 'confirmQRLogin returns diagnostics on failure');

expect(/const confirmation = await netEaseAuthService\.confirmQRLogin\(result\.cookie\)/.test(widget), 'QR polling stores confirmation result');
expect(/const accountProfile = confirmation\.profile/.test(widget), 'QR polling reads verified profile from confirmation result');
expect(/this\.formatQRLoginDiagnostics\(confirmation\.diagnostics\)/.test(widget), 'QR failure UI formats diagnostics');
expect(/private formatQRLoginDiagnostics/.test(widget), 'widget exposes QR diagnostic formatter');
expect(/console\.warn\('\[NetEaseCloudMusic\] QR login finalization failed'/.test(widget), 'QR failure logs diagnostic payload');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase login diagnostics verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase login diagnostics verification passed (${checks.length} checks).`);
