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

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertContains(adapter, 'immersiveLyricsStatus', 'immersive lyrics status field');
assertContains(adapter, 'immersiveLyricsError', 'immersive lyrics error field');
assertContains(adapter, 'retryCurrentLyrics', 'lyrics retry entry');
assertMatches(adapter, /immersiveLyricsStatus\s*=\s*'loading'/, 'loading status write');
assertMatches(adapter, /immersiveLyricsStatus\s*=\s*'missing'/, 'missing status write');
assertMatches(adapter, /immersiveLyricsStatus\s*=\s*'error'/, 'error status write');
assertMatches(adapter, /lyricsContentService\.loadTrackLyrics\(original,\s*\{forceRefresh:\s*true\}\)/, 'forced lyrics retry');

const lyricsService = read('src/renderer/src/features/mediaAssets/service/LyricsContentService.ts');
assertContains(lyricsService, 'TrackLyricsLoadOptions', 'lyrics load options');
assertContains(lyricsService, 'forceRefresh', 'lyrics force refresh option');
assertMatches(lyricsService, /if \(!options\.forceRefresh\)/, 'cached lyrics bypass during retry');

const immersiveView = read('src/renderer/ui-next-static/components/ImmersivePlayerView.js');
assertContains(immersiveView, 'lyricsStatus', 'immersive lyrics status prop');
assertContains(immersiveView, 'lyricsError', 'immersive lyrics error prop');
assertContains(immersiveView, 'onRetryLyrics', 'immersive lyrics retry callback');
assertContains(immersiveView, 'mb-immersive__lyrics-action', 'lyrics retry button class');
assertContains(immersiveView, '重新匹配歌词', 'lyrics rematch button copy');

console.log('Playback lyrics reliability guard passed.');
