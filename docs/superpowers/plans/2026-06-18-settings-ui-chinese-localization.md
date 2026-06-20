# Settings UI Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Auralux 设置页面里用户可见的英文文案统一翻译为中文，并顺手整理设置页的信息层级、状态反馈和可读性问题。

**Architecture:** UI-NEXT 设置页的主要可见文案集中在 `src/renderer/ui-next-static/NewMusicShell.js`，少量设置相关提示来自 `src/renderer/src/features/settings/service/**` 和旧设置页 `src/renderer/src/ui/pages/Settings.ts`。本计划只修改用户可见文案和必要的 UI 呈现细节，不翻译内部 key、事件名、CSS class、IPC 名称、日志、注释或技术协议名。构建后由 Vite 将 `ui-next-static` 复制到 `src/renderer/public/ui-next/**`，不要直接手改 `public` 产物。

**Tech Stack:** Electron, Vite renderer, TypeScript, UI-NEXT static JavaScript/CSS, existing settings services.

---

## Scope

### 必须翻译成中文

- 设置页标题、分组标题、分组说明。
- 设置项 label、描述文字、按钮文案。
- 下拉选项的显示文本。
- 空状态，例如没有音乐文件夹、未设置目录、缓存摘要未加载。
- 操作状态，例如 Loading、Checking、Clearing、Working。
- 设置页动作卡片，例如插件管理、缓存管理、打开目录、开发者工具。
- 由设置页触发的 toast、confirm dialog、快捷键冲突提示、重置提示。

### 不翻译

- `autoplay`、`showTrackCovers`、`desktopLyricsDisplayMode` 等内部设置 key。
- CSS class、DOM id、TypeScript 类型、接口、函数名。
- `WASAPI`、`DevTools`、`Electron`、`Auralux` 等技术名或品牌名；可以在 UI 文案里加中文解释。
- 日志和注释，除非它们直接显示给用户。
- 构建产物 `src/renderer/public/**`，只通过构建生成。

### 语言风格

- 使用简洁、产品化中文，不用直译腔。
- 开关项用动词短语，例如“显示封面”“启用无缝播放”。
- 说明文字尽量一句话，说明影响和风险。
- 风险项明确提示，例如硬件加速、WASAPI 独占模式、清理缓存。
- 保留“网易云音乐”“本地音乐库”“桌面歌词”“迷你模式”等用户熟悉词。

---

## File Structure

- Modify: `src/renderer/ui-next-static/NewMusicShell.js`
  - 负责 UI-NEXT 设置页的主视图、设置项、按钮、空状态、动作卡片。
- Modify: `src/renderer/src/features/settings/service/ShortcutListRenderer.ts`
  - 负责快捷键列表里的“未设置”“点击修改快捷键”等可见文案。
- Modify: `src/renderer/src/features/settings/service/ShortcutDialogService.ts`
  - 负责快捷键冲突和重置确认弹窗文案。
- Modify: `src/renderer/src/features/settings/service/ShortcutSettingsController.ts`
  - 负责快捷键设置 toast 文案。
- Modify: `src/renderer/src/features/settings/service/SettingsToolsController.ts`
  - 负责缓存、目录、嵌入歌词测试等设置动作的 toast 或状态文案。
- Modify: `src/renderer/src/features/settings/service/CacheSettingsRenderer.ts`
  - 负责缓存统计、验证、清理状态的显示文案。
- Modify: `src/renderer/src/features/settings/service/MediaDirectorySettingsRenderer.ts`
  - 负责目录未选择状态文案。
- Modify: `src/renderer/src/ui/pages/Settings.ts`
  - 只处理仍会显示给用户的旧设置页提示，不做结构性重写。
- Test: `scripts/verify-settings-ui-chinese.js`
  - 新增一个轻量校验脚本，扫描设置页 UI 文案，防止高频英文残留。

---

### Task 1: Add Visible-Text Guard

**Files:**
- Create: `scripts/verify-settings-ui-chinese.js`

- [ ] **Step 1: Write the failing verification script**

