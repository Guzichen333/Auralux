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

const immersive = read('src/renderer/ui-next-static/components/ImmersivePlayerView.js');

assertContains(immersive, 'var currentRatio =', 'immersive seek must keep a stable current ratio');
assertContains(immersive, 'var activeRect = null;', 'immersive seek must cache the active target rect');
assertMatches(
  immersive,
  /if \(!rect \|\| !rect\.width \|\| rect\.width < 2\) return currentRatio;/,
  'invalid immersive seek width must not clamp to the end'
);
assertMatches(
  immersive,
  /if \(!point \|\| typeof point\.clientX !== 'number'\) return currentRatio;/,
  'mouseup or touchend without clientX must not recompute as end'
);
assertContains(immersive, 'activeRect = activeTarget.getBoundingClientRect();', 'active rect must be captured on pointer down');
assertContains(immersive, 'onSeek(currentRatio, false);', 'commit must use stable ratio');
assertContains(immersive, 'activeRect = null;', 'active rect must be cleared after commit');

console.log('Immersive seek ratio guard passed.');
