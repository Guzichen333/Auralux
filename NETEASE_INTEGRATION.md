# MusicBox × 网易云音乐 集成开发文档

## 项目概述

在 MusicBox 本地音乐播放器中集成网易云音乐功能，支持搜索、播放、导入歌单、扫码登录等。

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  MusicBox (Electron App)                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Renderer Process                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  NetEaseCloudMusic Component (UI)                    │  │  │
│  │  │  ├── 搜索弹窗                                        │  │  │
│  │  │  ├── 导入歌单弹窗                                    │  │  │
│  │  │  ├── 登录弹窗 (扫码/手机号)                           │  │  │
│  │  │  └── 状态指示器 (顶部导航栏)                          │  │  │
│  │  └──────────────────────────┬──────────────────────────┘  │  │
│  │                             │                              │  │
│  │  ┌──────────────────────────▼──────────────────────────┐  │  │
│  │  │  Service Layer                                       │  │  │
│  │  │  ├── NetEaseApiClient      HTTP 请求 + Cookie 管理   │  │  │
│  │  │  ├── NetEaseAuthService    登录状态 + 扫码/手机号     │  │  │
│  │  │  ├── NetEaseSearchService  搜索 + 获取URL + 歌词     │  │  │
│  │  │  └── NetEasePlaylistImportService  歌单导入          │  │  │
│  │  └──────────────────────────┬──────────────────────────┘  │  │
│  │                             │                              │  │
│  │  ┌──────────────────────────▼──────────────────────────┐  │  │
│  │  │  WebAudioTrackLoader (modified)                      │  │  │
│  │  │  ├── 本地文件: musicbox-audio:// 协议                 │  │  │
│  │  │  └── HTTP URL: 直接设置 audio.src (NetEase 流)       │  │  │
│  │  └──────────────────────────┬──────────────────────────┘  │  │
│  │                             │                              │  │
│  │  ┌──────────────────────────▼──────────────────────────┐  │  │
│  │  │  PlaybackController + LibraryController              │  │  │
│  │  │  ├── setPlaylist / loadTrack / play                  │  │  │
│  │  │  └── addTrackToLibrary / createPlaylist              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Main Process                                              │  │
│  │  └── NeteaseCloudMusicApi (localhost:3000)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
MusicBox/
├── src/
│   ├── renderer/
│   │   └── src/
│   │       ├── index.html                              # 侧边栏入口 + 弹窗
│   │       ├── ui/widgets/
│   │       │   └── NetEaseCloudMusic.ts                # UI 组件
│   │       ├── features/netease/
│   │       │   ├── types.ts                            # 类型定义
│   │       │   └── service/
│   │       │       ├── index.ts                        # 导出
│   │       │       ├── NetEaseApiClient.ts             # HTTP 客户端
│   │       │       ├── NetEaseAuthService.ts           # 登录服务
│   │       │       ├── NetEaseSearchService.ts         # 搜索服务
│   │       │       └── NetEasePlaylistImportService.ts # 歌单导入服务
│   │       ├── features/playback/service/audioEngine/webAudio/
│   │       │   └── WebAudioTrackLoader.ts              # [修改] 支持 HTTP URL
│   │       ├── styles/features/
│   │       │   └── _netease.scss                       # 样式
│   │       └── app/runtime/components/
│   │           ├── ComponentRegistry.ts                # [修改] 注册组件
│   │           └── ComponentTypes.ts                   # [修改] 类型定义
│   └── main/
│       └── ...                                          # 未修改
├── NETEASE_INTEGRATION.md                               # 本文档
└── netease-cloud-music.zip                              # 插件包 (备用)
```

### 播放流程

```
用户点击搜索结果
    │
    ▼
NetEaseSearchService.getSongUrl(songId)
    │  调用 /song/url/v1 获取实时播放 URL
    ▼
构建 Track 对象:
    filePath = "https://m802.music.126.net/..."
    │  filePath 是 HTTP URL，不是本地路径
    ▼
PlaybackController.setPlaylist([track], 0)
    │
    ▼
