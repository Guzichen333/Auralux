const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(source, needle, message) {
    if (!source.includes(needle)) {
        throw new Error(message);
    }
}

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const styles = read('src/renderer/ui-next-static/styles.css');

assertIncludes(shell, 'auralux.onboarding.migration', 'First-run migration onboarding must persist local completion state');
assertIncludes(shell, 'migrationOnboarding', 'UI-NEXT shell state must expose migration onboarding state');
assertIncludes(shell, '_renderMigrationOnboarding', 'UI-NEXT shell must render a first-run migration onboarding surface');
assertIncludes(shell, 'dismissMigrationOnboarding', 'Onboarding must support skip/dismiss without blocking local playback');
assertIncludes(shell, 'startMigrationOnboardingLogin', 'Onboarding must provide a NetEase login path');
assertIncludes(shell, 'startMigrationOnboardingLocalImport', 'Onboarding must provide a local music import path');
assertIncludes(shell, 'openMigrationOnboardingDashboard', 'Onboarding must link to the migration dashboard');
assertIncludes(shell, 'resetMigrationOnboarding', 'Users must be able to reopen onboarding later');
assertIncludes(shell, '不会静默覆盖本地曲库', 'Onboarding copy must explain local-library protection');
assertIncludes(shell, '我喜欢', 'Onboarding copy must mention liked songs migration');
assertIncludes(shell, '最近播放', 'Onboarding copy must mention recent plays migration');

assertIncludes(adapter, 'openNetEaseLogin', 'Onboarding login must reuse existing NetEase login adapter path');
assertIncludes(adapter, 'addMusicFiles', 'Onboarding local import must reuse existing local import adapter path');
assertIncludes(adapter, 'openMigrationDashboard', 'Onboarding dashboard link must reuse existing migration dashboard path');

assertIncludes(styles, 'mb-onboarding', 'First-run migration onboarding styles must be present');
assertIncludes(styles, 'mb-onboarding__actions', 'Onboarding actions must be styled');
assertIncludes(styles, 'mb-onboarding__choice', 'Onboarding choice controls must be styled');

console.log('NetEase first-run onboarding guard passed.');
