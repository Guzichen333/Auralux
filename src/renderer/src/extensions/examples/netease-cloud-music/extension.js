/**
 * NetEase Cloud Music Extension for MusicBox
 * 网易云音乐集成插件 - 搜索、播放、歌单导入、歌词获取
 *
 * 依赖: NeteaseCloudMusicApi 服务 (https://github.com/Binaryify/NeteaseCloudMusicApi)
 * 安装: npm install -g NeteaseCloudMusicApi
 * 启动: npx NeteaseCloudMusicApi@latest
 */

function getExtensionAPI(context) {
    return context.api || createExtensionAPI(context);
}

let apiEndpoint = 'http://localhost:3000';
let cookie = '';

/**
 * 扩展激活函数
 */
async function activate(context) {
    console.log('🎵 NetEase Cloud Music Extension 已激活!');

    const api = getExtensionAPI(context);

    // 加载配置
    apiEndpoint = await api.settings.get('netease.apiEndpoint', 'http://localhost:3000');
    cookie = await api.storage.get('netease.cookie', '');

    // 检查 API 服务是否可用
    const isAvailable = await checkApiAvailability(api);
    if (isAvailable) {
        await api.ui.showNotification('NetEase Cloud Music 已连接', 'success');
    } else {
        await api.ui.showNotification('NetEase API 服务未启动，请先启动 NeteaseCloudMusicApi', 'warning');
    }

    // 注册命令
    await registerCommands(context, api);
    await registerSettings(context, api);

    // 监听播放状态变化，自动获取歌词
    await setupPlayerListeners(context, api);

    return {
        search: (keyword) => searchSongs(api, keyword),
        play: (songId) => playSong(api, songId),
        importPlaylist: (playlistId) => importPlaylist(api, playlistId)
    };
}

/**
 * 扩展停用函数
 */
async function deactivate() {
    console.log('👋 NetEase Cloud Music Extension 已停用');
}

window.neteaseCloudMusicExtension = {
    activate,
    deactivate
};

// ============================================================
// API 调用函数
// ============================================================

/**
 * 检查 API 服务是否可用
 */
async function checkApiAvailability(api) {
    try {
        const response = await api.network.get(`${apiEndpoint}/homepage/block/page`);
        return response && (typeof response === 'string' ? response.includes('code') : true);
    } catch (e) {
        console.warn('⚠️ NetEase API 服务不可用:', e.message);
        return false;
    }
}

/**
 * 发送 API 请求
 */
