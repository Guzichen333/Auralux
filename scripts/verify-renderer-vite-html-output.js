const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src', 'renderer', 'vite.config.js');
const source = fs.readFileSync(configPath, 'utf8');

function assertContains(value, needle, message) {
  if (!value.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotContains(value, needle, message) {
  if (value.includes(needle)) {
    throw new Error(message);
  }
}

assertContains(source, "const rendererSrcRoot = path.resolve(__dirname, 'src');", 'renderer src root must be absolute');
assertContains(source, "root: rendererSrcRoot", 'vite root must use the absolute renderer src root');
assertContains(source, "outDir: path.resolve(__dirname, 'public')", 'vite outDir must use absolute public directory');
assertContains(source, "main: path.resolve(rendererSrcRoot, 'index.html')", 'main html input must be rooted under rendererSrcRoot');
assertContains(source, "desktopLyrics: path.resolve(rendererSrcRoot, 'DesktopLyrics.html')", 'desktop lyrics html input must use a safe chunk name');
assertNotContains(source, "'DesktopLyrics': path.resolve(__dirname, 'src/DesktopLyrics.html')", 'legacy relative DesktopLyrics input must not remain');

console.log('Renderer Vite HTML output guard passed.');
