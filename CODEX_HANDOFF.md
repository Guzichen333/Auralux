# CODEX_HANDOFF

本文档是当前项目的精简交接说明。后续会话先读 `AGENTS.md`，再读本文档。

## 1. 必须遵守的项目规则摘要

- 源码改动优先使用 `apply_patch`。
- 不要用 PowerShell 整文件写中文，避免编码损坏。
- 不要执行 `git reset --hard`、`git checkout --`、批量清理或回滚，除非用户明确要求。
- 当前工作区非常脏，大量文件是用户和前序阶段已有改动；默认都要保留。
- 不要重排无关文件，不要格式化整仓库。
- 主进程 TypeScript 保持现有风格：4 空格、分号、类名 `PascalCase`、方法 `camelCase`。
- Renderer 组件保持现有 `PascalCase` 和当前目录风格。
- 保留别名导入，例如 `@components`、`@services`、`@utils`。
- 不要绕过 preload 边界；renderer 不能直接访问 Node API。
- 文件系统相关逻辑复用主进程已有安全工具，例如 `src/main/utils/pathSecurity.ts`。
- UI 或播放相关改动后，需要实际启动或重启软件做烟测。
- 添加 renderer 代码后至少运行 `cd src/renderer && npm run lint`。
- 影响打包、preload、native、主进程窗口或安全边界的改动要单独说明风险。
- GitNexus 规则：编辑函数、类、方法前先做 impact 分析。
- GitNexus 规则：impact 为 HIGH 或 CRITICAL 时，先提示风险再改。
- GitNexus 规则：提交前运行 `detect_changes()`；本次没有提交需求。
- GitNexus 查询架构优先用 `query` / `context`，不要只靠全局 grep。

## 2. 当前总体目标

- 项目从原 MusicBox fork 逐步演进为新产品 **Auralux / 聆曜**。
- 保留原项目 MIT 许可和原作者声明，不抹掉上游来源。
- 保留并继续完善网易云集成：登录、搜索、歌单导入、歌词、封面、播放。
- 保留并继续完善 UI-NEXT：新桌面播放器壳、沉浸式播放页、背景、歌词、可视化。
- 当前最近任务重点是品牌和图标接入：让 Auralux 新 logo 在打包图标、窗口图标、UI-NEXT 左上角可见。
- 本文档只做交接，不修改业务逻辑。

## 3. 已完成工作摘要

- 网易云 P0/P1 主链路已经多轮修复：
  - 网易云登录状态持久化。
  - 顶部搜索接入本地 + 网易云混合搜索。
  - 搜索结果双击播放走原生播放层。
  - 网易云歌单导入、重复导入同步、封面回填、歌词加载。
  - `netease://songId` 播放路径实时换取 URL。
  - WASAPI 不支持 HTTP 流时可回退 WebAudio。
  - 避免 `netease://` 被本地 metadata / cover 流程误当文件解析。
- UI-NEXT 已经接入大量功能：
  - 新桌面播放器壳。
  - 沉浸式播放器。
  - 背景图片 / 视频导入和缓存。
  - 歌词布局模式。
  - 拾音器 / FFT 可视化方向。
  - 右侧播放器样式设置面板。
- 性能调优已做过多轮：
  - 视频背景缓存和多质量思路。
  - 减少歌词节点、渲染和动画压力。
  - 实机 4060 测试反馈比开发机更流畅。
- 品牌重命名已做：
  - 用户可见名称改为 Auralux。
  - `package.json` 名称改为 `auralux`。
  - 打包配置使用 Auralux productName / appId。
  - README 改写为 Auralux 说明。
  - `NOTICE.md` 新增上游和第三方 API 声明。
- Logo 已生成并被用户确认采用：
  - 风格：简约、唯美、低饱和、小人/唱片/月盘意象。
  - 已接入 build icons、favicon、renderer assets、UI-NEXT 静态资源。

## 4. 最近关键决策

- 产品名：**Auralux**。
- 中文名可继续使用：**聆曜**。
- App ID 当前采用：`io.github.auralux.app`。
- 内部兼容名不急于全仓强改，避免破坏缓存、路径、IPC、旧配置。
- 原 MusicBox MIT 许可必须保留。
- 网易云 API 使用 `NeteaseCloudMusicApi`，作者是 binaryify，需要保留第三方声明。
- 网易云集成只说明技术连接和用户自有账号，不声明与网易云官方有关联。
- UI-NEXT 图标显示不再依赖旧 favicon，而是在 Sidebar 里直接使用 PNG 品牌图。
- UI-NEXT 静态资源优先放 `src/renderer/ui-next-static/`，由现有 Vite copy 流程输出。

