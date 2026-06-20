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

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected ${pattern}`);
  }
}

const styles = read('src/renderer/ui-next-static/styles.css');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');

assertMatches(
  styles,
  /\.ui-next-shell\s*\{[^}]*display:\s*grid;[^}]*grid-template-areas:\s*"sidebar topbar\s+topbar"\s*"sidebar content content"\s*"player\s+player\s+player";/s,
  'normal UI-NEXT shell must keep sidebar/topbar/content/player in grid areas'
);

assertNotMatches(
  styles,
  /\.ui-next-shell\.is-immersive\s*\{[^}]*display:\s*block;/s,
  'immersive mode must not turn the shell into block flow'
);

assertMatches(
  styles,
  /\.ui-next-shell\.is-immersive\s*>\s*\.mb-immersive\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s,
  'immersive view must cover the viewport itself'
);

assertContains(
  shell,
  "this.root.className = 'ui-next-shell';",
  'render must reset the shell base class before state classes are applied'
);

assertMatches(
  shell,
  /if \(s\.view === 'immersive-player'\) \{[\s\S]*clear\(this\.root,\s*\[[\s\S]*this\._renderImmersivePlayer\(\)/,
  'immersive render branch must render only the immersive view'
);

console.log('UI-NEXT shell layout guard passed.');
