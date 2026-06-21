import {libraryController} from '@/features/library/LibraryController';
import {playbackController} from '@/features/playback/PlaybackController';
import {netEaseApiClient, netEaseAuthService} from '@/features/netease/service';
import {mediaDirectorySettingsService} from '@/features/settings/service';
import {cacheManager} from '@/shared/cache';
import type {MusicBoxSettings} from '@api/types/settings';
import {playlistCoverManifest} from './playlistCoverManifest';
import type {UINextPlaylistLike} from './playlistCoverTypes';

export const MIN_STARTUP_DISPLAY_MS = 1000;
export const MAX_STARTUP_WAIT_MS = 45000;

export type StartupWarmupStatus = 'pending' | 'running' | 'done' | 'degraded';

export interface StartupWarmupTaskState {
    id: string;
    label: string;
    status: StartupWarmupStatus;
    message: string;
}

export interface StartupWarmupResult {
    tasks: StartupWarmupTaskState[];
    degraded: string[];
    timedOut: boolean;
    elapsedMs: number;
}

export type StartupWarmupUpdate = (tasks: StartupWarmupTaskState[]) => void;

type StartupWarmupTaskDefinition = {
    id: string;
    label: string;
    run: () => Promise<string>;
    critical?: boolean;
};

function readSettings(): MusicBoxSettings {
    return cacheManager.getLocalCache<MusicBoxSettings>('musicbox-settings') || {};
}

function getCacheStorageCount(prefix: string): number {
    try {
        return Object.keys(localStorage).filter((key) => key.includes(prefix)).length;
    } catch {
        return 0;
    }
}

async function preloadStartupPlaylistCovers(): Promise<string> {
    const playlists = await libraryController.getPlaylists();
    const preload = playlistCoverManifest.preloadStableCoverMetadata(playlists as UINextPlaylistLike[]);
    if (preload.hits > 0) {
        return `封面缓存命中 ${preload.hits} 个`;
    }
    if (preload.scheduled > 0) {
        return `已排队检查封面 ${preload.scheduled} 个`;
    }
    return '歌单封面缓存已就绪';
}

function waitForNetEaseApiReady(): Promise<string> {
    return new Promise((resolve, reject) => {
        const neteaseApi = window.electronAPI?.netease;
        if (!neteaseApi) {
            reject(new Error('NetEase API startup channel is unavailable'));
            return;
        }

        let settled = false;
        let unsubscribeReady: (() => void) | undefined;
        let unsubscribeUnavailable: (() => void) | undefined;

        const cleanup = () => {
            unsubscribeReady?.();
            unsubscribeUnavailable?.();
        };

        unsubscribeReady = neteaseApi.onApiReady((data) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(data.endpoint);
        });

        unsubscribeUnavailable = neteaseApi.onApiUnavailable((data) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(data.error || `NetEase API startup failed: ${data.endpoint}`));
        });
    });
}

