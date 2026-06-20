const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(source, expected, message) {
    if (!source.includes(expected)) {
        throw new Error(message);
    }
}

function assertNotContains(source, unexpected, message) {
    if (source.includes(unexpected)) {
        throw new Error(message);
    }
}

const syncService = read('src/renderer/src/features/netease/service/NetEasePlaylistSyncService.ts');
const webAudioLoader = read('src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts');
const uiNextAdapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');

assertNotContains(syncService, '鏃犳晥鐨勭綉鏄撲簯姝屽崟 ID', 'NetEase playlist sync invalid ID copy must not be mojibake');
assertContains(syncService, '无效的网易云歌单 ID', 'NetEase playlist sync invalid ID copy must be Chinese');

assertNotContains(webAudioLoader, '缃戞槗浜戞挱鏀惧湴鍧€涓虹┖', 'NetEase stream empty URL copy must not be mojibake');
assertContains(webAudioLoader, '网易云播放地址为空', 'NetEase stream empty URL copy must be Chinese');

assertNotContains(uiNextAdapter, 'NetEase sync conflict. Continue while protecting local tracks?', 'NetEase sync conflict fallback must not be English');
assertContains(uiNextAdapter, '网易云同步检测到冲突，是否在保护本地歌曲的前提下继续？', 'NetEase sync conflict fallback must be Chinese');

console.log('verify-stage36-visible-copy-cleanup: ok');
