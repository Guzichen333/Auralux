const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapter = fs.readFileSync(path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts'), 'utf8');
const immersive = fs.readFileSync(path.join(root, 'src/renderer/ui-next-static/components/ImmersivePlayerView.js'), 'utf8');
const util = fs.readFileSync(path.join(root, 'src/renderer/ui-next-static/util.js'), 'utf8');

function assertContains(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

assertContains(adapter, 'cover: this.resolveTrackCover(track),', 'UI-NEXT adapter must sanitize track cover values');
assertContains(adapter, 'private resolveTrackCover(track: Track): string | null {', 'UI-NEXT adapter cover sanitizer is missing');
assertContains(adapter, "typeof cover === 'string' && cover.length > 0", 'cover sanitizer must accept only non-empty strings');

assertContains(immersive, 'safeMediaSrc(track.cover)', 'immersive player must use safe media src for track covers');
assertContains(immersive, 'function safeMediaSrc(value) {', 'immersive safe media helper is missing');
assertContains(immersive, "typeof value === 'string' && value.length > 0", 'immersive safe media helper must reject non-string covers');

assertContains(util, "if (typeof url === 'string' && url.length > 0) {", 'cover utility must reject non-string image sources');

console.log('UI-NEXT cover safety guard passed');
