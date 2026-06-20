const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const adapterPath = path.join(root, 'src', 'renderer', 'src', 'ui-next', 'UINextMusicBoxAdapter.ts');
const adapter = fs.readFileSync(adapterPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNotContains(source, text, message) {
  assert(!source.includes(text), message);
}

function assertContains(source, text, message) {
  assert(source.includes(text), message);
}

assertNotContains(adapter, "window.prompt('Playlist name')", 'create playlist fallback prompt must be Chinese');
assertNotContains(adapter, 'Create playlist failed', 'create playlist failure fallback must be Chinese');
assertNotContains(adapter, 'Playlist created', 'create playlist success fallback must be Chinese');
assertContains(adapter, "window.prompt('歌单名称')", 'create playlist fallback should ask for Chinese playlist name');
assertContains(adapter, "showToast(result.error || '创建歌单失败'", 'create playlist failure toast should be Chinese');
assertContains(adapter, "showToast('歌单已创建'", 'create playlist success toast should be Chinese');

assertNotContains(adapter, '请在网易云导入窗口点击迁移全部资产', 'asset migration fallback copy must not point to the old import-modal-only entry');
assertContains(adapter, '正在打开网易云资产迁移入口', 'asset migration fallback should describe current account-menu migration path');

assertNotContains(adapter, 'Remove imported NetEase playlist', 'NetEase playlist delete fallback confirm must be Chinese');
assertContains(adapter, '从 Auralux 移除已导入的网易云歌单', 'NetEase playlist delete fallback confirm should be Chinese');

console.log('verify-ui-next-stage35-fallback-copy: ok');
