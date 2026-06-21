const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`);
  }
}

function assertNotIncludes(content, forbidden, label) {
  if (content.includes(forbidden)) {
    throw new Error(`${label}: still contains ${forbidden}`);
  }
}

function assertMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const bootstrap = read('src/renderer/src/app/bootstrap/main.ts');
assertIncludes(bootstrap, "await import('../../ui-next/bootstrap')", 'renderer entry must boot UI-NEXT directly');
assertNotIncludes(bootstrap, 'loadLegacyApp', 'renderer entry must not keep a legacy boot fallback');
assertNotIncludes(bootstrap, 'legacy-ui', 'renderer entry must not expose legacy query switch');

const settingsStore = read('src/renderer/src/features/settings/service/SettingsStore.ts');
assertIncludes(settingsStore, 'retiredSettingKeys', 'retired settings must be explicitly migrated away');
assertMatches(settingsStore, /retiredSettingKeys[\s\S]*'statistics'[\s\S]*'artistsPage'[\s\S]*'albumsPage'/, 'artist/album/statistics settings must remain retired');
assertMatches(settingsStore, /delete migratedSettings\[key\]/, 'retired settings must be removed during migration');

const navigation = read('src/renderer/src/ui/widgets/Navigation.ts');
assertNotIncludes(navigation, 'artistsLink', 'legacy artist navigation must stay removed');
assertNotIncludes(navigation, 'albumsLink', 'legacy album navigation must stay removed');
assertNotIncludes(navigation, 'statisticsLink', 'legacy statistics navigation must stay removed');

const uiNextShell = read('src/renderer/ui-next-static/NewMusicShell.js');
assertNotIncludes(uiNextShell, '旧界面', 'UI-NEXT must not offer a visible legacy UI switch');
assertNotIncludes(uiNextShell, '返回旧界面', 'UI-NEXT must not offer return-to-legacy copy');

console.log('Stage 48 UI-NEXT legacy boundary guard passed.');
