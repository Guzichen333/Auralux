const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const checks = [
  {
    file: 'src/renderer/ui-next-static/components/PlayerBar.js',
    required: [
      {pattern: /playerTheme/, label: 'PlayerBar accepts a playerTheme option'},
      {pattern: /mb-player--sonic-topography/, label: 'PlayerBar can emit the sonic topography modifier class'},
      {pattern: /mb-player__source-line/, label: 'PlayerBar exposes a compact source/theme line'},
      {pattern: /mb-player__theme-dot/, label: 'PlayerBar includes the sonic theme accent dot'},
      {pattern: /mb-player__sonic-terrain/, label: 'PlayerBar renders a Sonic Topography terrain backplate'},
      {pattern: /mb-player__sonic-tile/, label: 'PlayerBar renders terrain tiles derived from the source map grid'}
    ]
  },
  {
    file: 'src/renderer/ui-next-static/NewMusicShell.js',
    required: [
      {pattern: /playerTheme:\s*'default'/, label: 'shell default settings keep the existing player theme'},
      {pattern: /playerTheme:\s*s\.settings/, label: 'shell passes the selected player theme to PlayerBar'},
      {pattern: /settingSelect\([^)]*playerTheme[^)]*\[/s, label: 'settings view offers a player theme select'},
      {pattern: /sonic-topography/, label: 'settings can select the sonic topography theme'},
      {pattern: /_ensureSonicTerrainLoop/, label: 'shell drives the Sonic terrain backplate loop'},
      {pattern: /getFrequencySpectrum\(.*sonicTerrainTiles/s, label: 'terrain loop uses the same frequency spectrum source as pickup bars'},
      {pattern: /--sonic-height/, label: 'terrain loop writes audio-reactive tile height variables'},
      {pattern: /--sonic-glow/, label: 'terrain loop writes audio-reactive tile glow variables'}
    ]
  },
  {
    file: 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts',
    required: [
      {pattern: /\|\s*'playerTheme'/, label: 'adapter settings key includes playerTheme'},
      {pattern: /playerTheme:\s*string;/, label: 'settings state exposes playerTheme'},
      {pattern: /settings\.playerTheme === 'sonic-topography'/, label: 'settings state persists sonic topography theme'}
    ]
  },
  {
    file: 'src/renderer/ui-next-static/styles.css',
    required: [
      {pattern: /\.mb-player--sonic-topography/, label: 'CSS defines the sonic topography player theme'},
      {pattern: /backdrop-filter:\s*blur\(20px\)/, label: 'theme ports the source glass blur'},
      {pattern: /#6ee7ff/, label: 'theme ports the source cyan progress accent'},
      {pattern: /mb-player--sonic-topography\s+\.mb-player__source-line/, label: 'theme styles the source line'},
      {pattern: /\.mb-player__sonic-terrain/, label: 'CSS defines the audio terrain backplate layer'},
      {pattern: /perspective:/, label: 'terrain backplate uses perspective like the Sonic map surface'},
      {pattern: /--sonic-height/, label: 'terrain tile height is driven by an audio variable'},
      {pattern: /--sonic-glow/, label: 'terrain tile glow is driven by an audio variable'}
    ]
  },
  {
    file: 'scripts/verify-auralux-stage35-quality-gate.js',
    required: [
      {pattern: /verify-sonic-topography-player-theme\.js/, label: 'stage quality gate includes the sonic player theme guard'}
    ]
  }
];

const failures = [];

for (const check of checks) {
  const text = read(check.file);
  for (const item of check.required) {
    if (!item.pattern.test(text)) {
      failures.push(`${check.file}: missing ${item.label}`);
    }
  }
}

function createElement(tag) {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    attributes: {},
    children: [],
    textContent: '',
    innerHTML: '',
    style: {
      setProperty(name, value) {
        this[name] = value;
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
      if (child && typeof child.textContent === 'string') {
        this.textContent += child.textContent;
      }
      return child;
    },
    addEventListener() {},
    classList: {
      add: () => {}
    }
  };
}

function walk(node, predicate, results = []) {
  if (!node) return results;
  if (predicate(node)) results.push(node);
  for (const child of node.children || []) walk(child, predicate, results);
  return results;
}

function hasClass(node, className) {
  return typeof node.className === 'string' && node.className.split(/\s+/).includes(className);
}

const vm = require('vm');
const runtime = {
  window: {},
  document: {
    createElement,
    createTextNode(text) {
      return {tagName: '#TEXT', textContent: String(text), children: []};
    }
  }
};
runtime.window.window = runtime.window;
runtime.window.document = runtime.document;
vm.createContext(runtime);
for (const file of [
  'src/renderer/ui-next-static/util.js',
  'src/renderer/ui-next-static/icons.js',
  'src/renderer/ui-next-static/components/PlayerBar.js'
]) {
  if (file.endsWith('PlayerBar.js')) {
    runtime.window.MBSourceBadge = function SourceBadge(source) {
      return runtime.window.MBUtil.h('span', {class: 'mb-source-badge'}, source || 'local');
    };
    runtime.MBUtil = runtime.window.MBUtil;
    runtime.MBIcons = runtime.window.MBIcons;
    runtime.MBSourceBadge = runtime.window.MBSourceBadge;
  }
  vm.runInContext(read(file), runtime, {filename: file});
}

const playerNode = runtime.window.MBPlayerBar({
  currentTrack: {
    title: 'demo',
    artist: 'LOCAL AUDIO',
    source: 'local',
    sourceStatusLabel: 'Local Audio',
    duration: 210,
    cover: '',
    liked: false
  },
  isPlaying: true,
  position: 58,
  volume: 0.7,
  muted: false,
  playMode: 'sequence',
  playerTheme: 'sonic-topography',
  queueCount: 0,
  queueOpen: false,
  onPrev() {},
  onPlayPause() {},
  onNext() {},
  onSeek() {},
  onVolume() {},
  onToggleMute() {},
  onCyclePlayMode() {},
  onToggleQueue() {},
  onToggleLike() {},
  onOpenImmersivePlayer() {}
});

if (!hasClass(playerNode, 'mb-player--sonic-topography')) {
  failures.push('runtime PlayerBar: missing sonic modifier class');
}
if (playerNode.getAttribute('data-player-theme') !== 'sonic-topography') {
  failures.push('runtime PlayerBar: missing data-player-theme marker');
}
if (!walk(playerNode, (node) => hasClass(node, 'mb-player__source-line')).length) {
  failures.push('runtime PlayerBar: missing rendered source line');
}
if (!walk(playerNode, (node) => hasClass(node, 'mb-player__sonic-terrain')).length) {
  failures.push('runtime PlayerBar: missing rendered sonic terrain backplate');
}
const terrainTiles = walk(playerNode, (node) => hasClass(node, 'mb-player__sonic-tile'));
if (terrainTiles.length < 24) {
  failures.push(`runtime PlayerBar: expected sonic terrain tiles, found ${terrainTiles.length}`);
}
if (!/Sonic Topography/.test(playerNode.textContent)) {
  failures.push('runtime PlayerBar: missing rendered Sonic Topography label');
}

if (failures.length > 0) {
  console.error('Sonic topography player theme guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Sonic topography player theme guard passed.');
