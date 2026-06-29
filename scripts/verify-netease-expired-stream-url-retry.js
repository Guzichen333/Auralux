const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-netease-expired-stream-url-retry] ${message}`);
    process.exit(1);
  }
}

assert(
  /private\s+async\s+prepareNeteaseElementWithRetry\s*\(/.test(loader),
  'WebAudioTrackLoader must prepare NetEase streams through a retry-aware helper.'
);

assert(
  /neteaseStreamUrlCache\.delete\(songId\)/.test(loader),
  'NetEase stream retry must clear the cached upstream URL before retrying.'
);

assert(
  /createNeteaseRemoteSourceUrl\(songId,\s*true\)/.test(loader),
  'NetEase stream retry must force a fresh /song/url/v1 URL.'
);

assert(
  /catch\s*\(firstError\)[\s\S]*prepareElement\(audioElement,\s*retrySourceUrl,\s*preload\)[\s\S]*waitForMetadata\(audioElement\)/.test(loader),
  'NetEase metadata-load failure must retry the media element with a fresh proxy URL.'
);

assert(
  /var\s+prepared\s*=|let\s+prepared\s*=/.test(loader)
    && /if\s*\(!prepared\)\s*\{[\s\S]*prepareElement\(audioElement,\s*sourceUrl,\s*preload\)[\s\S]*waitForMetadata\(audioElement\)/.test(loader),
  'Non-NetEase tracks must keep the normal single prepare/wait path.'
);

console.log('[verify-netease-expired-stream-url-retry] ok');
