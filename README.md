# Auralux

> An immersive desktop music player built from MusicBox, redesigned around UI-NEXT, local libraries, and personal NetEase Cloud Music workflows.

中文 | [English](#english)

## 中文

### 项目简介

Auralux 是一个桌面音乐播放器项目，基于开源项目 [MusicBox](https://github.com/asxez/MusicBox) 修改开发。这个版本重点强化了沉浸式播放体验、UI-NEXT 新界面、本地音乐库管理、歌词显示、播放队列、缓存状态，以及个人网易云音乐账号相关能力。

项目目标不是简单复刻某个在线音乐客户端，而是把本地音乐库、个人云端歌单和桌面播放器体验整合到一个更可控、更稳定、更适合长期使用的应用里。

### 主要能力

- 本地音乐库扫描、播放和管理。
- UI-NEXT 新界面，面向长期日常使用优化。
- 沉浸式播放页，支持封面、歌词、动态背景和拾音条视觉效果。
- 播放队列、续播状态和播放进度恢复。
- 歌词显示、桌面歌词和歌词加载状态处理。
- 歌单管理，包括创建、重命名、删除和曲目操作。
- 网易云音乐个人账号集成，用于登录状态、歌单导入、资产迁移和同步相关流程。
- 网易云歌单、本地歌曲匹配、离线状态和缓存状态展示。
- WASAPI 与 WebAudio 播放链路。
- 封面缓存、启动预热和运行时状态反馈。

### 当前状态

Auralux 仍处于积极开发阶段。当前主要开发方向集中在：

- 完整迁移到 UI-NEXT。
- 提升网易云账号、歌单、收藏和同步流程的可信度。
- 优化播放器稳定性，尤其是沉浸播放、歌词、进度条和视觉效果。
- 强化本地缓存、封面缓存和离线可用状态。
- 保留必要的旧 UI/运行时代码作为兼容层，逐步迁移或移除不再使用的部分。

### 技术栈

- 桌面框架：Electron
- 主进程：TypeScript
- 渲染层：Vite
- UI：UI-NEXT static shell + renderer adapter
- 音频：Rust N-API native audio engine、WASAPI、WebAudio fallback
- 云端能力：NeteaseCloudMusicApi 本地服务
- 辅助工具：Python metadata helper、GitNexus、focused verify scripts

### 项目结构

```text
src/main/                 Electron 主进程、控制器、服务和 preload
src/renderer/             Vite 渲染端、UI、功能模块和静态 UI-NEXT
src/renderer/ui-next-static/
                          UI-NEXT 静态界面入口和组件
src/renderer/src/ui-next/ UI-NEXT 与原 MusicBox 运行时的适配层
native/                   Rust N-API 音频引擎
scripts/                  构建脚本和专项验证脚本
docs/                     架构文档、阶段计划和开发记录
build/                    打包图标和 Electron Builder 配置
```

### 开发环境

安装依赖：

```bash
npm install
npm run install:renderer
npm run install:rs
pip install -r requirements.txt
```

启动开发版：

```bash
npm run dev
```

只启动渲染端：

```bash
npm run dev:renderer
```

构建应用：

```bash
npm run build
```

常用验证：

```bash
node scripts/verify-auralux-stage35-quality-gate.js
npm run typecheck:renderer
npm run build:renderer
```

### 使用说明

1. 启动应用后导入本地音乐目录。
2. 在播放器底部控制栏播放、暂停、切歌、调整音量和进入沉浸播放页。
3. 如需使用网易云相关能力，请在应用内完成个人账号登录。
4. 网易云集成仅用于访问用户自己的账号、歌单和相关数据。
5. 本项目不提供音乐内容，也不绕过任何版权或平台限制。

### 致谢

特别感谢 [asxez](https://github.com/asxez) 开发并开源 [MusicBox](https://github.com/asxez/MusicBox)。Auralux 基于 MusicBox 修改开发，并保留原项目的 MIT License 和版权声明。

感谢 [binaryify](https://github.com/Binaryify) 开发 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)。Auralux 使用它作为本地网易云音乐 API 服务的一部分。

也感谢所有开源依赖的维护者。Auralux 的桌面体验、音频链路、构建流程和云端集成都建立在这些开源工作的基础上。

### 许可证与声明

Auralux 包含来自 MusicBox 的修改代码，原项目采用 MIT License。完整许可证见 [LICENSE](LICENSE)，项目声明见 [NOTICE.md](NOTICE.md)。

Auralux 与网易云音乐没有官方关联。网易云音乐相关功能仅用于用户访问自己的账号数据。用户应自行遵守对应平台服务条款和当地法律法规。

---

## English

### Overview

Auralux is a desktop music player modified from the open-source project [MusicBox](https://github.com/asxez/MusicBox). This version focuses on an immersive playback experience, the UI-NEXT interface, local library management, lyrics, playback queues, cache visibility, and personal NetEase Cloud Music account workflows.

The goal is not to clone an online music client. Auralux aims to combine local music, personal cloud playlists, and a polished desktop playback experience into one controllable, stable, long-term music library.

### Features

- Local music library scanning, playback, and management.
- UI-NEXT interface optimized for daily use.
- Immersive player with cover art, lyrics, dynamic backgrounds, and visualizer bars.
- Playback queue, resume state, and progress restoration.
- Lyrics display, desktop lyrics, and clearer lyrics loading states.
- Playlist management, including create, rename, delete, and track actions.
- Personal NetEase Cloud Music account integration for login state, playlist import, asset migration, and sync workflows.
- NetEase playlist display, local track matching, offline status, and cache status.
- WASAPI and WebAudio playback paths.
- Cover caching, startup warmup, and runtime status feedback.

### Current Status

Auralux is under active development. Current work mainly focuses on:

- Fully moving the product surface to UI-NEXT.
- Making NetEase account, playlist, favorite, and sync flows more trustworthy.
- Improving player stability, especially immersive playback, lyrics, progress controls, and visualizer behavior.
- Strengthening local cache, cover cache, and offline availability.
- Keeping necessary legacy UI/runtime code as compatibility layers while unused parts are gradually migrated or removed.

### Tech Stack

- Desktop shell: Electron
- Main process: TypeScript
- Renderer: Vite
- UI: UI-NEXT static shell plus renderer adapter
- Audio: Rust N-API native audio engine, WASAPI, and WebAudio fallback
- Cloud integration: local NeteaseCloudMusicApi service
- Tooling: Python metadata helper, GitNexus, focused verification scripts

### Project Structure

```text
src/main/                 Electron main process, controllers, services, and preload
src/renderer/             Vite renderer, UI, feature modules, and UI-NEXT assets
src/renderer/ui-next-static/
                          UI-NEXT static shell and components
src/renderer/src/ui-next/ UI-NEXT adapter layer over the MusicBox runtime
native/                   Rust N-API audio engine
scripts/                  Build helpers and focused verification scripts
docs/                     Architecture docs, stage plans, and development notes
build/                    Packaging assets and Electron Builder config
```

### Development

Install dependencies:

```bash
npm install
npm run install:renderer
npm run install:rs
pip install -r requirements.txt
```

Start the desktop development app:

```bash
npm run dev
```

Start only the renderer:

```bash
npm run dev:renderer
```

Build the app:

```bash
npm run build
```

Useful verification commands:

```bash
node scripts/verify-auralux-stage35-quality-gate.js
npm run typecheck:renderer
npm run build:renderer
```

### Usage Notes

1. Start the app and import a local music folder.
2. Use the bottom player bar to play, pause, skip, adjust volume, and enter immersive playback.
3. To use NetEase-related features, sign in with your personal account inside the app.
4. NetEase integration is intended only for accessing the user's own account, playlists, and related data.
5. This project does not provide music content and does not bypass copyright or platform restrictions.

### Acknowledgements

Special thanks to [asxez](https://github.com/asxez) for creating and open-sourcing [MusicBox](https://github.com/asxez/MusicBox). Auralux is modified from MusicBox and preserves the original MIT License and copyright notice.

Thanks to [binaryify](https://github.com/Binaryify) for [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi), which Auralux uses as part of its local NetEase Cloud Music API service.

Thanks also to the maintainers of all open-source dependencies used by this project. Auralux's desktop experience, audio path, build pipeline, and cloud integration are built on top of that work.

### License And Notice

Auralux contains modified code from MusicBox, which is licensed under the MIT License. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

Auralux is not affiliated with NetEase Cloud Music. NetEase-related features are intended for users to access their own account data. Users are responsible for complying with the relevant platform terms and applicable laws.
