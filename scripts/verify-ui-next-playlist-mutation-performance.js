const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adapterPath = path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const source = fs.readFileSync(adapterPath, 'utf8');
const checks = [];

function expect(pattern, label) {
  checks.push({label, ok: pattern.test(source)});
}

function methodBody(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = new RegExp(`(?:^|\\n)\\s*(?:(?:private|public|protected)\\s+)?(?:async\\s+)?${escapedName}\\s*\\(`, 'g');
  const match = declaration.exec(source);
  const start = match?.index ?? -1;
  if (start === -1) return '';
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(brace, i + 1);
  }
  return '';
}

expect(/private librarySnapshotPromise: Promise<void> \| null = null;/, 'adapter coalesces concurrent library snapshot refreshes');
expect(/private requestLibrarySnapshotRefresh\(\): Promise<void>/, 'adapter exposes a single refresh scheduler');
expect(/private notifyLibraryChanged\(\): void/, 'adapter has a non-blocking mutation notification path');
expect(/private scheduleLibrarySnapshotReconcile\(\): void/, 'adapter schedules delayed background reconciliation');
expect(/private applyCreatedPlaylistOptimistically/, 'adapter can insert created playlists without full snapshot reload');
expect(/private applyDeletedPlaylistOptimistically/, 'adapter can remove deleted playlists without full snapshot reload');
expect(/private applyRenamedPlaylistOptimistically/, 'adapter can rename playlists without full snapshot reload');
expect(/private async loadLibrarySnapshot\(\): Promise<void>/, 'adapter keeps the actual snapshot loader private');
expect(/preloadStableCoverMetadata\(uiPlaylists/, 'playlist cover refresh uses startup/background metadata preload');

const loadBody = methodBody('loadLibrarySnapshot');
checks.push({
  label: 'loadLibrarySnapshot does not hydrate every playlist cover on every mutation',
  ok: !/hydratePlaylistCovers\(uiPlaylists\)/.test(loadBody)
});
checks.push({
  label: 'loadLibrarySnapshot does not render once per resolved playlist cover',
  ok: !/resolveCachedPlaylistCoverAsync\(playlist\)[\s\S]*this\.shell\.render\(\)/.test(loadBody)
});

for (const name of ['createPlaylist', 'deletePlaylist', 'renamePlaylist', 'refreshPlaylist']) {
  const body = methodBody(name);
  checks.push({
    label: `${name} uses non-blocking mutation notification instead of directly loading the full snapshot`,
    ok: /notifyLibraryChanged\(\)/.test(body) && !/loadLibrarySnapshot\(\)/.test(body)
  });
}

for (const [name, helper] of [
  ['createPlaylist', 'applyCreatedPlaylistOptimistically'],
  ['deletePlaylist', 'applyDeletedPlaylistOptimistically'],
  ['renamePlaylist', 'applyRenamedPlaylistOptimistically']
]) {
  const body = methodBody(name);
  checks.push({
    label: `${name} updates visible playlist state optimistically`,
    ok: new RegExp(`${helper}\\(`).test(body)
  });
}

const notifyBody = methodBody('notifyLibraryChanged');
checks.push({
  label: 'notifyLibraryChanged does not await a full snapshot refresh',
  ok: /scheduleLibrarySnapshotReconcile\(\)/.test(notifyBody) && !/return new Promise/.test(notifyBody)
});

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('UI-NEXT playlist mutation performance verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`UI-NEXT playlist mutation performance verification passed (${checks.length} checks).`);
