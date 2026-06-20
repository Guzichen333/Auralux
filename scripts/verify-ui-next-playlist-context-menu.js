const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];

function expect(file, pattern, label) {
  const source = read(file);
  const ok = pattern.test(source);
  checks.push({ file, label, ok });
}

expect(
  'src/renderer/ui-next-static/components/Sidebar.js',
  /oncontextmenu:\s*opts\.onContextMenu/,
  'sidebar nav items expose a right-click handler'
);
expect(
  'src/renderer/ui-next-static/components/Sidebar.js',
  /onOpenPlaylistContextMenu/,
  'playlist rows call the UI-NEXT playlist context-menu hook'
);
expect(
  'src/renderer/ui-next-static/NewMusicShell.js',
  /playlistContextMenu:\s*\{/,
  'shell state tracks playlist context-menu position and target'
);
expect(
  'src/renderer/ui-next-static/NewMusicShell.js',
  /openPlaylistContextMenu/,
  'shell can open the playlist context menu'
);
expect(
  'src/renderer/ui-next-static/NewMusicShell.js',
  /_renderPlaylistContextMenu/,
  'shell renders the playlist context menu'
);
expect(
  'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts',
  /async\s+renamePlaylist\(playlistId:\s*string\)/,
  'adapter exposes renamePlaylist for UI-NEXT'
);
expect(
  'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts',
  /只会从 Auralux 删除/,
  'delete confirmation explains NetEase playlists are removed locally only'
);
expect(
  'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts',
  /if\s*\(!playlist\)\s*\{/,
  'deletePlaylist no longer silently blocks NetEase-source playlists'
);
expect(
  'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts',
  /playlist\.source === 'netease'[\s\S]*不会删除网易云云端歌单/,
  'deletePlaylist has NetEase-specific safety copy'
);
expect(
  'src/renderer/ui-next-static/styles.css',
  /\.mb-playlist-context-menu/,
  'context menu has UI-NEXT styles'
);

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('UI-NEXT playlist context-menu verification failed:');
  failed.forEach((check) => {
    console.error(`- ${check.file}: ${check.label}`);
  });
  process.exit(1);
}

console.log(`UI-NEXT playlist context-menu verification passed (${checks.length} checks).`);
