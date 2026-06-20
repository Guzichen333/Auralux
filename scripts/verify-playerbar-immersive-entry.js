const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const playerBarPath = path.join(root, 'src', 'renderer', 'ui-next-static', 'components', 'PlayerBar.js');
const shellPath = path.join(root, 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const adapterPath = path.join(root, 'src', 'renderer', 'src', 'ui-next', 'UINextMusicBoxAdapter.ts');
const stylesPath = path.join(root, 'src', 'renderer', 'ui-next-static', 'styles.css');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assertContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

const playerBar = read(playerBarPath);
const shell = read(shellPath);
const adapter = read(adapterPath);
const styles = read(stylesPath);

assertContains(playerBar, "class: 'mb-player__cover-btn'", 'player cover button');
assertContains(playerBar, 'var openImmersiveFromCurrent = function (e)', 'current-track block immersive click handler');
assertContains(playerBar, "target.closest('.mb-player__like')", 'current-track click ignores like button');
assertContains(playerBar, "class: 'mb-player__current'", 'current-track block');
assertContains(playerBar, 'onclick: openImmersiveFromCurrent', 'current-track block opens immersive');
assertContains(playerBar, 'e.stopPropagation', 'like button does not bubble into immersive entry');
assertContains(playerBar, 'o.onOpenImmersivePlayer && o.onOpenImmersivePlayer(e);', 'cover click immersive callback with event');
assertContains(shell, 'onOpenImmersivePlayer: function (e) { self._openImmersiveFromPlayerCover(e); }', 'PlayerBar immersive callback binding');
assertContains(shell, "this._recordImmersiveEntryProbe('playerbar-cover-click'", 'delegated cover click probe');
assertContains(shell, "target.closest('.mb-player__cover-btn')", 'delegated cover click target');
assertContains(shell, 'NewMusicShell.prototype._isPlayerCoverEntryClick', 'capture-phase player cover hotzone guard');
assertContains(shell, 'self._isPlayerCoverEntryClick(e)', 'capture listener uses player cover hotzone guard');
assertContains(shell, '}, true);', 'player cover entry is guarded during capture phase');
assertContains(shell, "this.root.querySelector('.mb-player__current')", 'playerbar current block participates in hit testing');
assertContains(shell, "target.closest('.mb-player__like')", 'playerbar like button is excluded from immersive entry');
assertContains(shell, "hotzone: 'playerbar-cover'", 'playerbar cover hotzone probe');
assertContains(shell, 'NewMusicShell.prototype._openImmersiveFromPlayerCover', 'dedicated cover immersive entry');
assertContains(shell, 'NewMusicShell.prototype._recordImmersiveEntryProbe', 'immersive entry runtime probe');
assertContains(shell, "this._pushHistory('immersive-player', null);", 'immersive history entry');
assertContains(shell, 'this.adapter.openImmersivePlayer();', 'adapter immersive handoff');
assertContains(shell, "this.state.view = 'immersive-player';", 'shell fallback immersive view');
assertContains(adapter, "this.shell.state.view = 'immersive-player';", 'adapter immersive view state');
assertContains(adapter, 'this.shell.render();', 'adapter render after immersive state');

assertMatches(
  styles,
  /\.mb-player\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*\d+;[^}]*-webkit-app-region:\s*no-drag;/s,
  'clickable player stacking and no-drag guard'
);
assertMatches(
  styles,
  /\.mb-player__cover-btn\s*\{[^}]*cursor:\s*pointer;[^}]*pointer-events:\s*auto;[^}]*-webkit-app-region:\s*no-drag;/s,
  'clickable cover button guard'
);
assertMatches(
  styles,
  /\.mb-player__current\s*\{[^}]*cursor:\s*pointer;[^}]*-webkit-app-region:\s*no-drag;/s,
  'clickable current-track block guard'
);
assertMatches(
  styles,
  /\.mb-player__cover-btn\s+\*[\s\S]*?pointer-events:\s*none;/s,
  'cover children do not intercept button click'
);

console.log('playerbar immersive entry guard passed');
