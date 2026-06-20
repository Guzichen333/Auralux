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

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const localMatchService = read('src/renderer/src/features/netease/service/NetEaseLocalMatchService.ts');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const trackRow = read('src/renderer/ui-next-static/components/TrackRow.js');

assertContains(localMatchService, 'saveCorrection(', 'NetEase local match service must persist manual corrections');
assertContains(localMatchService, 'manual-correction', 'Manual correction must be reflected in match reasons');

assertContains(adapter, 'async onCorrectLocalMatch', 'Adapter correction entry must be asynchronous');
assertContains(adapter, '选择本地音乐文件', 'Manual correction must open a user-visible local music picker');
assertContains(adapter, "properties: ['openFile']", 'Manual correction must select exactly one file');
assertContains(adapter, "extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg']", 'Manual correction picker must restrict to music files');
assertContains(adapter, 'findLocalTrackByPath', 'Adapter must resolve the chosen file to an existing local library track');
assertContains(adapter, 'netEaseLocalMatchService.saveCorrection', 'Adapter must persist the chosen manual correction');
assertContains(adapter, 'refreshCurrentTrackSurfaces', 'Adapter must refresh visible track surfaces after correction');
assertContains(adapter, '本地匹配已更新', 'Manual correction must show a success toast');
assertContains(adapter, '请先把这个本地文件加入曲库', 'Manual correction must explain when the selected file is not in the library');

assertContains(shell, 'onCorrectLocalMatch', 'UI-NEXT shell must still delegate correction actions');
assertContains(trackRow, 'mb-track-row__match', 'Track row must expose the correction action');

console.log('NetEase local match correction guard passed.');
