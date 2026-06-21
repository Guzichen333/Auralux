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

function assertNotIncludes(content, forbidden, label) {
  if (content.includes(forbidden)) {
    throw new Error(`${label}: still contains ${forbidden}`);
  }
}

function assertMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    throw new Error(`${label}: missing ${pattern}`);
  }
}

const stateService = read('src/renderer/src/features/netease/service/NetEaseSyncStateService.ts');
assertNotIncludes(stateService, 'Sync failed', 'sync failure fallback must be localized');
assertNotIncludes(stateService, 'Missing NetEase playlist id', 'missing external id fallback must be localized');
assertNotIncludes(stateService, 'Sync conflict:', 'conflict title must be localized');
assertNotIncludes(stateService, 'local-only tracks', 'local-only conflict copy must be localized');
assertNotIncludes(stateService, 'tracks removed from cloud', 'remote removal conflict copy must be localized');
assertNotIncludes(stateService, 'Local tracks are protected', 'local protection copy must be localized');
assertIncludes(stateService, '网易云同步失败', 'localized sync failure fallback');
assertIncludes(stateService, '缺少网易云歌单 ID', 'localized missing external id fallback');
assertIncludes(stateService, '发现同步冲突', 'localized conflict title');
assertIncludes(stateService, '本地歌曲会保留', 'local data protection promise');
assertIncludes(stateService, '云端已移除', 'remote removal conflict detail');

const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
assertIncludes(adapter, 'retryRetryableNetEaseSyncs', 'adapter must expose retry-all helper');
assertMatches(adapter, /retryNetEaseAccountSync\(\):\s*void\s*{[\s\S]*retryRetryableNetEaseSyncs/, 'top-right retry must use trusted sync retry loop');
assertMatches(adapter, /getAllPlaylistSyncStates\(\)[\s\S]*retryable[\s\S]*retryPlaylistSync/, 'retry-all helper must enumerate retryable sync states');
assertIncludes(adapter, '没有需要重试的网易云同步', 'empty retry feedback');
assertIncludes(adapter, '网易云同步重试完成', 'retry completion feedback');
assertIncludes(adapter, 'refreshNetEaseAccountCenterState', 'retry must refresh account center state');
assertIncludes(adapter, 'refreshMigrationDashboardState', 'retry must refresh dashboard state');

const topSearch = read('src/renderer/ui-next-static/components/TopSearch.js');
assertIncludes(topSearch, '\\u91cd\\u8bd5\\u540c\\u6b65', 'top-right menu keeps retry sync action');

console.log('NetEase trusted sync stage 44 guard passed.');
