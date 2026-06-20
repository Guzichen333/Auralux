const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const checks = [
    {
        file: 'src/renderer/src/app/bootstrap/main.ts',
        patterns: [
            /LEGACY_QUERY_KEYS/,
            /shouldUseLegacyUI/,
            /legacy-ui/,
            /legacyui/,
            /loadLegacyApp\(\)/
        ]
    },
    {
        file: 'src/renderer/src/ui-next/bootstrap.ts',
        patterns: [
            /LEGACY_QUERY_KEYS/,
            /__disableMusicBoxUINext/,
            /legacy-ui/,
            /legacyui/,
            /function shouldEnableUINext\(\): boolean\s*{[\s\S]*?return false/
        ]
    },
    {
        file: 'src/renderer/ui-next-static/NewMusicShell.js',
        patterns: [
            /返回旧界面/,
            /旧界面/
        ]
    }
];

const failures = [];

for (const check of checks) {
    const absolutePath = path.join(root, check.file);
    const source = fs.readFileSync(absolutePath, 'utf8');

    for (const pattern of check.patterns) {
        if (pattern.test(source)) {
            failures.push(`${check.file}: ${pattern}`);
        }
    }
}

if (failures.length > 0) {
    console.error('UI-NEXT is not fully formalized:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('UI-NEXT formalization guard passed.');
