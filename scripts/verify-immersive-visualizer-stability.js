const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const source = fs.readFileSync(file, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-immersive-visualizer-stability] ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes('this._immersiveLastSpectrum = [];'),
  'shell must keep visualizer spectrum state for short dropout smoothing.'
);

assert(
  source.includes('NewMusicShell.prototype._stabilizeImmersiveSpectrum = function'),
  'visualizer must stabilize transient empty spectrum frames.'
);

assert(
  source.includes('NewMusicShell.prototype._smoothImmersiveBarHeight = function'),
  'visualizer must smooth per-bar height changes.'
);

assert(
  source.includes('NewMusicShell.prototype._resetImmersiveVisualizerState = function'),
  'visualizer reset must be explicit so ordinary immersive render does not clear spectrum state.'
);

assert(
  /var rawSpectrum =[\s\S]*var spectrum = this\._stabilizeImmersiveSpectrum\(rawSpectrum, bars\.length, now\);/.test(source),
  'immersive progress update must stabilize raw spectrum before rendering bars.'
);

assert(
  /height = this\._smoothImmersiveBarHeight\(i, height, spectrum\.length, now\);/.test(source),
  'immersive progress update must smooth bar height before writing DOM style.'
);

const renderMatch = source.match(/NewMusicShell\.prototype\.render = function \(\) \{([\s\S]*?)\n  \};/);
assert(renderMatch, 'render function was not found.');
assert(
  !renderMatch[1].includes('this._immersiveLastSpectrum = [];'),
  'ordinary render must not clear visualizer spectrum state because it causes FFT/idle flicker.'
);

console.log('[verify-immersive-visualizer-stability] ok');
