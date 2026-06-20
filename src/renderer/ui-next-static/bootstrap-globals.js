(function loadUINextGlobals() {
  'use strict';

  var scripts = [
    'util.js',
    'types.js',
    'mockData.js',
    'icons.js',
    'components/TrackRow.js',
    'components/Sidebar.js',
    'components/TopSearch.js',
    'components/HomeView.js',
    'components/PlaylistView.js',
    'components/SearchResultsView.js',
    'components/QueuePanel.js',
    'components/PlayerBar.js',
    'NewMusicShell.js'
  ];

  var currentScript = document.currentScript;
  var base = currentScript && currentScript.src
    ? currentScript.src.replace(/[^/]+$/, '')
    : './ui-next/';

  document.write(scripts.map(function (script) {
    return '<script src="' + base + script + '"><\\/script>';
  }).join(''));
})();
