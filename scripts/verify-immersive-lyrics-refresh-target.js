const fs = require('fs');
const path = require('path');

const shellPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'NewMusicShell.js');
const viewPath = path.join(__dirname, '..', 'src', 'renderer', 'ui-next-static', 'components', 'ImmersivePlayerView.js');

const shell = fs.readFileSync(shellPath, 'utf8');
const view = fs.readFileSync(viewPath, 'utf8');

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

assertContains(
  view,
  /Number\.isFinite\(Number\(o\.activeLyricsIndex\)\)[\s\S]*activeLyricIndex\(lyrics,\s*o\.position\s*\|\|\s*0\)/,
  'ImmersivePlayerView must allow the shell to render a requested active lyric window.'
);

assertContains(
  shell,
  /activeLyricsIndex:\s*this\._immersiveRenderActive/,
  'NewMusicShell must pass the requested lyric index into ImmersivePlayerView.'
);

assertContains(
  shell,
  /self\._immersiveRenderActive\s*=\s*active;[\s\S]*self\.render\(\);[\s\S]*self\._immersiveRenderActive\s*=\s*null;/,
  'Lyric refresh must render the requested active window once and then clear the override.'
);

console.log('verify-immersive-lyrics-refresh-target: ok');
