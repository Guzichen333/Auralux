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

function assertMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const playlistView = read('src/renderer/ui-next-static/components/PlaylistView.js');
assertIncludes(playlistView, 'cacheSummary', 'playlist view must compute cache summary');
assertIncludes(playlistView, 'mb-pl-cache-summary', 'playlist header must render cache summary');
assertIncludes(playlistView, '\\u79bb\\u7ebf', 'cache summary must show offline count copy');
assertIncludes(playlistView, '\\u5c01\\u9762', 'cache summary must show cover cache count copy');
assertIncludes(playlistView, '\\u6b4c\\u8bcd', 'cache summary must show lyrics cache count copy');
assertMatches(playlistView, /offlinePlayable[\s\S]*coverCacheStatus[\s\S]*lyricsCacheStatus/, 'cache summary must derive from track offline/cover/lyrics fields');

const styles = read('src/renderer/ui-next-static/styles.css');
assertIncludes(styles, 'mb-pl-cache-summary', 'playlist cache summary must have stable styling');
assertIncludes(styles, 'mb-pl-cache-summary__item', 'playlist cache summary items must have stable styling');

const offlineGuard = read('scripts/verify-offline-status.js');
assertIncludes(offlineGuard, 'coverCacheStatus', 'existing offline guard must still cover cover cache fields');
assertIncludes(offlineGuard, 'lyricsCacheStatus', 'existing offline guard must still cover lyrics cache fields');

console.log('Offline/cache stage 46 guard passed.');