## 5. 未完成工作 / 下一步建议

1. 真实确认 UI-NEXT 左上角 logo 是否已经可见。
2. 真实确认窗口图标 / 任务栏图标是否刷新；Windows 可能缓存旧 icon。
3. 如果任务栏仍旧图标，优先检查 BrowserWindow `icon` 和打包后 exe 图标，不要先大改。
4. 如果 UI 左上角仍没变，检查 `src/renderer/public/ui-next/auralux-logo-mascot.png` 是否存在。
5. 如需继续品牌清理，分阶段做内部兼容名迁移，不要全局替换 MusicBox。
6. 如果继续沉浸播放器，优先做用户可见的播放器布局、歌词稳定、设置面板体验。
7. 如果继续网易云，优先修真实导入、歌单点击、封面获取、API 随软件启动的稳定性。
8. 如果要发 GitHub，先整理 README、NOTICE、LICENSE、第三方声明、截图、免责声明。
9. 如果要打包实机版，使用独立测试配置，避免污染用户现有数据。

## 6. 风险点

- 工作区有大量未提交改动，任何 reset / checkout 都可能毁掉用户阶段成果。
- `AGENTS.md` 和 `CLAUDE.md` 已修改，后续不要覆盖。
- `docs/public/CNAME` 已删除，可能是为了去掉旧域名绑定，不要恢复。
- `release-test/`、zip、日志文件可能是用户测试产物，不要清理。
- 网易云 API 服务、preload、主进程 IPC、renderer 网关必须保持一致，否则按钮会“成功提示但实际失败”。
- `netease://` 不能进入本地文件 metadata / cover 解析，否则会报 ENOENT 或卡顿。
- WASAPI 独占模式不支持 HTTP 流，网易云播放需要 WebAudio 回退。
- 沉浸式视频背景在开发机可能肉眼卡，实机 4060 反馈更好；不要只用开发机肉眼判断最终质量。
- PowerShell 中文整文件写入容易造成乱码；已发生过类似问题。
- `viteStaticCopy` 从根目录复制资源时会保留部分路径，容易生成嵌套错误路径。
- 图标更换后 Windows 任务栏可能有缓存，不代表源码没生效。
- 用户提供过 NewAPI key，已暴露在聊天中；不要继续复用，建议用户后续轮换。

## 7. 最近实际改过或需要重点关注的文件

### 项目规则 / 文档

- `AGENTS.md`
  - 状态：已修改。
  - 原因：项目规则、GitNexus 指引、协作约束。
  - 注意：不要覆盖，不要恢复旧版。
- `CLAUDE.md`
  - 状态：已修改。
  - 原因：可能含前序工具/协作说明。
  - 注意：不要清理。
- `README.md`
  - 状态：已改为 Auralux 说明。
  - 原因：品牌重命名和项目介绍。
  - 注意：后续发 GitHub 前还要再审一遍。
- `NOTICE.md`
  - 状态：新增。
  - 原因：保留 MusicBox 上游声明和 NeteaseCloudMusicApi 第三方声明。
  - 注意：必须保留。
- `LICENSE`
  - 状态：保留原 MIT。
  - 原因：上游许可。
  - 注意：不要替换成只有新项目版权。

### 打包 / 品牌

- `package.json`
  - 状态：已改名为 `auralux`，描述和作者更新。
  - 原因：产品品牌切换。
  - 注意：依赖中包含 `NeteaseCloudMusicApi`。
- `src/renderer/package.json`
  - 状态：已修改。
  - 原因：renderer 构建/依赖配合前序改动。
  - 注意：不要盲目恢复。
- `electron-builder.yml`
  - 状态：已改 productName / appId。
  - 原因：打包品牌切换。
- `electron-builder.win-test.yml`
  - 状态：新增。
  - 原因：Windows 实机测试打包配置。
  - 注意：不要清理。
- `build/icons/*`
  - 状态：已替换为 Auralux logo 图标集。
  - 原因：安装包、exe、任务栏图标。
- `assets/brand/auralux-logo-mascot.png`
  - 状态：新增，当前 logo 源图。
  - 原因：品牌主视觉。