async function apiRequest(api, path, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${apiEndpoint}${path}${queryString ? '?' + queryString : ''}`;

    try {
        const response = await api.network.get(url);
        const data = typeof response === 'string' ? JSON.parse(response) : response;

        if (data.code === 200) {
            return data;
        } else {
            console.warn('⚠️ API 请求失败:', data.code, data.message);
            return null;
        }
    } catch (e) {
        console.error('❌ API 请求错误:', e.message);
        return null;
    }
}

/**
 * 搜索歌曲
 */
async function searchSongs(api, keyword, limit = 20) {
    const data = await apiRequest(api, '/cloudsearch', {
        keywords: keyword,
        limit: limit,
        type: 1 // 1=歌曲, 10=专辑, 100=歌手, 1000=歌单
    });

    if (data && data.result && data.result.songs) {
        return data.result.songs.map(song => ({
            id: song.id,
            title: song.name,
            artist: song.ar ? song.ar.map(a => a.name).join(', ') : '未知',
            album: song.al ? song.al.name : '未知',
            duration: song.dt ? Math.floor(song.dt / 1000) : 0,
            cover: song.al ? song.al.picUrl : null
        }));
    }
    return [];
}

/**
 * 获取歌曲播放 URL
 */
async function getSongUrl(api, songId, quality = 'exhigh') {
    const data = await apiRequest(api, '/song/url/v1', {
        id: songId,
        level: quality
    });

    if (data && data.data && data.data.length > 0) {
        const songData = data.data[0];
        return {
            url: songData.url,
            type: songData.type,
            size: songData.size,
            level: songData.level
        };
    }
    return null;
}

/**
 * 获取歌词
 */
async function getLyrics(api, songId) {
    const data = await apiRequest(api, '/lyric', {
        id: songId
    });

    if (data) {
        return {
            lrc: data.lrc ? data.lrc.lyric : null,
            tlyric: data.tlyric ? data.tlyric.lyric : null,
            romalrc: data.romalrc ? data.romalrc.lyric : null
        };
    }
    return null;
}

/**
 * 获取歌单详情
 */
async function getPlaylistDetail(api, playlistId) {
    const data = await apiRequest(api, '/playlist/detail', {
        id: playlistId
    });

    if (data && data.playlist) {
        const playlist = data.playlist;
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            cover: playlist.coverImgUrl,
            trackCount: playlist.trackCount,
            tracks: (playlist.tracks || []).map(track => ({
                id: track.id,
                title: track.name,
                artist: track.ar ? track.ar.map(a => a.name).join(', ') : '未知',
                album: track.al ? track.al.name : '未知',
                duration: track.dt ? Math.floor(track.dt / 1000) : 0,
                cover: track.al ? track.al.picUrl : null
            }))
        };
    }
    return null;
}

/**
 * 播放歌曲
 */
async function playSong(api, songId) {
    const songUrl = await getSongUrl(api, songId);
    if (!songUrl || !songUrl.url) {
        await api.ui.showNotification('无法获取歌曲播放链接', 'error');
        return false;
    }

    try {
        await api.player.playTrack(songUrl.url);
        await api.ui.showNotification('正在播放...', 'info');

        // 获取歌词
        const settings = await api.settings.get('netease.showLyrics', true);
        if (settings) {
            const lyrics = await getLyrics(api, songId);
            if (lyrics && lyrics.lrc) {
                await api.storage.update('currentLyrics', lyrics.lrc);
                console.log('📝 歌词已获取');
            }
        }

        return true;
    } catch (e) {
        console.error('❌ 播放失败:', e.message);
        await api.ui.showNotification('播放失败: ' + e.message, 'error');
        return false;
    }
}

/**
 * 导入歌单到本地库
 */
async function importPlaylist(api, playlistId) {
    const playlist = await getPlaylistDetail(api, playlistId);
    if (!playlist) {
        await api.ui.showNotification('无法获取歌单详情', 'error');
        return false;
    }

    await api.ui.showNotification(`正在导入歌单: ${playlist.name} (${playlist.trackCount}首)`, 'info');

    let imported = 0;
    for (const track of playlist.tracks) {
        try {
            const songUrl = await getSongUrl(api, track.id);
            if (songUrl && songUrl.url) {
                await api.library.addTrack({
                    id: `netease-${track.id}`,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    duration: track.duration,
                    path: songUrl.url,
                    cover: track.cover,
                    source: 'netease-cloud-music'
                });
                imported++;
            }
        } catch (e) {
            console.warn(`⚠️ 导入失败: ${track.title}`, e.message);
        }
    }

    await api.ui.showNotification(`歌单导入完成: ${imported}/${playlist.trackCount} 首`, 'success');
    return true;
}

// ============================================================
// 命令注册
// ============================================================

async function registerCommands(context, api) {
    // 搜索命令
    const searchCommand = await api.commands.registerCommand('netease.search', async () => {
        const keyword = await api.ui.showInputBox({
            prompt: '输入搜索关键词',
            placeholder: '歌曲名、歌手名、专辑名'
        });

        if (!keyword) return;

        await api.ui.showNotification('正在搜索...', 'info');
        const songs = await searchSongs(api, keyword);

        if (songs.length === 0) {
            await api.ui.showNotification('未找到结果', 'warning');
            return;
        }

        // 显示搜索结果
        const resultText = songs.slice(0, 10).map((s, i) =>
            `${i + 1}. ${s.title} - ${s.artist}`
        ).join('\n');

        const confirmed = await api.ui.showConfirmDialog(
            `找到 ${songs.length} 首歌曲:\n\n${resultText}\n\n播放第一首?`,
            { title: '搜索结果', confirmText: '播放', cancelText: '取消' }
        );

        if (confirmed && songs.length > 0) {
            await playSong(api, songs[0].id);
        }
    });
    context.subscriptions.add(searchCommand);

    // 导入歌单命令
    const importCommand = await api.commands.registerCommand('netease.importPlaylist', async () => {
        const playlistId = await api.ui.showInputBox({
            prompt: '输入网易云歌单ID',
            placeholder: '例如: 123456789'
        });

        if (!playlistId || isNaN(playlistId)) {
            await api.ui.showNotification('请输入有效的歌单ID', 'warning');
            return;
        }

        await importPlaylist(api, playlistId);
    });
    context.subscriptions.add(importCommand);

    // 登录命令
    const loginCommand = await api.commands.registerCommand('netease.login', async () => {
        const phone = await api.ui.showInputBox({
            prompt: '输入手机号',
            placeholder: '13800138000'
        });

        if (!phone) return;

        const password = await api.ui.showInputBox({
            prompt: '输入密码',
            placeholder: '密码'
        });

        if (!password) return;

        try {
            const data = await apiRequest(api, '/login/cellphone', {
                phone: phone,
                password: password
            });

            if (data && data.code === 200) {
                cookie = data.cookie || '';
                await api.storage.update('netease.cookie', cookie);
                await api.ui.showNotification(`登录成功: ${data.profile ? data.profile.nickname : '用户'}`, 'success');
            } else {
                await api.ui.showNotification('登录失败: ' + (data ? data.message : '未知错误'), 'error');
            }
        } catch (e) {
            await api.ui.showNotification('登录失败: ' + e.message, 'error');
        }
    });
    context.subscriptions.add(loginCommand);

    // 设置命令
    const settingsCommand = await api.commands.registerCommand('netease.showSettings', async () => {
        await api.ui.showNotification('请在设置页面中配置 NetEase Cloud Music', 'info');
    });
    context.subscriptions.add(settingsCommand);
}

// ============================================================
// 设置页面注册
// ============================================================

async function registerSettings(context, api) {
    const sectionDisposable = await api.ui.registerSettingsSection('netease', 'NetEase Cloud Music', {
        order: 500
    });
    context.subscriptions.add(sectionDisposable);

    const pageDisposable = await api.ui.registerSettingsPageSchema('netease', {
        items: [
            {
                id: 'apiEndpoint',
                type: 'input',
                label: 'API 服务地址',
                description: 'NeteaseCloudMusicApi 服务地址',
                value: apiEndpoint,
                inputType: 'url',
                placeholder: 'http://localhost:3000',
                async onChange(value) {
                    apiEndpoint = value;
                    await api.settings.set('netease.apiEndpoint', value);
                }
            },
            {
                id: 'defaultQuality',
                type: 'select',
                label: '默认音质',
                description: '选择默认的播放音质',
                value: await api.settings.get('netease.defaultQuality', 'exhigh'),
                options: [
                    { value: 'standard', label: '标准' },
                    { value: 'higher', label: '较高' },
                    { value: 'exhigh', label: '极高' },
                    { value: 'lossless', label: '无损' },
                    { value: 'hires', label: 'Hi-Res' }
                ],
                async onChange(value) {
                    await api.settings.set('netease.defaultQuality', value);
                }
            },
            {
                id: 'autoPlay',
                type: 'toggle',
                label: '自动播放',
                description: '搜索后自动播放第一首歌曲',
                value: await api.settings.get('netease.autoPlay', true),
                async onChange(value) {
                    await api.settings.set('netease.autoPlay', value);
                }
            },
            {
                id: 'showLyrics',
                type: 'toggle',
                label: '自动获取歌词',
                description: '播放歌曲时自动获取歌词',
                value: await api.settings.get('netease.showLyrics', true),
                async onChange(value) {
                    await api.settings.set('netease.showLyrics', value);
                }
            },
            {
                id: 'maxResults',
                type: 'input',
                label: '搜索结果数量',
                description: '每次搜索显示的最大结果数',
                value: String(await api.settings.get('netease.maxResults', 20)),
                inputType: 'number',
                min: 5,
                max: 100,
                async onChange(value) {
                    await api.settings.set('netease.maxResults', Math.min(100, Math.max(5, Number(value) || 20)));
                }
            }
        ]
    });
    context.subscriptions.add(pageDisposable);
}

// ============================================================
// 播放器监听
// ============================================================

async function setupPlayerListeners(context, api) {
    const stateListener = await api.player.onPlaybackStateChanged(async (state) => {
        if (state === 'playing') {
            const track = await api.player.getCurrentTrack();
            if (track) {
                console.log('🎵 正在播放:', track.title);
            }
        }
    });
    context.subscriptions.add(stateListener);
}