```javascript
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
    'src/renderer/ui-next-static/NewMusicShell.js',
    'src/renderer/src/features/settings/service/ShortcutListRenderer.ts',
    'src/renderer/src/features/settings/service/ShortcutDialogService.ts',
    'src/renderer/src/features/settings/service/ShortcutSettingsController.ts',
    'src/renderer/src/features/settings/service/SettingsToolsController.ts',
    'src/renderer/src/features/settings/service/CacheSettingsRenderer.ts',
    'src/renderer/src/features/settings/service/MediaDirectorySettingsRenderer.ts'
];

const allowed = [
    'Auralux',
    'WASAPI',
    'DevTools',
    'Electron',
    'UI-NEXT',
    'px',
    'VIP'
];

const visibleEnglishPatterns = [
    /Show track covers/,
    /Gapless playback/,
    /Audio engine/,
    /Exclusive mode/,
    /Library folders/,
    /No music folders added/,
    /Add folder/,
    /Add music files/,
    /Auto scan/,
    /Scan frequency/,
    /Lyrics and cache/,
    /Working/,
    /Not set/,
    /Choose/,
    /Loading/,
    /Summary/,
    /Validate/,
    /Clear/,
    /Desktop display mode/,
    /Desktop layout/,
    /Mini mode/,
    /Network drive/,
    /Hardware acceleration/,
    /User data folder/,
    /Plugin manager/
];

const failures = [];
for (const file of files) {
    const abs = path.join(root, file);
    const source = fs.readFileSync(abs, 'utf8');
    for (const pattern of visibleEnglishPatterns) {
        if (pattern.test(source)) {
            failures.push(`${file}: ${pattern}`);
        }
    }
}

if (failures.length) {
    console.error('Visible English remains in settings UI:');
    failures.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
}

console.log(`Settings UI Chinese guard passed. Allowed terms: ${allowed.join(', ')}`);
```

- [ ] **Step 2: Run the script and verify it fails before translation**

Run: `node scripts/verify-settings-ui-chinese.js`

Expected: FAIL, with entries such as `Show track covers`, `Audio engine`, `Library folders`, `Plugin manager`.

- [ ] **Step 3: Commit only if the team wants guard-first commits**

Do not commit yet if the current branch policy is “commit after complete feature”. This project currently has dirty logs and prior feature edits, so prefer one final scoped commit after all settings localization changes.

---

### Task 2: Translate UI-NEXT Settings Page

**Files:**
- Modify: `src/renderer/ui-next-static/NewMusicShell.js`

- [ ] **Step 1: Translate playback panel**

Replace the visible strings in the playback panel with:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '播放'),
h('span', { class: 'mb-settings-panel__hint' }, '应用到当前 Auralux 播放逻辑')

settingToggle('启动后自动播放', '打开软件并恢复播放状态时自动继续播放。', settings.autoplay, 'autoplay')
settingToggle('记住播放进度', '重启后从上次歌曲位置继续播放。', settings.rememberPosition, 'rememberPosition')
settingToggle('显示封面', '在音乐库列表和歌单详情中显示歌曲封面。', settings.showTrackCovers, 'showTrackCovers')
settingToggle('启用无缝播放', '当前音频引擎支持时，提前加载下一首歌曲以减少间隙。', settings.gaplessPlayback, 'gaplessPlayback')
```

- [ ] **Step 2: Translate audio engine panel**

Use these visible strings:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '音频引擎')
h('span', { class: 'mb-settings-panel__hint' }, settings.wasapiAvailable === false ? '当前环境不支持 WASAPI' : 'WASAPI 输出模式')
settingToggle('独占模式', '可用时使用 WASAPI 独占输出。', settings.exclusiveMode, 'exclusiveMode')
settingSelect('WASAPI 共享方式', '独占模式由 Auralux 接管设备，共享模式保留 Windows 混音。', settings.wasapiShareMode, 'wasapiShareMode', [
    {value: 'exclusive', label: '独占'},
    {value: 'shared', label: '共享'}
])
```

- [ ] **Step 3: Translate library folder panel**

