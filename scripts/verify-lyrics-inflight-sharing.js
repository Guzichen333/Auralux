const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const lookup = fs.readFileSync(path.join(root, 'src/renderer/src/features/mediaAssets/service/LyricsLookupService.ts'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'src/renderer/src/ui-next/UINextMusicBoxAdapter.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-lyrics-inflight-sharing] ${message}`);
    process.exit(1);
  }
}

assert(
  /lyricsRequestLock\s*=\s*new Map<string,\s*Promise<LyricsResult>>\(\)/.test(lookup),
  'lyrics lookup must store in-flight requests as promises, not only a Set lock.'
);

assert(
  /const inFlight = this\.lyricsRequestLock\.get\(lyricsKey\)[\s\S]*return await inFlight/.test(lookup),
  'duplicate lyrics requests must await the existing in-flight promise.'
);

assert(
  /private async resolveLyricsRequest\(/.test(lookup),
  'lyrics lookup must separate request execution from in-flight sharing.'
);

assert(
  /this\.lyricsRequestLock\.get\(lyricsKey\) === request[\s\S]*this\.lyricsRequestLock\.delete\(lyricsKey\)/.test(lookup),
  'lyrics in-flight promise must be cleared only if it is still the current request.'
);

assert(
  !/歌词获取已在进行中/.test(lookup) && !/姝岃瘝鑾峰彇宸插湪杩涜/.test(lookup),
  'lyrics lookup must not expose "lyrics request already in progress" as a terminal UI error.'
);

assert(
  /immersiveLyricsLoading = false/.test(adapter)
    && /finally\s*\{[\s\S]*session === this\.immersiveLyricsSession[\s\S]*this\.shell\.state\.immersiveLyricsLoading = false/.test(adapter),
  'immersive lyrics loading state must still clear in loadCurrentLyrics finally.'
);

console.log('[verify-lyrics-inflight-sharing] ok');
