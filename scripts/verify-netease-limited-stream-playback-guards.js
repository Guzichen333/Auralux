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

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertMatches(
  adapter,
  /if \(!Number\.isFinite\(ratio\)\) \{\s*return;\s*\}/s,
  'UI-NEXT seek must ignore non-finite ratios before changing optimistic playback state'
);
assertContains(
  adapter,
  'const safeRatio = Math.max(0, Math.min(1, ratio));',
  'UI-NEXT seek must clamp the ratio once before computing next position'
);
assertContains(
  adapter,
  'safeRatio * duration',
  'UI-NEXT seek must compute position from the safe ratio'
);

const loader = read('src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts');
assertContains(
  loader,
  'const duration = this.resolvePlaybackDuration(metadata.duration, mediaDuration, isNeteaseUrl(filePath));',
  'WebAudio loader must resolve NetEase playback duration from media metadata when detail duration is misleading'
);
assertMatches(
  loader,
  /private resolvePlaybackDuration\(metadataDuration: number \| undefined, mediaDuration: number, neteaseTrack: boolean\): number \{/,
  'WebAudio loader must expose a focused playback duration resolver'
);
assertContains(
  loader,
  'const ratio = mediaDuration / metadataDuration;',
  'WebAudio loader must compare actual media duration against NetEase detail duration'
);
assertContains(
  loader,
  'if (neteaseTrack && mediaDuration > 0 && metadataDuration > 0 && ratio < 0.65)',
  'WebAudio loader must prefer short actual NetEase stream duration when it is far below detail duration'
);

const lyrics = read('src/renderer/src/features/netease/service/NetEaseLyricsService.ts');
assertContains(
  lyrics,
  'private sanitizeYRCLines(lines: LyricLine[]): LyricLine[]',
  'NetEase YRC parsing must sanitize line and word timing'
);
assertContains(
  lyrics,
  'return this.sanitizeYRCLines(lines);',
  'NetEase YRC parsing must return sanitized lines'
);
assertContains(
  lyrics,
  'word.time >= line.time',
  'NetEase YRC word timing must not start before its parent line'
);
assertContains(
  lyrics,
  'word.endTime == null || word.endTime >= word.time',
  'NetEase YRC word end timing must not precede word start timing'
);

const immersive = read('src/renderer/ui-next-static/components/ImmersivePlayerView.js');
assertMatches(
  immersive,
  /var index = -1;\s*for \(var i = 0; i < lyrics\.length; i\+\+\) \{/,
  'immersive lyrics must not default to the first line before its timestamp'
);
assertContains(
  immersive,
  'return index;',
  'immersive lyric active index must be able to remain -1 before first line'
);

console.log('NetEase limited stream playback guards passed.');
