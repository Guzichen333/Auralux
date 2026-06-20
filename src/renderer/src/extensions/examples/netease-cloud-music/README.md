# NetEase Cloud Music Plugin for Auralux

网易云音乐集成插件 - 搜索、播放、歌单导入、歌词获取

## 前置要求

1. 安装 Node.js 18+
2. 启动 NeteaseCloudMusicApi 服务:

```bash
# 方式1: 使用 npx 直接运行
npx NeteaseCloudMusicApi@latest

# 方式2: 全局安装后运行
npm install -g NeteaseCloudMusicApi
NeteaseCloudMusicApi

# 方式3: 克隆仓库运行
git clone https://gitlab.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi
npm install
node app.js
```

服务默认运行在 `http://localhost:3000`

## 安装插件

将 `netease-cloud-music` 文件夹打包为 ZIP，然后在 Auralux 中安装:

1. 打开 Auralux
2. 进入设置 → 插件管理
3. 点击"安装外部插件"
4. 选择 ZIP 文件

## 功能

### 搜索歌曲

- 命令: `NetEase: 搜索歌曲`
- 快捷键: 可在设置中自定义

### 播放歌曲

- 搜索结果中选择歌曲即可播放
- 支持多种音质: 标准、较高、极高、无损、Hi-Res

### 导入歌单

- 命令: `NetEase: 导入歌单`
- 输入网易云歌单ID即可导入

### 登录账号

- 命令: `NetEase: 登录账号`
- 使用手机号登录获取更多功能

## 设置

在 Auralux 设置 → NetEase Cloud Music 中配置:

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| API 服务地址 | NeteaseCloudMusicApi 服务地址 | http://localhost:3000 |
| 默认音质 | 选择默认播放音质 | 极高 (exhigh) |
| 自动播放 | 搜索后自动播放第一首 | 开启 |
| 自动获取歌词 | 播放时自动获取歌词 | 开启 |
| 搜索结果数量 | 每次搜索显示的最大结果数 | 20 |

## API 端点

插件使用以下 NeteaseCloudMusicApi 端点:

| 端点 | 用途 |
|------|------|
| `/cloudsearch` | 搜索歌曲、专辑、歌手、歌单 |
| `/song/url/v1` | 获取歌曲播放URL |
| `/lyric` | 获取歌词 |
| `/playlist/detail` | 获取歌单详情 |
| `/login/cellphone` | 手机号登录 |

## 注意事项

1. 需要先启动 NeteaseCloudMusicApi 服务才能使用
2. 部分功能需要登录网易云账号
3. 歌曲播放URL有时效性
4. 请遵守网易云音乐的使用条款

## 参考

- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)
- [Plugin development guide](../../README.md)
