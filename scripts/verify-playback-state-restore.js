const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const persistence = read('src/renderer/src/features/playback/service/PlaybackPersistence.ts');
assertContains(persistence, 'PLAYBACK_STATE_CACHE_KEY', 'named playback state cache key');
assertContains(persistence, 'PLAYBACK_QUEUE_CACHE_KEY', 'named queue cache key');
assertContains(persistence, 'saveQueueSnapshot', 'queue snapshot writer');
assertMatches(persistence, /cacheManager\.setLocalCache\(PLAYBACK_QUEUE_CACHE_KEY/, 'queue snapshot cache write');
assertMatches(persistence, /const playlist\s*=\s*this\.normalizePlaylist\(state\.playlist\)/, 'normalized playlist state');
assertMatches(persistence, /currentIndex:\s*this\.normalizeCurrentIndex/, 'normalized current index state');
assertMatches(persistence, /savedAt:\s*Date\.now\(\)/, 'queue snapshot save time');

const appController = read('src/renderer/src/features/playback/ui-bindings/PlaybackAppController.ts');
assertContains(appController, 'PLAYBACK_QUEUE_CACHE_KEY', 'restore reads queue cache key');
assertContains(appController, 'queueMemory', 'restore queue memory variable');
assertContains(appController, 'restoreQueueMemory', 'queue memory restore helper');
assertMatches(appController, /cacheManager\.getLocalCache\(PLAYBACK_QUEUE_CACHE_KEY\)/, 'queue cache read');
assertMatches(appController, /await this\.restoreQueueMemory\(/, 'restore queue memory call');
assertMatches(appController, /currentIndex\s*>=\s*0/, 'queue current index validation');

console.log('Playback state restore guard passed.');
