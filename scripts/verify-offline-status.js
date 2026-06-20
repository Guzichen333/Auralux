const fs = require('fs');
const path = require('path');

const adapterPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'ui-next', 'UINextMusicBoxAdapter.ts');
const shellPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const playlistViewPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'components', 'PlaylistView.js');
const trackRowPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'components', 'TrackRow.js');

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const adapter = read(adapterPath);
const shell = read(shellPath);
const playlistView = read(playlistViewPath);
const trackRow = read(trackRowPath);

assertContains(adapter, 'offlinePlayable', 'UI track must expose offline playable state');
assertContains(adapter, 'coverCacheStatus', 'UI track must expose cover cache status');
assertContains(adapter, 'lyricsCacheStatus', 'UI track must expose lyrics cache status');
assertContains(adapter, 'offlineFilter', 'shell state must keep offline filter');
assertContains(adapter, 'toggleOfflinePlayableFilter', 'adapter must expose offline filter action');
assertContains(adapter, 'resolveOfflineStatus', 'offline status resolver is missing');
assertContains(adapter, 'resolveCoverCacheStatus', 'cover cache status resolver is missing');
assertContains(adapter, 'resolveLyricsCacheStatus', 'lyrics cache status resolver is missing');
assertContains(shell, 'offlineFilter', 'static shell must keep offline filter');
assertContains(shell, 'toggleOfflinePlayableFilter', 'static shell must call offline filter action');
assertContains(playlistView, 'offlineFilter', 'playlist view must render offline filter state');
assertContains(playlistView, '\\u79bb\\u7ebf\\u53ef\\u64ad', 'playlist view must show offline filter copy');
assertContains(trackRow, 'offlinePlayable', 'track row must render offline status');
assertContains(trackRow, 'coverCacheStatus', 'track row must render cover cache status');
assertContains(trackRow, 'lyricsCacheStatus', 'track row must render lyrics cache status');

console.log('Offline status guard passed.');
