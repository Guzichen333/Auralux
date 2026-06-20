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

const playerBar = read('src/renderer/ui-next-static/components/PlayerBar.js');

assertContains(playerBar, 'var currentRatio =', 'slider must keep a stable current ratio');
assertContains(playerBar, 'currentRatio = ratio;', 'applyRatio must update current ratio');
assertContains(playerBar, 'var rect = root.getBoundingClientRect();', 'seek ratio must use the clickable slider root width');
assertMatches(
  playerBar,
  /if \(!rect\.width \|\| rect\.width < 2\) return currentRatio;/,
  'zero-width slider must not clamp to the end'
);
assertMatches(
  playerBar,
  /opts\.onChange && opts\.onChange\(currentRatio, false\);/,
  'commit must use the stable current ratio instead of parsing style width'
);
assertMatches(
  playerBar,
  /opts\.onCommit && opts\.onCommit\(currentRatio\);/,
  'onCommit must use the stable current ratio instead of parsing style width'
);

console.log('PlayerBar seek ratio guard passed.');