- `src/renderer/src/assets/images/auralux-logo-mascot.png`
  - 状态：新增。
  - 原因：renderer assets 侧保留。
- `src/renderer/ui-next-static/auralux-logo-mascot.png`
  - 状态：新增。
  - 原因：UI-NEXT 直接显示品牌图的稳定来源。

### UI-NEXT logo / 静态资源

- `src/renderer/ui-next-static/components/Sidebar.js`
  - 状态：已改。
  - 原因：左上角品牌从图标函数改为 `<img>` 使用 Auralux logo。
  - 注意：这是用户看“UI 有没有换”的关键文件。
- `src/renderer/ui-next-static/styles.css`
  - 状态：已改。
  - 原因：新增 `.mb-brand__logo-img` 和 logo 容器样式。
- `src/renderer/vite.config.js`
  - 状态：已调整。
  - 原因：移除错误的额外 copy 配置，保留 `ui-next-static` copy。
  - 注意：不要再把根目录 assets 直接 copy 到 `assets/images`，会产生嵌套路径。
- `src/renderer/public/ui-next/auralux-logo-mascot.png`
  - 状态：构建后生成文件。
  - 原因：实际运行时 UI-NEXT 图片路径。
  - 注意：构建产物，可检查但不要手改。
- `src/renderer/public/ui-next/components/Sidebar.js`
  - 状态：构建后生成文件。
  - 原因：实际运行时 Sidebar 代码。
  - 注意：源码在 `ui-next-static`，不要直接改 public。

### 主进程窗口 / 图标

- `src/main/core/WindowManager.ts`
  - 状态：已改。
  - 原因：新增窗口 icon 路径并传给 `BrowserWindow`。
  - 注意：影响窗口创建；继续改前按 AGENTS 做 GitNexus impact。
- `src/main/controllers/TrayController.ts`
  - 状态：已改。
  - 原因：托盘 tooltip 改为 Auralux。

### favicon / renderer 标题

- `src/renderer/src/index.html`
  - 状态：已改。
  - 原因：标题、loading、版本占位改为 Auralux。
- `src/renderer/src/favicon.svg`
  - 状态：已替换。
  - 原因：浏览器/renderer favicon。
- `src/renderer/src/assets/images/favicon.svg`
  - 状态：已替换。
  - 原因：renderer 资源。
- `src/renderer/src/assets/images/favicon.ico`
  - 状态：已替换。
  - 原因：renderer 资源。

### 网易云集成重点文件

- `src/main/services/netease/**`
  - 状态：新增。
  - 原因：本地 NetEase API 服务随软件启动方向。
  - 注意：API 启停和端口稳定性是用户重点关注。
- `src/renderer/src/features/netease/**`
  - 状态：新增。
  - 原因：网易云服务层、登录、搜索、歌单、歌词。
  - 注意：不要删除。
- `src/renderer/src/ui/widgets/NetEaseCloudMusic.ts`
  - 状态：新增/多轮修改。
  - 原因：登录 pill、导入歌单 modal、API 可用状态。
  - 注意：用户多次反馈导入按钮、导入成功/失败状态。
- `src/main/controllers/LibraryController.ts`
  - 状态：多轮修改。
  - 原因：网易云曲目、歌单元数据、preload IPC。
  - 注意：影响库、歌单、导入、删除。
- `src/main/preload.ts`
  - 状态：多轮修改。
  - 原因：补充 renderer 需要的 IPC 暴露。
  - 注意：不要绕过 preload。
- `src/renderer/src/infrastructure/electron/LibraryGateway.ts`
  - 状态：多轮修改。
  - 原因：renderer 到主进程 library IPC 封装。

### 播放 / 歌词 / 封面重点文件

- `src/renderer/src/features/playback/service/audioEngine/webAudio/WebAudioTrackLoader.ts`
  - 状态：多轮修改。
  - 原因：支持 HTTP URL / `netease://` 实时换取播放 URL 和 metadata。
- `src/renderer/src/features/playback/service/audioEngine/AudioEngineManager.ts`
  - 状态：多轮修改。
  - 原因：WASAPI fallback、队列同步、next/previous 行为。
- `src/renderer/src/api/MusicBoxAPI.ts`
  - 状态：多轮修改。
  - 原因：load 序列保护、pending track、事件同步。
- `src/renderer/src/features/playback/ui-bindings/PlaybackAppController.ts`
  - 状态：多轮修改。
  - 原因：搜索双击快速切歌、latest-wins、pending UI。
