const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertContains(file, pattern, message) {
  const content = read(file);
  const ok = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);
  if (!ok) {
    throw new Error(`${message}\nMissing in ${file}: ${pattern}`);
  }
}

const shell = 'src/renderer/ui-next-static/NewMusicShell.js';
const topSearch = 'src/renderer/ui-next-static/components/TopSearch.js';
const resultsView = 'src/renderer/ui-next-static/components/SearchResultsView.js';
const adapter = 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts';
const styles = 'src/renderer/ui-next-static/styles.css';

assertContains(shell, 'searchHistory:', 'Shell state must keep search history.');
assertContains(shell, 'searchFilter:', 'Shell state must keep active search filter.');
assertContains(shell, 'searchSuggestions:', 'Shell state must keep fuzzy suggestions.');
assertContains(shell, 'loadSearchHistory', 'Shell must load persisted search history.');
assertContains(shell, 'recordSearchHistory', 'Shell must record search history.');
assertContains(shell, 'buildSearchSuggestions', 'Shell must build fuzzy autocomplete suggestions.');
assertContains(shell, 'applySearchFilter', 'Shell must filter search result buckets.');
assertContains(shell, 'onSearchFilter', 'Shell must expose filter changes.');
assertContains(shell, /filters:\s*s\.searchFilters/, 'TopSearch must receive search filters.');
assertContains(shell, /onSelectSuggestion/, 'TopSearch must expose suggestion selection.');

assertContains(topSearch, 'mb-search__filters', 'TopSearch must render filter controls.');
assertContains(topSearch, 'mb-search__suggestions', 'TopSearch must render autocomplete suggestions.');
assertContains(topSearch, 'mb-search__history', 'TopSearch must render search history.');
assertContains(topSearch, /onSelectFilter/, 'TopSearch filter buttons must call onSelectFilter.');
assertContains(topSearch, /onSelectSuggestion/, 'TopSearch suggestions must call onSelectSuggestion.');
assertContains(topSearch, /onSelectHistory/, 'TopSearch history items must call onSelectHistory.');
assertContains(topSearch, /onAddToQueue/, 'TopSearch result rows must expose add-to-queue action.');
assertContains(topSearch, /onToggleLike/, 'TopSearch result rows must expose favorite action.');
assertContains(topSearch, /SourceBadge/, 'TopSearch must keep local/NetEase source badges.');

assertContains(resultsView, 'searchFilter', 'SearchResultsView must receive active filter.');
assertContains(resultsView, 'filterResults', 'SearchResultsView must apply filters.');
assertContains(resultsView, 'entityGroup', 'SearchResultsView must render artist/album/playlist result groups.');
assertContains(resultsView, 'onAddToQueue', 'SearchResultsView must keep add-to-queue actions.');
assertContains(resultsView, 'onToggleLike', 'SearchResultsView must keep favorite actions.');
assertContains(resultsView, 'onPlayTrack', 'SearchResultsView must keep direct play actions.');
assertContains(resultsView, 'SourceBadge', 'SearchResultsView must keep source badges.');

assertContains(adapter, 'recordSearchHistory', 'Adapter search must record committed search history.');
assertContains(adapter, 'buildSearchEntities', 'Adapter must derive artist/album/playlist search entities.');
assertContains(adapter, 'searchSuggestions', 'Adapter must publish search suggestions.');
assertContains(adapter, 'searchFilter', 'Adapter state type must include search filter.');

assertContains(styles, 'mb-search__filters', 'Search filters must have stable styling.');
assertContains(styles, 'mb-search__suggestions', 'Search suggestions must have stable styling.');
assertContains(styles, 'mb-search__history', 'Search history must have stable styling.');
assertContains(styles, 'mb-search-entity', 'Search entity results must have stable styling.');

console.log('NetEase search experience guard passed.');
