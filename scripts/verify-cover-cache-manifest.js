const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const checks = [
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /PLAYLIST_COVER_MANIFEST_KEY/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /PLAYLIST_COVER_CACHE_NAME/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /inFlight/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /MAX_CONCURRENT_COVER_CHECKS\s*=\s*3/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /retryAfter/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /Promise<PlaylistCoverManifestEntry/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /caches\.open/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /cache\.match/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /cache\.put/],
    ['src/renderer/src/ui-next/playlistCoverManifest.ts', /console\.info\('\[ui-next\] playlist cover cache/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /playlistCoverManifest/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /preloadStableCoverMetadata/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /resolveCachedPlaylistCover/],
    ['src/renderer/src/ui-next/UINextMusicBoxAdapter.ts', /ensurePlaylistCover/]
];

const failures = [];

for (const [file, pattern] of checks) {
    const absolutePath = path.join(root, file);
    if (!fs.existsSync(absolutePath)) {
        failures.push(`${file}: missing file`);
        continue;
    }

    const source = fs.readFileSync(absolutePath, 'utf8');
    if (!pattern.test(source)) {
        failures.push(`${file}: missing ${pattern}`);
    }
}

if (failures.length > 0) {
    console.error('Cover cache manifest guard failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Cover cache manifest guard passed.');