- `src/renderer/src/ui/widgets/player/PlayerCoverArtController.ts`
  - 状态：多轮修改。
  - 原因：封面竞态、快速切歌串封面。
- `src/renderer/src/features/mediaAssets/service/CoverLookupService.ts`
  - 状态：多轮修改。
  - 原因：`netease://` 封面短路、避免本地解析。
- `src/renderer/src/features/mediaAssets/service/LyricsContentService.ts`
  - 状态：多轮修改。
  - 原因：歌词加载、网易云降级链路。

### UI-NEXT / 沉浸播放器重点文件

- `src/renderer/src/ui-next/**`
  - 状态：新增/大量修改。
  - 原因：新桌面 UI 和桥接。
  - 注意：这是当前主 UI 方向，不是废代码。
- `src/renderer/ui-next-static/**`
  - 状态：新增/大量修改。
  - 原因：UI-NEXT 静态页面、组件、样式。
  - 注意：实际视觉主要在这里。
- `src/main/controllers/ImmersiveBackgroundController.ts`
  - 状态：新增。
  - 原因：沉浸背景导入、缓存、视频质量管理。
- `src/renderer/src/features/desktopLyrics/service/DesktopLyricsService.ts`
  - 状态：修改。
  - 原因：桌面歌词修复相关。

## 8. 已运行命令和结果

- `npm run build:renderer`
  - 结果：通过。
  - 用途：验证 renderer / UI-NEXT 构建。
- `npm run build:ts`
  - 结果：通过。
  - 用途：验证主进程 TypeScript。
- `npm run typecheck:renderer`
  - 结果：通过。
  - 用途：验证 renderer 类型。
- `cd src/renderer && npm run lint`
  - 结果：通过。
  - 用途：验证 renderer lint。
- `npm run dev`
  - 结果：多次可启动，但开发过程中也用过直接启动 Electron。
  - 用途：真实打开软件检查 UI 和播放。
- 直接 Electron 开发启动：
  - 结果：可启动。
  - 现象：日志显示 NetEase API 启动在 `http://127.0.0.1:3000`。
- `git status --short`
  - 结果：大量 modified / untracked / deleted。
  - 结论：工作区极脏，不能清理或回滚。
- GitNexus `detect_changes`
  - 结果：曾报 critical。
  - 原因：工作区已有 70+ 文件改动，不能简单理解为最近单一改动危险。

## 9. 失败原因和不能重复踩的坑

- 不要用 PowerShell 整文件写中文；可能出现中文乱码和语法损坏。
- 不要把聊天原文整段复制进文档；只保留可执行摘要。
- 不要对旧 UI 和 UI-NEXT 混淆：用户现在主要看 UI-NEXT。
- 不要只改 favicon / build icon 就说 UI 变了；UI-NEXT 左上角要单独接图。
- 不要直接改 `src/renderer/public/**` 当源码；它是构建输出。
- 不要用 `viteStaticCopy` 从根目录复制 brand PNG 到 `assets/images`，会生成错误嵌套路径。
- 不要把 `netease://` 当成本地路径去 `fs.stat` / `music-metadata`。
- 不要让搜索、歌单导入、右键菜单的浮层被外部点击监听误关。
- 不要在导入网易云歌单时只提示成功，不检查 `addTrackToLibrary` / `createPlaylist` / `addToPlaylist` / metadata 写入结果。
- 不要把播放器图标、窗口图标、任务栏图标、UI 内 logo 混为一个问题。
- 不要复用已泄露的第三方 API key。
- 不要在用户没有要求时提交、推送、清理 release 包。

## 10. 用户已有改动，后续不得重置/清理/覆盖

- 所有网易云接入相关新增目录和修改文件。
- 所有 UI-NEXT 和沉浸播放器相关新增目录和修改文件。
- `AGENTS.md`、`CLAUDE.md` 的当前内容。
- `README.md`、`NOTICE.md`、`LICENSE` 的当前许可和声明方向。
- `build/icons/*` 当前 Auralux 图标。
- `assets/brand/**` 当前品牌资源。
- `src/renderer/ui-next-static/**` 当前 UI-NEXT 源资源。
- `src/renderer/src/ui-next/**` 当前桥接代码。
- `electron-builder.win-test.yml` 测试打包配置。
- `release-test/`、`MusicBox-real-machine-test-0.2.6.zip`、`netease-cloud-music.zip`。
- `dev-run.log`、`dev-run.err.log`，除非用户要求清理日志。
- `docs/public/CNAME` 的删除状态。
- `pnpm-lock.yaml`、`pnpm-workspace.yaml`。
- 所有用户真实测试后确认“过”的修复，不要回滚。

