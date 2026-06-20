const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

function assertNotContains(source, forbidden, label) {
  if (source.includes(forbidden)) {
    throw new Error(`${label}: unexpected ${forbidden}`);
  }
}

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected ${pattern}`);
  }
}

const shell = read('src/renderer/ui-next-static/NewMusicShell.js');

assertMatches(
  shell,
  /var minFrameMs = smoothVideoMode \? 33 : 0;/,
  'non-video immersive playback must keep the original requestAnimationFrame visual cadence'
);
assertMatches(
  shell,
  /this\.adapter && typeof this\.adapter\.getFrequencySpectrum === 'function'\s*\?\s*this\.adapter\.getFrequencySpectrum\(bars\.length\)\s*:\s*\[\]/,
  'immersive pickup bars must use the live spectrum directly'
);

assertNotContains(shell, '_shouldSyncImmersiveSmoothClock', 'immersive clock sync guard must not suppress smooth progress');
assertNotContains(shell, '_getThrottledImmersiveSpectrum', 'immersive spectrum must not be globally throttled');
assertNotContains(shell, '_syncImmersiveVisualizerTrack', 'immersive visualizer must not reset through track-key warmup state');
assertNotContains(shell, '_immersiveVisualizerWarmupStartedAt', 'immersive startup warmup must not alter visual feel');
assertNotContains(shell, '_immersiveLastStablePosition', 'immersive progress must not clamp backward seeks');
assertNotMatches(shell, /warmupProgress = clamp/, 'visualizer warmup ramp');
assertNotMatches(shell, /Math\.abs\(height - lastHeight\) >= 1\.2/, 'height write skipping');

console.log('Playback visualizer fidelity guard passed.');