function createTaskDefinitions(): StartupWarmupTaskDefinition[] {
    return [
        {
            id: 'settings',
            label: '读取设置',
            run: async () => {
                readSettings();
                return '设置已读取';
            }
        },
        {
            id: 'library',
            label: '加载本地曲库',
            run: async () => {
                const [tracks, playlists] = await Promise.all([
                    libraryController.loadCachedTracks(),
                    libraryController.getPlaylists()
                ]);
                return `曲库 ${tracks.length} 首，歌单 ${playlists.length} 个`;
            }
        },
        {
            id: 'playbackQueue',
            label: '恢复播放队列',
            run: async () => {
                const queue = playbackController.getPlaylist();
                const current = playbackController.getCurrentTrackSnapshot();
                return current ? `队列 ${queue.length} 首，当前 ${current.title || '未命名歌曲'}` : `队列 ${queue.length} 首`;
            }
        },
        {
            id: 'neteaseAvailability',
            critical: true,
            label: '连接网易云 API',
            run: async () => {
                const endpoint = await waitForNetEaseApiReady();
                netEaseApiClient.setApiEndpoint(endpoint);
                const available = await netEaseApiClient.checkAvailability();
                if (!available) {
                    throw new Error('网易云 API 暂不可用，本地功能继续');
                }
                return '网易云 API 已连接';
            }
        },
        {
            id: 'neteaseProfile',
            label: '同步网易云账号',
            run: async () => {
                const endpoint = await waitForNetEaseApiReady();
                netEaseApiClient.setApiEndpoint(endpoint);
                const profile = await netEaseAuthService.getAccountProfile();
                return profile?.nickname ? `账号 ${profile.nickname}` : '未登录网易云';
            }
        },
        {
            id: 'coverCache',
            label: '检查封面缓存',
            run: async () => {
                const settings = readSettings();
                const directory = await mediaDirectorySettingsService.resolveCoverCacheDirectory(
                    typeof settings.coverCacheDirectory === 'string' ? settings.coverCacheDirectory : null
                );
                return directory.directory ? '封面缓存目录已就绪' : '使用默认封面缓存';
            }
        },
        {
            id: 'coverManifest',
            label: '预加载歌单封面',
            run: preloadStartupPlaylistCovers
        },
        {
            id: 'lyricsCacheIndex',
            label: '预热歌词索引',
            run: async () => {
                const warmed = cacheManager.warmLyricsCacheIndex();
                return warmed > 0 ? `歌词索引已预热 ${warmed} 项` : '歌词索引已就绪';
            }
        },
        {
            id: 'lyricsCache',
            label: '检查歌词缓存',
            run: async () => {
                const count = getCacheStorageCount('lyrics');
                return count > 0 ? `歌词缓存 ${count} 项` : '歌词缓存已就绪';
            }
        }
    ];
}

function cloneTasks(tasks: StartupWarmupTaskState[]): StartupWarmupTaskState[] {
    return tasks.map((task) => ({...task}));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => resolve('timeout'), timeoutMs);
        promise.then((value) => {
            window.clearTimeout(timer);
            resolve(value);
        }).catch((error) => {
            window.clearTimeout(timer);
            reject(error);
        });
    });
}

export async function runStartupWarmup(onUpdate: StartupWarmupUpdate = () => {}): Promise<StartupWarmupResult> {
    const startedAt = performance.now();
    const definitions = createTaskDefinitions();
    const criticalTaskIds = new Set(['neteaseAvailability']);
    const tasks: StartupWarmupTaskState[] = definitions.map((task) => ({
        id: task.id,
        label: task.label,
        status: 'pending',
        message: '等待中'
    }));
    const degraded: string[] = [];

    const update = () => onUpdate(cloneTasks(tasks));
    update();

    const work = Promise.all(definitions.map(async (definition, index) => {
        tasks[index].status = 'running';
        tasks[index].message = '正在处理';
        update();

        try {
            const message = await definition.run();
            tasks[index].status = 'done';
            tasks[index].message = message;
        } catch (error) {
            if (definition.critical || criticalTaskIds.has(definition.id)) {
                throw error;
            }
            tasks[index].status = 'degraded';
            tasks[index].message = error instanceof Error ? error.message : '已降级';
            degraded.push(definition.id);
        }
        update();
    }));

    const timed = await withTimeout(work, MAX_STARTUP_WAIT_MS);
    const timedOut = timed === 'timeout';
    if (timedOut) {
        if (tasks.some((task) => task.id === 'neteaseAvailability' && (task.status === 'pending' || task.status === 'running'))) {
            throw new Error('Startup critical task timed out: neteaseAvailability');
        }
        tasks.forEach((task) => {
            if (task.status === 'pending' || task.status === 'running') {
                task.status = 'degraded';
                task.message = '后台继续处理';
                degraded.push(task.id);
            }
        });
        update();
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info('[ui-next] startup warmup', {
        elapsedMs,
        timedOut,
        degraded,
        tasks: tasks.map((task) => ({id: task.id, status: task.status, message: task.message}))
    });

    return {
        tasks: cloneTasks(tasks),
        degraded,
        timedOut,
        elapsedMs
    };
}

export function waitForStartupGate(startedAt: number): Promise<void> {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_STARTUP_DISPLAY_MS - elapsed);
    return new Promise((resolve) => window.setTimeout(resolve, remaining));
}
