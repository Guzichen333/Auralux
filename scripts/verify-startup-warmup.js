const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const files = {
    coordinator: 'src/renderer/src/ui-next/startupWarmup.ts',
    bootstrap: 'src/renderer/src/ui-next/bootstrap.ts',
    styles: 'src/renderer/ui-next-static/styles.css'
};

const checks = [
    [files.coordinator, /MIN_STARTUP_DISPLAY_MS\s*=\s*1000/],
    [files.coordinator, /MAX_STARTUP_WAIT_MS\s*=\s*(4|5|6)000/],
    [files.coordinator, /settings/],
    [files.coordinator, /library/],
    [files.coordinator, /playbackQueue/],
    [files.coordinator, /neteaseAvailability/],
    [files.coordinator, /neteaseProfile/],
    [files.coordinator, /coverCache/],
    [files.coordinator, /lyricsCache/],
    [files.coordinator, /degraded/],
    [files.coordinator, /Promise\.allSettled/],
    [files.coordinator, /\[ui-next\] startup warmup/],
    [files.bootstrap, /renderStartupSplash/],
    [files.bootstrap, /runStartupWarmup/],
    [files.bootstrap, /waitForStartupGate/],
    [files.bootstrap, /removeStartupSplash/],
    [files.styles, /\.mb-startup/],
    [files.styles, /\.mb-startup__task/]
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
    console.error('Startup warmup guard failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Startup warmup guard passed.');
