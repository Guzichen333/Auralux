const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const files = [
    'src/renderer/ui-next-static/NewMusicShell.js',
    'src/renderer/src/features/settings/service/ShortcutListRenderer.ts',
    'src/renderer/src/features/settings/service/ShortcutDialogService.ts',
    'src/renderer/src/features/settings/service/ShortcutSettingsController.ts',
    'src/renderer/src/features/settings/service/SettingsToolsController.ts',
    'src/renderer/src/features/settings/service/CacheSettingsRenderer.ts',
    'src/renderer/src/features/settings/service/MediaDirectorySettingsRenderer.ts'
];

const failures = [];

for (const file of files) {
    const absolutePath = path.join(root, file);
    const source = fs.readFileSync(absolutePath, 'utf8');

    const stringLiterals = source.match(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g) || [];
    const visibleEnglishPatterns = [
        /Show track covers/,
        /Display artwork in library lists and playlist details/,
        /Gapless playback/,
        /Preload the next song/,
        /Audio engine/,
        /WASAPI is unavailable here/,
        /Exclusive mode/,
        /Use WASAPI exclusive output/,
        /WASAPI share mode/,
        /Windows mixing active/,
        /Library folders/,
        /No music folders added/,
        /Add folder/,
        /Add music files/,
        /Auto scan/,
        /Scan frequency/,
        /On startup/,
        /Weekly/,
        /Manual/,
        /Lyrics and cache/,
        /Working\.\.\./,
        /Local assets/,
        /Lyrics folder/,
        /Cover cache folder/,
        /Choose/,
        /Lyrics highlight opacity/,
        /Lyrics highlight color/,
        /Cache summary has not been loaded/,
        /Loading\.\.\./,
        /Summary/,
        /Checking\.\.\./,
        /Validate/,
        /Clearing\.\.\./,
        /Clear/,
        /Embedded lyrics test/,
        /Desktop lyrics and mini mode/,
        /Desktop display mode/,
        /Select the desktop lyric presentation/,
        /Desktop layout/,
        /Desktop theme color/,
        /Desktop font color/,
        /Desktop opacity/,
        /Desktop font size/,
        /Mini mode/,
        /System/,
        /Window and troubleshooting/,
        /Network drive/,
        /Hardware acceleration/,
        /Network drive config/,
        /User data folder/,
        /Plugin manager/,
        /Check updates/,
        /^(['"`])Repository\1$/,
        /Open installed plugins/,
        /Read the current app version/,
        /Open the configured project repository/
    ];

    for (const literal of stringLiterals) {
        for (const pattern of visibleEnglishPatterns) {
            if (pattern.test(literal)) {
                failures.push(`${file}: ${pattern}`);
            }
        }
    }
}

if (failures.length > 0) {
    console.error('Visible English remains in settings UI:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Settings UI Chinese guard passed.');