## 11. 建议的后续执行顺序

1. 先确认当前 dev app 是否运行，必要时重启。
2. 检查 UI-NEXT 左上角 logo 是否显示 Auralux mascot。
3. 检查窗口/任务栏 icon；如仍旧图标，先判断 Windows 缓存还是代码路径。
4. 跑 `npm run build:renderer` 和 `npm run build:ts`。
5. 跑 `cd src/renderer && npm run lint`。
6. 如果要继续品牌清理，先列影响面，不做全局替换。
7. 如果要继续播放器 UI，优先修可见交互和性能，不动播放核心。
8. 如果要继续网易云，优先从真实失败路径查日志和 IPC 链路。
9. 每次改完要真实启动/重启，给用户明确验证点。

## 12. 新会话建议开场提示词

请读取 `AGENTS.md` 和 `CODEX_HANDOFF.md`，继续当前 Auralux 项目。先不要重置、清理或覆盖任何未提交改动；先确认 UI-NEXT 左上角 Logo、窗口图标和当前 dev 启动状态，然后按交接文档的下一步继续。

## 13. 后续排查索引

- 新会话启动：读 `AGENTS.md`、读本文档、跑 `git status --short`，不要清理脏工作区。
- 用户说“继续”：先对照最近目标，不要从旧任务跑偏。
- 用户说“重启”：安全停止当前 Electron / Node，再启动。
- 用户说“没变”：先确认实际运行的是哪个构建输出。
- 用户说“旧 UI”：先确认 UI-NEXT 是否实际启用。
- 用户说“按钮无效”：查 UI 事件绑定、preload 暴露、gateway、主进程 handler。
- 用户说“显示成功但没导入”：检查每一步返回值和 `success`，不要只看 toast。
- 用户说“API 没启动”：查主进程 NetEase 服务日志和端口 `127.0.0.1:3000`。
- 用户说“封面不对”：查 pending track、load seq、cover generation、`track.cover`。
- 用户说“卡”：同时看肉眼、`frameMsMax`、视频掉帧、节点数量，不要只看 FPS。
- UI-NEXT 源码看 `src/renderer/ui-next-static/**`，桥接看 `src/renderer/src/ui-next/**`。
- UI-NEXT 构建输出在 `src/renderer/public/ui-next/**`，不要直接手改。
- Sidebar logo 源码看 `ui-next-static/components/Sidebar.js`。
- Sidebar logo 样式看 `ui-next-static/styles.css`。
- 运行时 logo 文件应在 `src/renderer/public/ui-next/auralux-logo-mascot.png`。
- 网易云导入排查顺序：API 可用、登录、歌单识别、歌曲注册、歌单创建、添加歌曲、元数据写入、侧栏刷新。
- 网易云歌单点击无效：查 Navigation、页面路由、playlist detail 数据。
- 网易云封面缺失：查 playlist `coverImagePath`、track `cover`、回填逻辑。
- 播放链路排查顺序：UI 事件、PlaybackComponentBindings、PlaybackAppController、PlaybackController、MusicBoxAPI、AudioEngineManager。
- `netease://` 播放应走 WebAudio URL 换取，不应进入本地文件解析。
- WASAPI 遇到 HTTP 流要 fallback。
- 快速切歌必须 latest-wins，旧 load 不能覆盖新 track。
- 沉浸播放器排查：入口、返回、当前歌曲信息、歌词模式、seek、拾音器、背景缓存。
- 沉浸歌词排查：当前句同步、逐字节奏、长句遮挡、节点数量、是否越跑越快。
- 沉浸性能排查：优先 transform / opacity，避免每帧重建 DOM 和大面积滤镜。
- 品牌许可排查：保留 MusicBox、asxez、MIT、binaryify，不声称网易云官方授权。
- 如果继续 logo：先真实打开 app 看 UI-NEXT 左上角。
- 如果继续播放器样式：先改 `ui-next-static`，构建后重启。
- 如果继续网易云：从真实失败路径查日志和 IPC 链路。
- 如果继续打包：先跑构建，再用测试配置输出包。
- 如果继续提交：先 GitNexus `detect_changes()`，再构建验证。