Use these visible strings:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '音乐文件夹')
h('span', { class: 'mb-settings-panel__hint' }, String((settings.musicFolders || []).length) + ' 个文件夹')
h('div', { class: 'mb-settings-empty' }, '还没有添加音乐文件夹。')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('addMusicFolder') }, '添加文件夹')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('addMusicFiles') }, '添加音乐文件')
settingToggle('自动扫描', '自动扫描已配置的音乐文件夹。', settings.autoScanEnabled, 'autoScanEnabled')
settingSelect('扫描频率', '选择 Auralux 扫描文件夹的时机。', settings.scanFrequency, 'scanFrequency', [
    {value: 'on_startup', label: '启动时'},
    {value: 'hourly', label: '每小时'},
    {value: 'daily', label: '每天'}
])
```

- [ ] **Step 4: Translate lyrics and cache panel**

Use these visible strings:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '歌词与缓存')
h('span', { class: 'mb-settings-panel__hint' }, settings.cacheBusy ? '正在处理...' : '本地资源')
pathRow('歌词文件夹', settings.lyricsDirectory, '选择', adapterAction('chooseLyricsDirectory'))
pathRow('封面缓存文件夹', settings.coverCacheDirectory, '选择', adapterAction('chooseCoverCacheDirectory'))
settingRange('歌词高亮透明度', '调整当前歌词高亮强度。', settings.lyricsHighlightOpacity == null ? 1 : settings.lyricsHighlightOpacity, 'lyricsHighlightOpacity', 0.2, 1, 0.05, '')
settingColor('歌词高亮颜色', '用于同步歌词和高亮效果。', settings.lyricsHighlightColor || '#335eea', 'lyricsHighlightColor')
h('div', { class: 'mb-settings-cache-note' }, settings.cacheDescription || '缓存摘要尚未加载。')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('showCacheStatistics') }, settings.cacheBusy === 'stats' ? '加载中...' : '摘要')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('validateCache') }, settings.cacheBusy === 'validate' ? '检查中...' : '验证')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('clearCache') }, settings.cacheBusy === 'clear' ? '清理中...' : '清理')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('testEmbeddedLyrics') }, '测试内嵌歌词')
```

- [ ] **Step 5: Translate desktop display panel**

Use these visible strings:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '桌面显示')
h('span', { class: 'mb-settings-panel__hint' }, '桌面歌词与迷你模式')
settingToggle('桌面歌词', '显示或隐藏桌面歌词窗口。', settings.desktopLyrics, 'desktopLyrics')
settingSelect('桌面显示模式', '选择桌面歌词的呈现方式。', settings.desktopLyricsDisplayMode, 'desktopLyricsDisplayMode', [
    {value: 'normal', label: '普通'},
    {value: 'karaoke', label: '逐字'},
    {value: 'minimal', label: '极简'}
])
settingSelect('桌面布局', '选择歌词行的排列方式。', settings.desktopLyricsLayoutMode, 'desktopLyricsLayoutMode', [
    {value: 'single', label: '单行'},
    {value: 'double', label: '双行'}
])
settingColor('桌面主题色', '桌面歌词窗口的强调色。', settings.desktopLyricsThemeColor || '#64b5f6', 'desktopLyricsThemeColor')
settingColor('桌面字体颜色', '桌面歌词文字颜色。', settings.desktopLyricsFontColor || '#000000', 'desktopLyricsFontColor')
settingRange('桌面透明度', '调整窗口透明度。', settings.desktopLyricsOpacity == null ? 0.9 : settings.desktopLyricsOpacity, 'desktopLyricsOpacity', 0.3, 1, 0.05, '')
settingRange('桌面字号', '调整桌面歌词文字大小。', settings.desktopLyricsFontSize || 48, 'desktopLyricsFontSize', 18, 96, 1, 'px')
settingColor('迷你模式字体', '迷你模式中的文字颜色。', settings.miniModeFontColor || '#ffffff', 'miniModeFontColor')
settingColor('迷你模式高亮', '迷你模式中的高亮颜色。', settings.miniModeHighlightColor || '#335eea', 'miniModeHighlightColor')
settingRange('迷你模式字号', '调整迷你模式歌词字号。', settings.miniModeFontSize || 14, 'miniModeFontSize', 10, 30, 1, 'px')
```

- [ ] **Step 6: Translate system and tray panels**

Use these visible strings:

```javascript
h('span', { class: 'mb-settings-panel__title' }, '系统')
h('span', { class: 'mb-settings-panel__hint' }, '窗口与故障排查')
settingToggle('网络磁盘', '启用网络磁盘集成，并打开配置窗口。', settings.networkDriveEnabled, 'networkDriveEnabled')
settingToggle('硬件加速', '修改后可能需要重启应用。', settings.hardwareAcceleration, 'hardwareAcceleration')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openNetworkDrive') }, '网络磁盘配置')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openUserDataFolder') }, '用户数据文件夹')
h('button', { class: 'mb-settings-mini-action', onclick: adapterAction('openDevTools') }, '开发者工具')

