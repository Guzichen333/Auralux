const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const authPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseAuthService.ts');
const clientPath = path.join(root, 'src/renderer/src/features/netease/service/NetEaseApiClient.ts');
const widgetPath = path.join(root, 'src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');

const authSource = fs.readFileSync(authPath, 'utf8');
const clientSource = fs.readFileSync(clientPath, 'utf8');
const widgetSource = fs.readFileSync(widgetPath, 'utf8');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

assert(
    authSource.includes("skipCookie: 'true'"),
    'QR key/create/check requests must opt out of automatic stored-cookie injection.'
);

assert(
    authSource.includes("noCookie: 'true'"),
    'QR status polling must match NeteaseCloudMusicApi nocookie QR login flow.'
);

assert(
    /if\s*\(\s*this\.cookie\s*&&\s*!requestParams\.cookie\s*&&\s*requestParams\.skipCookie\s*!==\s*'true'\s*\)/.test(clientSource),
    'GET requests must not append the stored cookie when skipCookie=true.'
);

assert(
    /delete\s+requestParams\.skipCookie/.test(clientSource),
    'skipCookie is an internal client flag and must not be forwarded to the API.'
);

assert(
    /confirmQRLogin\s*\(\s*cookie\??:\s*string\s*\)/.test(authSource),
    'NetEaseAuthService must expose confirmQRLogin(cookie?) so QR 803 confirmation is followed by account verification.'
);

assert(
    /private readonly qrConfirmAttempts = 12;/.test(authSource)
    && /for\s*\(\s*let\s+attempt\s*=\s*0;\s*attempt\s*<\s*this\.qrConfirmAttempts;\s*attempt\+\+\s*\)/.test(authSource),
    'confirmQRLogin must retry account verification after phone confirmation instead of checking only once.'
);

assert(
    /const profile = await this\.getAccountProfile/.test(authSource)
    && /return \{profile, diagnostics\}/.test(authSource),
    'confirmQRLogin must verify /user/account profile before reporting success.'
);

assert(
    /const\s+confirmation\s*=\s*await\s+netEaseAuthService\.confirmQRLogin\(result\.cookie\)/.test(widgetSource),
    'QR polling UI must call confirmQRLogin(result.cookie) after status=confirmed and keep diagnostics.'
);

assert(
    /const\s+accountProfile\s*=\s*confirmation\.profile/.test(widgetSource)
    && /if\s*\(\s*!\s*accountProfile\s*\)/.test(widgetSource),
    'QR polling UI must handle phone-confirmed but account-verification-failed state.'
);

assert(
    /qrStatus\.textContent\s*=\s*'手机已确认，正在同步账号状态\.\.\.'/ .test(widgetSource),
    'QR polling UI must show a phone-confirmed account refresh state.'
);

assert(
    /netEaseApiClient\.clearCookie\(\)/.test(authSource),
    'Failed QR account verification must clear the adopted cookie so stale sessions do not linger.'
);

assert(
    adapterSource.includes("netEaseApiClient.isAuthenticated ? '登录已过期，请重新登录' : '未登录'"),
    'UI-NEXT account sync must expose expired-login state instead of a generic signed-out state.'
);

console.log('NetEase QR login reliability verified.');