PlaybackController.loadTrack(url)
    │
    ▼
WebAudioTrackLoader.load(filePath, audioElement)
    │  检测到 HTTP URL，直接使用
    │  不走 createAudioStreamUrl()
    ▼
audioElement.src = url
    │
    ▼
audioElement.play()
```

### 歌单导入流程

```
用户输入歌单 ID
    │
    ▼
NetEasePlaylistImportService.getPlaylistDetail(id)
    │  获取歌单元数据 + 歌曲列表
    ▼
遍历歌曲，调用 LibraryController.addTrackToLibrary():
    {
        id: "netease-{songId}",
        filePath: "netease://{songId}",   // 虚拟路径
        title, artist, album, duration, cover
    }
    │
    ▼
LibraryController.createPlaylist("[网易云] 歌单名")
    │
    ▼
LibraryController.addToPlaylist(playlistId, trackIds)
    │
    ▼
播放时:
    检测 filePath 为 "netease://..."
    → 调用 getSongUrl(songId) 获取实时 URL
    → 设置 audio.src 播放
```

---

## 开发进度

### P0 已完成 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 服务层拆分 | ✅ | ApiClient / Auth / Search / PlaylistImport |
| 类型定义 | ✅ | NetEaseSong / NetEasePlaylist / Config |
| 播放器接入 | ✅ | 使用真实 playbackController，不使用 new Audio() |
| 搜索播放 | ✅ | 走 MusicBox 底部播放器 |
| 歌单导入 | ✅ | 使用真实 libraryController.addTrackToLibrary |
| 主进程支持 | ✅ | netease:// 路径跳过 fs.stat，使用虚拟 stat |
| 缓存校验 | ✅ | isNetworkPath 认识 netease://，validateTrack 跳过在线曲目 |
| netease:// 播放 | ✅ | WebAudioTrackLoader 使用 NetEaseApiClient 获取 URL |
| 登录态持久化 | ✅ | localStorage，启动时验证 |
| 扫码登录 | ✅ | 完整流程 |
| 手机号登录 | ✅ | POST 请求 |
| 状态指示器 | ✅ | 绿点在线 / 红点离线 |
| Cookie 安全 | ✅ | 不输出完整 cookie 到日志 |
| API 检测 | ✅ | 未启动时明确提示 |
| Cookie 安全 | ✅ | 不输出完整 cookie 到日志 |
| API 检测 | ✅ | 未启动时明确提示 |

### 验收清单

- [x] 搜索结果点击 → 走 MusicBox 底部播放器（使用真实 playbackController）
- [x] 播放/暂停/进度条/音量正常
- [x] 导入歌单后 MusicBox 里能看到（使用真实 libraryController）
- [x] 主进程支持 netease:// 路径（跳过 fs.stat）
- [x] 缓存校验认识 netease://（isNetworkPath + validateTrack 跳过）
- [x] 播放 netease:// 时使用 NetEaseApiClient 获取 URL
- [x] 重启后导入歌单仍可播放（实时换取 URL）
- [x] 后台缓存校验不会删掉网易云条目
- [x] 控制台没有完整 cookie
- [x] API 未启动时有明确提示
- [x] `npm run build:renderer` 通过
- [x] `npm run build:ts` 通过
- [x] `cd src/renderer && npm run lint` 通过

### 待开发 P1 📋

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 搜索结果分页 | P1 | 当前只显示前20条 |
| 歌词同步显示 | P1 | 播放时显示歌词 |
| "netease://" URL 播放 | P1 | 导入歌单后播放需要实时换取 URL |
| 每日推荐 | P2 | 获取每日推荐歌曲 |
| 私人FM | P2 | 播放私人FM |
| 歌单广场 | P2 | 浏览热门歌单 |

---

## 依赖

```bash
# 启动 API 服务
npx NeteaseCloudMusicApi@latest
# 或
npm install -g NeteaseCloudMusicApi && NeteaseCloudMusicApi
```

---

*最后更新: 2026-06-14 (P0 重构)*