h('span', { class: 'mb-settings-panel__title' }, '系统托盘')
h('span', { class: 'mb-settings-panel__hint' }, '保存后立即同步到 Electron 托盘')
settingToggle('启用系统托盘', '在系统托盘中保留 Auralux 入口。', settings.systemTray, 'systemTray')
settingSelect('关闭窗口时', '选择点击关闭按钮后的行为。', settings.trayCloseBehavior, 'trayCloseBehavior', [
    {value: 'minimize', label: '最小化到托盘'},
    {value: 'quit', label: '退出应用'}
])
settingToggle('启动时最小化', '打开软件后直接进入托盘状态。', settings.trayStartMinimized, 'trayStartMinimized')
```

- [ ] **Step 7: Translate action grid**

Replace remaining action cards with:

```javascript
action('插件管理', '打开已安装插件和扩展设置。', adapterAction('openPluginManager'))
```

If the action grid also contains cache, update, repository, or app-data actions, use:

```javascript
action('检查更新', '查看 Auralux 是否有可用更新。', adapterAction('checkUpdates'))
action('缓存摘要', '查看封面、歌词和本地资源缓存。', adapterAction('showCacheStatistics'))
action('打开用户数据', '打开 Auralux 的本地数据目录。', adapterAction('openUserDataFolder'))
action('项目仓库', '打开 Auralux 项目页面。', adapterAction('openRepository'))
```

- [ ] **Step 8: Run the visible-text guard**

Run: `node scripts/verify-settings-ui-chinese.js`

Expected: PASS.

---

### Task 3: Translate Settings Service Feedback

**Files:**
- Modify: `src/renderer/src/features/settings/service/ShortcutListRenderer.ts`
- Modify: `src/renderer/src/features/settings/service/ShortcutDialogService.ts`
- Modify: `src/renderer/src/features/settings/service/ShortcutSettingsController.ts`
- Modify: `src/renderer/src/features/settings/service/SettingsToolsController.ts`
- Modify: `src/renderer/src/features/settings/service/CacheSettingsRenderer.ts`
- Modify: `src/renderer/src/features/settings/service/MediaDirectorySettingsRenderer.ts`

- [ ] **Step 1: Shortcut list visible text**

Use:

```typescript
return '未设置';
key.title = '点击修改快捷键';
```

- [ ] **Step 2: Shortcut conflict dialog**

Use:

```typescript
title: '快捷键冲突',
message: `快捷键 "${this.formatShortcutKey(newShortcut)}" 与以下快捷键冲突：\n${conflictNames}\n\n是否覆盖现有快捷键？`,
confirmText: '覆盖',
cancelText: '取消'
```

- [ ] **Step 3: Shortcut reset dialog**

Use:

```typescript
title: '重置快捷键',
message: '确定要将所有快捷键重置为默认设置吗？\n\n此操作会清除所有自定义快捷键配置。',
confirmText: '重置',
cancelText: '取消'
```

- [ ] **Step 4: Shortcut toast text**

Use:

```typescript
showToast('快捷键更新失败', 'error');
showToast('快捷键已更新', 'success');
showToast('快捷键状态更新失败', 'error');
showToast(enabled ? '快捷键已启用' : '快捷键已禁用', 'success');
showToast('全局快捷键设置失败', 'error');
showToast(enabled ? '全局快捷键已启用' : '全局快捷键已禁用', 'success');
showToast('重置快捷键失败', 'error');
showToast('快捷键已重置为默认设置', 'success');
```

- [ ] **Step 5: Directory and cache status text**

Use:

```typescript
element.textContent = '未选择';
```

Cache status strings should use:

```typescript
'正在加载缓存摘要...'
'正在验证缓存...'
'正在清理缓存...'
'缓存摘要尚未加载。'
'缓存已清理'
'缓存验证完成'
'缓存操作失败'
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck:renderer`

Expected: PASS.

---

### Task 4: Settings Page UI Optimization Pass

**Files:**
- Modify: `src/renderer/ui-next-static/NewMusicShell.js`
- Modify: `src/renderer/ui-next-static/styles.css`

- [ ] **Step 1: Group high-risk settings with clearer hints**

Ensure WASAPI and hardware acceleration descriptions include risk:

```javascript
'可用时使用 WASAPI 独占输出，可能会影响其他应用声音。'
'修改后可能需要重启应用。'
```

- [ ] **Step 2: Make destructive actions visually distinct**

In `styles.css`, ensure cache clear actions can use a danger class without changing all buttons:

```css
.mb-settings-mini-action.is-danger {
  border-color: color-mix(in srgb, var(--mb-rose) 55%, transparent);
  color: var(--mb-rose);
}

