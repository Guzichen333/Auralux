const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, needle, message) {
    if (!source.includes(needle)) {
        throw new Error(message);
    }
}

const bootstrap = read('src/renderer/src/ui-next/bootstrap.ts');

assertContains(bootstrap, 'STARTUP_SHELL_WAIT_MS', 'Startup bootstrap must bound waiting for NewMusicShell');
assertContains(bootstrap, 'STARTUP_EXIT_GRACE_MS', 'Startup bootstrap must include an exit grace guard');
assertContains(bootstrap, 'MAX_STARTUP_WAIT_MS', 'Startup bootstrap must honor the warmup maximum wait');
assertContains(bootstrap, 'waitForNewMusicShell(timeoutMs', 'NewMusicShell wait must accept a timeout');
assertContains(bootstrap, 'window.setTimeout(() => resolve(false)', 'NewMusicShell wait must resolve false on timeout');
assertContains(bootstrap, 'waitForStartupExit(startedAt', 'Startup mount must use bounded startup exit coordination');
assertContains(bootstrap, 'Promise.all([warmup, waitForStartupGate(startedAt)]', 'Startup exit must wait for warmup and the startup display gate');
assertContains(bootstrap, 'await waitForNewMusicShell()', 'Startup mount must wait through the bounded shell guard');
assertContains(bootstrap, 'removeStartupSplash(root)', 'Startup mount must remove the splash before creating the shell');
assertContains(bootstrap, 'clearStartupSplash(root)', 'Startup mount must clear splash before constructing the shell');
assertContains(bootstrap, 'NewMusicShell is not available after ui-next modules loaded', 'Startup failure must surface diagnostic globals');
assertContains(bootstrap, 'Startup splash should never block the app shell indefinitely', 'Bootstrap must keep the startup diagnostic comment');

console.log('Startup splash exit guard passed.');
