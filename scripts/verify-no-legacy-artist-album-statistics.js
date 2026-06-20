const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
    {
        file: 'src/renderer/src/index.html',
        forbidden: [
            'data-view="artists"',
            'data-view="albums"',
            'data-view="statistics"',
            'id="statistics-toggle"',
            'id="artists-page-toggle"',
            'id="albums-page-toggle"'
        ]
    },
    {
        file: 'src/renderer/src/ui/widgets/Navigation.ts',
        forbidden: [
            'statisticsLink',
            'artistsLink',
            'albumsLink',
            'updateStatisticsButtonVisibility',
            'updateArtistsPageButtonVisibility',
            'updateAlbumsPageButtonVisibility',
            'statisticsEnabled',
            'artistsPageEnabled',
            'albumsPageEnabled'
        ]
    },
    {
        file: 'src/renderer/src/features/settings/service/GeneralSettingsController.ts',
        forbidden: [
            'statisticsToggle',
            'artistsPageToggle',
            'albumsPageToggle',
            "statisticsEnabled",
            "artistsPageEnabled",
            "albumsPageEnabled"
        ]
    },
    {
        file: 'src/renderer/src/features/settings/service/SettingsStore.ts',
        forbidden: [
            'statistics:',
            'artistsPage:',
            'albumsPage:',
            'statisticsEnabled:',
            'artistsPageEnabled:',
            'albumsPageEnabled:'
        ]
    },
    {
        file: 'src/renderer/src/api/types/settings.ts',
        forbidden: [
            'statistics?:',
            'artistsPage?:',
            'albumsPage?:'
        ]
    },
    {
        file: 'src/renderer/src/features/settings/ui-bindings/SettingsComponentBindings.ts',
        forbidden: [
            "statisticsEnabled",
            "artistsPageEnabled",
            "albumsPageEnabled"
        ]
    },
    {
        file: 'src/renderer/src/ui/pages/Settings.ts',
        forbidden: [
            'statisticsToggle',
            'artistsPageToggle',
            'albumsPageToggle'
        ]
    }
];

const failures = [];

for (const check of checks) {
    const filePath = path.join(root, check.file);
    const text = fs.readFileSync(filePath, 'utf8');
    for (const token of check.forbidden) {
        if (text.includes(token)) {
            failures.push(`${check.file}: still contains "${token}"`);
        }
    }
}

if (failures.length > 0) {
    console.error('Legacy UI cleanup check failed:');
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exitCode = 1;
} else {
    console.log('Legacy UI cleanup check passed.');
}
