const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const checks = [
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /neteaseNickname\?: string/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /neteaseLastSyncText\?: string/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /neteaseSyncStatus\?: string/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /updateNetEaseAccountState/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /retryNetEaseAccountSync/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /lastNetEaseSyncAt/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /netEaseAuthService\.getAccountProfile/],
    ['src/renderer/ui-next-static/NewMusicShell.js', /neteaseNickname:/],
    ['src/renderer/ui-next-static/NewMusicShell.js', /neteaseLastSyncText:/],
    ['src/renderer/ui-next-static/NewMusicShell.js', /neteaseSyncStatus:/],
    ['src/renderer/ui-next-static/NewMusicShell.js', /retryNetEaseAccountSync/],
    ['src/renderer/ui-next-static/components/Sidebar.js', /accountName/],
    ['src/renderer/ui-next-static/components/Sidebar.js', /accountMeta/],
    ['src/renderer/ui-next-static/components/Sidebar.js', /accountSync/],
    ['src/renderer/ui-next-static/components/Sidebar.js', /mb-account__retry/],
    ['src/renderer/ui-next-static/components/Sidebar.js', /onRetryNetEaseSync/],
    ['src/renderer/ui-next-static/styles.css', /\.mb-account__retry/],
    ['src/renderer/ui-next-static/styles.css', /\.mb-account__sync/]
];

const failures = [];

for (const [file, pattern] of checks) {
    const absolutePath = path.join(root, file);
    if (!fs.existsSync(absolutePath)) {
        failures.push(`${file}: missing file`);
        continue;
    }

    const source = fs.readFileSync(absolutePath, 'utf8');
    if (!pattern.test(source)) {
        failures.push(`${file}: missing ${pattern}`);
    }
}

if (failures.length > 0) {
    console.error('NetEase account center guard failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('NetEase account center guard passed.');
