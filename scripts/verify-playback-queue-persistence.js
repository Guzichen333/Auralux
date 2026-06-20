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

const musicBoxApi = read('src/renderer/src/api/MusicBoxAPI.ts');
assertContains(musicBoxApi, 'saveQueueSnapshot', 'MusicBoxAPI queue persistence hook');
assertMatches(musicBoxApi, /setPlaylist[\s\S]*saveQueueSnapshot/, 'setPlaylist saves queue snapshot');
assertMatches(musicBoxApi, /nextTrack[\s\S]*saveQueueSnapshot/, 'next track saves queue snapshot');
assertMatches(musicBoxApi, /previousTrack[\s\S]*saveQueueSnapshot/, 'previous track saves queue snapshot');

const uiNextAdapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertContains(uiNextAdapter, 'playbackCacheState', 'UI-NEXT playback cache state');
assertContains(uiNextAdapter, 'updateCurrentPlaybackBadges', 'current playback badge updater');
assertContains(uiNextAdapter, 'cacheStatusLabel', 'cache status label');
assertContains(uiNextAdapter, 'sourceStatusLabel', 'source status label');
assertMatches(uiNextAdapter, /interface UINextTrack[\s\S]*cacheStatusLabel\?: string;[\s\S]*sourceStatusLabel\?: string;/, 'current track status fields');
assertMatches(uiNextAdapter, /this\.shell\.state\.playbackCacheState/, 'shell playback cache state assignment');

const playerBar = read('src/renderer/ui-next-static/components/PlayerBar.js');
assertContains(playerBar, 'cacheStatusLabel', 'player bar cache status label');
assertContains(playerBar, 'sourceStatusLabel', 'player bar source status label');
assertContains(playerBar, 'mb-player__status-chip', 'player bar status chip class');

console.log('Playback queue persistence guard passed.');
