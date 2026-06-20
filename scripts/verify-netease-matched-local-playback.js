const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, needle, message) {
    if (!source.includes(needle)) {
        throw new Error(message);
    }
}

function assertNotContains(source, needle, message) {
    if (source.includes(needle)) {
        throw new Error(message);
    }
}

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');

assertContains(adapter, 'MATCHED_LOCAL_PLAYBACK_CONFIDENCE', 'Adapter must define a high-confidence threshold for matched local playback');
assertContains(adapter, 'resolvePlaybackTrack(track', 'Adapter must resolve playback tracks separately from display/original tracks');
assertContains(adapter, 'resolveTrustedLocalPlaybackMatch', 'Adapter must isolate trusted local match selection');
assertContains(adapter, 'match.corrected === true', 'Manual corrections must be trusted for local playback');
assertContains(adapter, 'match.confidence >= MATCHED_LOCAL_PLAYBACK_CONFIDENCE', 'Only high-confidence metadata matches may prefer local playback');
assertContains(adapter, "match.status !== 'matched'", 'Non-matched statuses must not prefer local playback');
assertContains(adapter, "match.matchedTrack.filePath.startsWith('netease://')", 'Matched local playback must reject cloud file paths');
assertContains(adapter, 'safeResolvedTrack', 'Playback resolution must fall back to cloud/original track on resolver failure');
assertContains(adapter, 'this.resolvePlaybackTrack(track)', 'Single-track playback must use matched-local playback resolution');
assertContains(adapter, 'this.resolvePlaybackTrack(track)', 'Batch playback must use matched-local playback resolution');
assertContains(adapter, 'matchedLocalPlayback', 'Resolved local playback tracks must carry a visible matched-local marker');
assertContains(adapter, 'track.matchedLocalPlayback', 'Playback cache/status labels must reflect matched-local playback');
assertNotContains(adapter, "match.status === 'cloud-only' && match.matchedTrack", 'Cloud-only matches must not be used for local playback');
assertNotContains(adapter, "match.status === 'conflict' && match.matchedTrack", 'Conflict matches must not be used for local playback');

console.log('NetEase matched local playback guard passed.');
