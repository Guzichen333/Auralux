const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const checks = [
    {
        file: 'src/renderer/ui-next-static/components/Sidebar.js',
        forbidden: [
            {pattern: /'UI-NEXT'|"UI-NEXT"/, label: 'sidebar brand subtitle should not expose UI-NEXT'}
        ],
        required: [
            {pattern: /class:\s*'mb-brand__ver'[^]*?['"]聆曜['"]/, label: 'sidebar brand subtitle should use the Chinese product name'}
        ]
    },
    {
        file: 'src/renderer/ui-next-static/NewMusicShell.js',
        forbidden: [
            {pattern: /'UI-NEXT'|"UI-NEXT"/, label: 'settings header should not expose UI-NEXT'},
            {pattern: /未提供\??UI-NEXT|UI-NEXT 初始化数据/, label: 'startup errors should not expose UI-NEXT'}
        ],
        required: [
            {pattern: /mb-section__count numeric'[^]*?['"]偏好设置['"]/, label: 'settings header badge should describe preferences'},
            {pattern: /Auralux 初始化数据/, label: 'startup error should use Auralux copy'}
        ]
    },
    {
        file: 'src/renderer/src/ui-next/bootstrap.ts',
        forbidden: [
            {pattern: /MusicBox 新 UI 启动失败/, label: 'startup error should not mention MusicBox or new UI'}
        ],
        required: [
            {pattern: /Auralux 启动失败/, label: 'startup error should use Auralux product name'}
        ]
    }
];

const failures = [];

for (const check of checks) {
    const filePath = path.join(root, check.file);
    const text = fs.readFileSync(filePath, 'utf8');

    for (const item of check.forbidden) {
        if (item.pattern.test(text)) {
            failures.push(`${check.file}: ${item.label}`);
        }
    }

    for (const item of check.required) {
        if (!item.pattern.test(text)) {
            failures.push(`${check.file}: missing ${item.label}`);
        }
    }
}

if (failures.length > 0) {
    console.error('Visible brand copy guard failed:');
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log('Visible brand copy guard passed.');
