const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src', 'renderer', 'ui-next-static', 'components', 'ImmersivePlayerView.js');
const source = fs.readFileSync(file, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-immersive-player-playing-entry] ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes('bindSeek(root, onSeek, ratio);'),
  'renderWaveform must pass the computed ratio into bindSeek.'
);

const bindSeekMatch = source.match(/function bindSeek\s*\(([^)]*)\)\s*\{([\s\S]*?)\n  \}/);
assert(bindSeekMatch, 'bindSeek function was not found.');

const params = bindSeekMatch[1].split(',').map((item) => item.trim());
assert(
  params.includes('initialRatio'),
  'bindSeek must accept initialRatio explicitly instead of reading renderWaveform local state.'
);

assert(
  bindSeekMatch[2].includes("typeof initialRatio === 'number'"),
  'bindSeek must initialize currentRatio from initialRatio safely.'
);

assert(
  !/\bcurrentRatio\s*=\s*ratio\b/.test(bindSeekMatch[2]),
  'bindSeek must not reference an out-of-scope ratio variable.'
);

console.log('[verify-immersive-player-playing-entry] ok');
