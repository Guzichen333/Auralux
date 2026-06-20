const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const shellPath = path.join(root, 'src/renderer/ui-next-static/NewMusicShell.js');
const source = fs.readFileSync(shellPath, 'utf8');

function assertContains(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

assertContains(
  source,
  'NewMusicShell.prototype._isBottomLeftPlayerEntryClick = function (event) {',
  'bottom-left coordinate hotzone helper is missing'
);
assertContains(
  source,
  "target.closest && target.closest('.mb-player__like, #player .like-button, #player #like-btn')",
  'coordinate hotzone must exclude like/favorite controls'
);
assertContains(
  source,
  "hotzone: 'bottom-left-player-coordinate'",
  'coordinate hotzone must record diagnostic marker'
);
assertContains(
  source,
  'if (self._isBottomLeftPlayerEntryClick(e)) {',
  'capture listener must check coordinate hotzone before root containment'
);
assertContains(
  source,
  'self._openImmersiveFromPlayerCover(e);',
  'coordinate hotzone must use the same immersive entry path'
);

console.log('playerbar coordinate hotzone guard passed');
