const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const files = {
  coverManifest: 'src/renderer/src/ui-next/playlistCoverManifest.ts',
  startupWarmup: 'src/renderer/src/ui-next/startupWarmup.ts',
  cacheManager: 'src/renderer/src/shared/cache/CacheManager.ts'
};

const checks = [
  [files.coverManifest, /COVER_FRESH_MS/, 'cover cache freshness window is missing'],
  [files.coverManifest, /COVER_STALE_WHILE_REVALIDATE_MS/, 'cover stale-while-revalidate window is missing'],
  [files.coverManifest, /isFreshCoverEntry/, 'cover freshness helper is missing'],
  [files.coverManifest, /isStaleButUsableCoverEntry/, 'stale cover reuse helper is missing'],
  [files.coverManifest, /preloadStableCoverMetadata/, 'startup cover metadata preload API is missing'],
  [files.coverManifest, /refreshPlaylistCoverInBackground/, 'background cover refresh API is missing'],
  [files.startupWarmup, /playlistCoverManifest/, 'startup warmup must consume playlist cover manifest'],
  [files.startupWarmup, /preloadStableCoverMetadata/, 'startup warmup must preload cover metadata'],
  [files.cacheManager, /LYRICS_CACHE_INDEX_KEY/, 'lyrics cache index key is missing'],
  [files.cacheManager, /LYRICS_CACHE_FRESH_MS/, 'lyrics freshness window is missing'],
  [files.cacheManager, /getLyricsCacheIndex/, 'lyrics cache index reader is missing'],
  [files.cacheManager, /warmLyricsCacheIndex/, 'lyrics cache index warmup API is missing'],
  [files.startupWarmup, /warmLyricsCacheIndex/, 'startup warmup must warm lyrics cache index']
];

const failures = [];

for (const [file, pattern, message] of checks) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${file}: missing file`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  if (!pattern.test(source)) {
    failures.push(`${file}: ${message}`);
  }
}

if (failures.length > 0) {
  console.error('Cache system expansion guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Cache system expansion guard passed.');
