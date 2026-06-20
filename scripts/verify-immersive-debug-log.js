const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const source = fs.readFileSync(file, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-immersive-debug-log] ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes("localStorage.getItem('auraluxImmersiveDebug') === '1'"),
  'immersive debug logging must be opt-in through localStorage.'
);

assert(
  source.includes('NewMusicShell.prototype._recordImmersiveDebugFrame = function'),
  'immersive debug frame recorder must exist.'
);

assert(
  source.includes('globalObject.__auraluxImmersiveDebug = state'),
  'immersive debug state must be exposed for developer-log inspection.'
);

assert(
  source.includes('if (state.frames.length > 240)'),
  'immersive debug frames must be bounded to a ring buffer.'
);

const recorder = source.match(/NewMusicShell\.prototype\._recordImmersiveDebugFrame = function \(frame\) \{([\s\S]*?)\n  \};/);
assert(recorder, 'debug recorder body was not found.');
assert(
  !/querySelector|getComputedStyle|getBoundingClientRect/.test(recorder[1]),
  'debug recorder must not perform DOM/style reads.'
);

console.log('[verify-immersive-debug-log] ok');
