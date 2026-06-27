const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts'), 'utf8');
const protocol = fs.readFileSync(path.join(root, 'src/main/services/audio/AudioStreamProtocol.ts'), 'utf8');

const checks = [];
function expect(ok, label) {
  checks.push({ok, label});
}

const neteaseBlock = loader.match(/if \(isNeteaseUrl\(filePath\)\) \{([\s\S]*?)\n\s+\} else if \(isHttpUrl/)?.[1] || '';
const remoteSourceUrlRegion = loader.slice(
  loader.indexOf('private async createNeteaseRemoteSourceUrl'),
  loader.indexOf('private hydrateNeteaseTrackMetadata')
);
const metadataWaitRegion = loader.slice(
  loader.indexOf('private async waitForMetadata'),
  loader.indexOf('private async getTrackMetadata')
);
const remoteFetchRegion = protocol.slice(
  protocol.indexOf('async function fetchValidatedRemoteAudio'),
  protocol.indexOf('async function serveRemoteAudio')
);

expect(/NETEASE_STREAM_URL_TIMEOUT_MS/.test(loader), 'loader defines NetEase stream URL timeout');
expect(/NETEASE_SONG_DETAIL_TIMEOUT_MS/.test(loader), 'loader defines NetEase detail timeout');
expect(/NETEASE_LYRICS_TIMEOUT_MS/.test(loader), 'loader defines NetEase lyrics timeout');
expect(/withTimeout\(fetchNeteaseStreamUrlUncached\(songId\), NETEASE_STREAM_URL_TIMEOUT_MS/.test(loader), 'stream URL request is timeout bounded');
expect(!/const \[streamUrl,\s*songDetail,\s*lyricsResult\] = await Promise\.all/.test(neteaseBlock), 'NetEase load no longer waits for stream/detail/lyrics Promise.all before source setup');
expect(/prepareNeteaseElementWithRetry\(songId,\s*audioElement,\s*preload\)/.test(neteaseBlock), 'NetEase load prepares source through the retry-aware stream helper');
expect(/const streamUrl = await fetchNeteaseStreamUrl\(songId\)/.test(remoteSourceUrlRegion), 'NetEase stream helper only awaits stream URL before remote stream URL creation');
expect(/return await audioFileReaderService\.createRemoteAudioStreamUrl\(streamUrl\)/.test(remoteSourceUrlRegion), 'NetEase stream helper creates the remote proxy URL immediately after stream URL');
expect(/hydrateNeteaseTrackMetadata\(track, neteaseSongIdForHydration\)/.test(loader), 'NetEase detail and lyrics hydrate track in background');
expect(/MEDIA_METADATA_TIMEOUT_MS/.test(loader), 'loader defines media metadata timeout');
expect(/setTimeout\(\(\) => \{[\s\S]*Timed out waiting for media metadata/.test(metadataWaitRegion), 'metadata wait has timeout rejection');
expect(/REMOTE_AUDIO_FETCH_TIMEOUT_MS/.test(protocol), 'remote audio proxy defines fetch timeout');
expect(/new AbortController\(\)/.test(remoteFetchRegion), 'remote audio proxy creates abort controller');
expect(/signal: abortController\.signal/.test(remoteFetchRegion), 'remote audio proxy passes abort signal to fetch');
expect(/clearTimeout\(timeoutId\)/.test(remoteFetchRegion), 'remote audio proxy clears fetch timeout');

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error('NetEase stream timeout verification failed:');
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log(`NetEase stream timeout verification passed (${checks.length} checks).`);
