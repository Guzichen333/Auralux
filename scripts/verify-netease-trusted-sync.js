const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`${label}: missing ${expected}`);
  }
}

function assertMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const stateServicePath = 'src/renderer/src/features/netease/service/NetEaseSyncStateService.ts';
if (!fs.existsSync(path.join(root, stateServicePath))) {
  throw new Error(`Missing ${stateServicePath}`);
}

const stateService = read(stateServicePath);
assertIncludes(stateService, 'NetEasePlaylistSyncStatus', 'sync status type');
assertIncludes(stateService, "'syncing'", 'syncing status');
assertIncludes(stateService, "'success'", 'success status');
assertIncludes(stateService, "'failed'", 'failed status');
assertIncludes(stateService, "'conflict'", 'conflict status');
assertIncludes(stateService, 'lastSuccessfulSyncAt', 'last successful sync time');
assertIncludes(stateService, 'failureReason', 'failure reason');
assertIncludes(stateService, 'retryPlaylistSync', 'retry API');
assertIncludes(stateService, 'syncPlaylistWithState', 'stateful sync API');
assertIncludes(stateService, 'detectLocalProtectionConflict', 'conflict detection');
assertIncludes(stateService, 'localOnlyTrackCount', 'local-only protection count');
assertIncludes(stateService, 'removedRemoteCount', 'remote removal protection count');
assertIncludes(stateService, 'netEaseSyncStateService', 'singleton export');
assertMatches(stateService, /status:\s*'conflict'/, 'conflict status write');
assertMatches(stateService, /retryable:\s*true/, 'retryable state write');
assertMatches(stateService, /netEasePlaylistSyncService\.syncPlaylist/, 'sync wrapper delegation');

const serviceIndex = read('src/renderer/src/features/netease/service/index.ts');
assertIncludes(serviceIndex, 'NetEaseSyncStateService', 'service index export class');
assertIncludes(serviceIndex, 'netEaseSyncStateService', 'service index singleton export');

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertIncludes(adapter, 'netEaseSyncStateService', 'UI-NEXT sync state import/use');
assertIncludes(adapter, 'syncPlaylistWithState', 'UI-NEXT stateful sync call');
assertIncludes(adapter, 'getPlaylistSyncState', 'UI-NEXT reads playlist state');
assertIncludes(adapter, 'lastSuccessfulSyncAt', 'UI-NEXT last successful sync display source');
assertMatches(adapter, /status\s*===\s*'conflict'/, 'UI-NEXT conflict branch');

const widget = read('src/renderer/src/ui/widgets/NetEaseCloudMusic.ts');
assertIncludes(widget, 'netEaseSyncStateService', 'NetEase widget sync state import/use');
assertIncludes(widget, 'syncPlaylistWithState', 'NetEase widget stateful sync call');
assertIncludes(widget, 'failureReason', 'NetEase widget failure reason');
assertIncludes(widget, 'conflict', 'NetEase widget conflict state handling');

console.log('NetEase trusted sync guard passed.');
