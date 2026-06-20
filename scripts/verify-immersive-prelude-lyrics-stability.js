const fs = require('fs');
const path = require('path');

const shellPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const shell = fs.readFileSync(shellPath, 'utf8');

const activeTimeIndex = shell.indexOf('var activeTime = active >= 0');
const activeChangedIndex = shell.indexOf('var activeChanged = active !== this._immersiveLastActive');
if (activeTimeIndex < 0 || activeChangedIndex < 0 || activeChangedIndex <= activeTimeIndex) {
  throw new Error('Could not locate immersive lyric active-time update block.');
}

const block = shell.slice(activeTimeIndex, activeChangedIndex);

if (!/if\s*\(\s*active\s*<\s*0\s*\)/.test(block)) {
  throw new Error('Prelude lyric state must be handled before active-line matching.');
}

if (/_refreshImmersiveLyricsWindow\s*\(/.test(block)) {
  throw new Error('Prelude lyric state must not trigger lyric-window refresh/render loop.');
}

if (!/_immersivePerf\)\s*this\._immersivePerf\.maybeLog\(this\.root\)/.test(block)) {
  throw new Error('Prelude lyric state should still allow perf logs to flush.');
}

console.log('verify-immersive-prelude-lyrics-stability: ok');