.mb-settings-mini-action.is-danger:hover {
  background: var(--mb-rose-bg);
  color: var(--mb-text);
}
```

Apply `class: 'mb-settings-mini-action is-danger'` only to “清理缓存” and any future destructive action.

- [ ] **Step 3: Improve empty folder state**

Replace a plain empty string with a clearer empty state:

```javascript
h('div', { class: 'mb-settings-empty' }, [
    h('span', {}, '还没有添加音乐文件夹。'),
    h('span', {}, '添加文件夹后，Auralux 会扫描并建立本地音乐库。')
])
```

- [ ] **Step 4: Keep text from overflowing controls**

Add CSS if long Chinese labels wrap awkwardly:

```css
.mb-settings-row__label,
.mb-settings-action__label,
.mb-settings-mini-action {
  overflow-wrap: anywhere;
}
```

- [ ] **Step 5: Build renderer**

Run: `npm run build:renderer`

Expected: PASS and `src/renderer/public/ui-next/**` regenerated.

---

### Task 5: Verification and Restart

**Files:**
- No source edits unless verification finds a defect.

- [ ] **Step 1: Run all required checks**

Run:

```bash
node scripts/verify-settings-ui-chinese.js
npm run typecheck:renderer
npm run build:renderer
npm run build:ts
```

Expected: all PASS.

- [ ] **Step 2: Run GitNexus detect changes**

Run GitNexus:

```text
detect_changes({repo: "MusicBox", scope: "unstaged"})
```

Expected: medium or lower risk, with changes limited to settings UI, settings service feedback, and generated renderer build outputs if included.

- [ ] **Step 3: Restart dev app**

Stop the active Electron and NetEase API processes for this project only, then run:

```bash
npm run dev
```

Expected: Auralux opens with the settings page available.

- [ ] **Step 4: Manual smoke check**

Ask the user to test these points:

- Open Settings from UI-NEXT sidebar.
- Confirm all setting panel titles and setting descriptions are Chinese.
- Confirm buttons such as 添加文件夹、添加音乐文件、选择、摘要、验证、清理、插件管理 are Chinese.
- Confirm WASAPI, DevTools, Electron, Auralux remain as technical or brand names.
- Toggle a non-risk setting and confirm toast text is Chinese.
- Open shortcut reset confirmation and confirm title/body/buttons are Chinese.
- Confirm no text overlaps in the settings page at the current window size.

---

## Optimization Notes

- 将“播放”“音频引擎”“音乐文件夹”“歌词与缓存”“桌面显示”“系统”“系统托盘”保持为稳定分组，减少用户寻找成本。
- 将高风险设置的说明写清楚，不用只写功能名，例如 WASAPI 独占模式、硬件加速、清理缓存。
- 将破坏性动作加 `is-danger`，让“清理缓存”与普通动作区分。
- 将空状态写成下一步引导，不只写“没有内容”。
- 保留技术名，避免把 `WASAPI` 或 `DevTools` 翻译成用户难以搜索的词。
- 设置页按钮不做花哨视觉重设计，保持当前产品 UI 密度和侧栏工具属性。

## Self-Review

- Spec coverage: 已覆盖设置页 UI 中文化、弹窗/toast 中文化、范围边界、优化点和验证步骤。
- Placeholder scan: 无 TBD、TODO、后续补充等占位。
- Type consistency: 使用现有 `settings.*` key、`adapterAction()`、`settingToggle()`、`settingSelect()`、`settingRange()`、`settingColor()`、`pathRow()`、`action()` 结构，不引入新状态类型。
