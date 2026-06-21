const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(source, expected, label) {
  assert(source.includes(expected), `${label}: missing ${expected}`);
}

function assertMatches(source, pattern, label) {
  assert(pattern.test(source), `${label}: missing ${pattern}`);
}

const trackRow = read('src/renderer/ui-next-static/components/TrackRow.js');
const topSearch = read('src/renderer/ui-next-static/components/TopSearch.js');
const playlistView = read('src/renderer/ui-next-static/components/PlaylistView.js');
const searchResultsView = read('src/renderer/ui-next-static/components/SearchResultsView.js');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');

assertContains(trackRow, 'onAddToQueue', 'Track rows expose add-to-queue action');
assertContains(trackRow, '\\u6dfb\\u52a0\\u5230\\u64ad\\u653e\\u961f\\u5217', 'Track row plus button title is add to playback queue');
assert(!/opts\.onAddToPlaylist\s*\?\s*h\('button'/.test(trackRow), 'Track row plus button must not be wired to add-to-playlist.');

assertContains(topSearch, 'onAddToQueue', 'Top search exposes add-to-queue action');
assertContains(topSearch, '\\u6dfb\\u52a0\\u5230\\u64ad\\u653e\\u961f\\u5217', 'Top search plus button title is add to playback queue');
assert(!/onAddToPlaylist\s*&&\s*onAddToPlaylist\(t\)/.test(topSearch), 'Top search plus button must not call add-to-playlist.');

assertContains(playlistView, 'onAddToQueue: o.onAddToQueue', 'Playlist view forwards add-to-queue to TrackRow');
assertContains(searchResultsView, 'onAddToQueue: o.onAddToQueue', 'Search results view forwards add-to-queue to TrackRow');

assertMatches(shell, /NewMusicShell\.prototype\.onAddToQueue\s*=\s*function\s*\(track\)/, 'Shell has add-to-queue handler');
assertMatches(shell, /onAddToQueue:\s*function\s*\(t\)\s*\{\s*self\.onAddToQueue\(t\);?\s*\}/, 'Shell passes add-to-queue to child views');
assertMatches(adapter, /addToQueue\(track:\s*UINextTrack\):\s*void\s*\{[\s\S]*playbackController\.setPlaylist/, 'Adapter appends a track through playback queue');
assertMatches(adapter, /showToast\([^)]*播放队列/, 'Adapter confirms add-to-queue with a queue toast');

console.log('UI-NEXT add-to-queue guard passed.');
