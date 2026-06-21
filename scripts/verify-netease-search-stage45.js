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

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertNotIncludes(adapter, 'NetEase artist result', 'artist entity subtitle must be Chinese');
assertNotIncludes(adapter, 'Local artist result', 'local artist entity subtitle must be Chinese');
assertNotIncludes(adapter, 'tracks`', 'playlist entity subtitle must be Chinese');
assertIncludes(adapter, '网易云歌手', 'NetEase artist entity source copy');
assertIncludes(adapter, '本地歌手', 'local artist entity source copy');
assertIncludes(adapter, '首歌曲', 'playlist entity track-count copy');

const topSearch = read('src/renderer/ui-next-static/components/TopSearch.js');
assertIncludes(topSearch, 'openEntityButton', 'search panel entities must expose an explicit open action');
assertIncludes(topSearch, '\\u6253\\u5f00', 'entity open action must use Chinese label');
assertMatches(topSearch, /entityGroup\([^)]*onOpenPlaylist[\s\S]*openEntityButton/, 'search panel playlist entities must wire open action');
assertIncludes(topSearch, 'mb-search-entity__open', 'search panel entity open action class');

const resultsView = read('src/renderer/ui-next-static/components/SearchResultsView.js');
assertMatches(resultsView, /entityGroup\([^)]*o\.onOpenPlaylist/, 'full search results must pass playlist open handler into entity groups');
assertIncludes(resultsView, 'openEntityButton', 'full search results must expose explicit entity open action');
assertIncludes(resultsView, 'mb-search-entity__open', 'full search entity open action class');
assertIncludes(resultsView, '\\u6253\\u5f00', 'full search entity action copy');

const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
assertMatches(shell, /SearchResultsView\([\s\S]*onOpenPlaylist/, 'search results page must wire playlist entity open action');

const styles = read('src/renderer/ui-next-static/styles.css');
assertIncludes(styles, 'mb-search-entity__open', 'entity open action must have stable styling');
assertIncludes(styles, 'flex: 0 0', 'entity action sizing must not shift rows');

console.log('NetEase search stage 45 guard passed.');
