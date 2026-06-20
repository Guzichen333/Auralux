import {cacheManager} from '@/shared/cache';
import type {PlaybackStateSnapshot} from '@api/types/playback';
import type {MusicBoxSettings} from '@api/types/settings';
import type {Track} from '@api/types/track';

export const PLAYBACK_STATE_CACHE_KEY = 'playback-state';
export const PLAYBACK_QUEUE_CACHE_KEY = 'playback-queue-memory';

interface PlaybackQueueMemory {
    playlist: Track[];
    currentIndex: number;
    playMode: PlaybackStateSnapshot['playMode'];
    savedAt: number;
}

interface PlaybackPersistenceOptions {
    getPlaybackState: () => PlaybackStateSnapshot;
}

export class PlaybackPersistence {
    private readonly getPlaybackState: () => PlaybackStateSnapshot;
    private savePositionTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor({getPlaybackState}: PlaybackPersistenceOptions) {
        this.getPlaybackState = getPlaybackState;
    }

    isRememberPositionEnabled(): boolean {
        const settings = (cacheManager.getLocalCache('musicbox-settings') || {}) as MusicBoxSettings;
        return !!settings.rememberPosition;
    }

    createPlaybackState(position?: number): PlaybackStateSnapshot {
        const state = this.getPlaybackState();
        const playlist = this.normalizePlaylist(state.playlist);
        return {
            ...state,
            playlist,
            currentIndex: this.normalizeCurrentIndex(state.currentIndex, playlist),
            position: position ?? state.position,
            timestamp: Date.now()
        };
    }

    saveQueueSnapshot(): void {
        try {
            const state = this.createPlaybackState();
            const queueMemory: PlaybackQueueMemory = {
                playlist: state.playlist,
                currentIndex: state.currentIndex,
                playMode: state.playMode,
                savedAt: Date.now()
            };
            cacheManager.setLocalCache(PLAYBACK_QUEUE_CACHE_KEY, queueMemory);
        } catch (error) {
            console.error('API: failed to save playback queue:', error);
        }
    }

    throttledSavePosition(position: number): void {
        if (!this.isRememberPositionEnabled()) return;

        if (this.savePositionTimeout) {
            clearTimeout(this.savePositionTimeout);
        }

        this.savePositionTimeout = setTimeout(() => {
            try {
                cacheManager.setLocalCache(PLAYBACK_STATE_CACHE_KEY, this.createPlaybackState(position));
                this.saveQueueSnapshot();
            } catch (error) {
                console.error('❌ API: 保存播放位置失败:', error);
            }
        }, 2000);
    }

    saveCurrentPlaybackState(): void {
        if (!this.isRememberPositionEnabled()) {
            return;
        }

        try {
            const playbackState = this.createPlaybackState();

            console.log('💾 API: 保存播放状态:', {
                hasTrack: !!playbackState.currentTrack,
                trackTitle: playbackState.currentTrack?.title,
                position: playbackState.position,
                isPlaying: playbackState.isPlaying,
                playlistLength: playbackState.playlist.length,
                currentIndex: playbackState.currentIndex,
                playMode: playbackState.playMode
            });

            cacheManager.setLocalCache(PLAYBACK_STATE_CACHE_KEY, playbackState);
            this.saveQueueSnapshot();
            console.log('✅ API: 播放状态已保存（包含播放列表）');
        } catch (error) {
            console.error('❌ API: 保存播放状态失败:', error);
        }
    }

    private normalizePlaylist(playlist: Track[] | null | undefined): Track[] {
        return (playlist || []).filter((track): track is Track => Boolean(track?.filePath || track?.path));
    }

    private normalizeCurrentIndex(currentIndex: number, playlist: Track[]): number {
        if (playlist.length === 0) {
            return -1;
        }

        return currentIndex >= 0 && currentIndex < playlist.length ? currentIndex : 0;
    }
}
