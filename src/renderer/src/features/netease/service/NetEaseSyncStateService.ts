import type {Track} from '@api/types/library';
import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {cacheManager} from '@/shared/cache/CacheManager';
import {netEaseApiClient} from './NetEaseApiClient';
import {netEasePlaylistImportService} from './NetEasePlaylistImportService';
import {netEasePlaylistSyncService, type SyncResult} from './NetEasePlaylistSyncService';

export type NetEasePlaylistSyncStatus = 'idle' | 'syncing' | 'success' | 'failed' | 'conflict';

export interface NetEasePlaylistSyncConflict {
    localOnlyTrackCount: number;
    removedRemoteCount: number;
    localOnlyTrackTitles: string[];
    removedRemoteTrackPaths: string[];
}

export interface NetEasePlaylistSyncState {
    playlistId: string;
    externalId: string;
    status: NetEasePlaylistSyncStatus;
    lastAttemptAt?: number;
    lastSuccessfulSyncAt?: number;
    failureReason?: string;
    retryable: boolean;
    conflict?: NetEasePlaylistSyncConflict;
}

export interface StatefulSyncResult extends SyncResult {
    state: NetEasePlaylistSyncState;
}

export interface StatefulSyncOptions {
    allowConflict?: boolean;
}

class NetEaseSyncStateService {
    private readonly cacheKey = 'netease-playlist-sync-states';

    getPlaylistSyncState(playlistId: string): NetEasePlaylistSyncState | null {
        return this.getStates()[playlistId] || null;
    }

    getAllPlaylistSyncStates(): Record<string, NetEasePlaylistSyncState> {
        return this.getStates();
    }

    async syncPlaylistWithState(
        playlistId: string,
        externalId: string,
        options: StatefulSyncOptions = {}
    ): Promise<StatefulSyncResult> {
        this.saveState({
            playlistId,
            externalId,
            status: 'syncing',
            lastAttemptAt: Date.now(),
            retryable: false
        });

        try {
            if (!options.allowConflict) {
                const conflict = await this.detectLocalProtectionConflict(playlistId, externalId);
                if (conflict.localOnlyTrackCount > 0 || conflict.removedRemoteCount > 0) {
                    const state = this.saveState({
                        playlistId,
                        externalId,
                        status: 'conflict',
                        lastAttemptAt: Date.now(),
                        failureReason: this.describeConflict(conflict),
                        retryable: true,
                        conflict
                    });
                    return this.toSyncResult(false, state.failureReason || 'Conflict detected', state);
                }
            }

            const result = await netEasePlaylistSyncService.syncPlaylist(playlistId, externalId);
            if (!result.success) {
                const state = this.saveState({
                    playlistId,
                    externalId,
                    status: 'failed',
                    lastAttemptAt: Date.now(),
                    failureReason: result.error || 'Sync failed',
                    retryable: true
                });
                return {...result, state};
            }

            const state = this.saveState({
                playlistId,
                externalId,
                status: 'success',
                lastAttemptAt: Date.now(),
                lastSuccessfulSyncAt: Date.now(),
                retryable: false,
                conflict: result.removedRemoteCount > 0 ? {
                    localOnlyTrackCount: 0,
                    removedRemoteCount: result.removedRemoteCount,
                    localOnlyTrackTitles: [],
                    removedRemoteTrackPaths: []
                } : undefined
            });
            return {...result, state};
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'Sync failed';
            const state = this.saveState({
                playlistId,
                externalId,
                status: 'failed',
                lastAttemptAt: Date.now(),
                failureReason,
                retryable: true
            });
            return this.toSyncResult(false, failureReason, state);
        }
    }

    async retryPlaylistSync(playlistId: string): Promise<StatefulSyncResult> {
        const state = this.getPlaylistSyncState(playlistId);
        if (!state?.externalId) {
            const missingState = this.saveState({
                playlistId,
                externalId: '',
                status: 'failed',
                lastAttemptAt: Date.now(),
                failureReason: 'Missing NetEase playlist id',
                retryable: false
            });
            return this.toSyncResult(false, missingState.failureReason || 'Missing NetEase playlist id', missingState);
        }

        return await this.syncPlaylistWithState(playlistId, state.externalId, {
            allowConflict: state.status === 'conflict'
        });
    }

    async detectLocalProtectionConflict(
        playlistId: string,
        externalId: string
    ): Promise<NetEasePlaylistSyncConflict> {
        const empty = this.emptyConflict();
        const available = await netEaseApiClient.checkAvailability();
        if (!available) {
            return empty;
        }

        const remotePlaylistId = Number.parseInt(externalId, 10);
        if (!Number.isFinite(remotePlaylistId) || remotePlaylistId <= 0) {
            return empty;
        }

        const remotePlaylist = await netEasePlaylistImportService.getPlaylistDetail(remotePlaylistId);
        const detailResult = await libraryDataService.getPlaylistDetail(playlistId);
        if (!remotePlaylist || !detailResult?.success) {
            return empty;
        }

        const existingTracks: Track[] = detailResult.tracks || [];
        const remotePaths = new Set(remotePlaylist.tracks.map(song => `netease://${song.id}`));
        const localOnlyTracks = existingTracks.filter(track => {
            const filePath = track.filePath || track.path || '';
            return filePath && !filePath.startsWith('netease://');
        });
        const removedRemoteTrackPaths = existingTracks
            .map(track => track.filePath || track.path || '')
            .filter(filePath => filePath.startsWith('netease://') && !remotePaths.has(filePath));

        return {
            localOnlyTrackCount: localOnlyTracks.length,
            removedRemoteCount: removedRemoteTrackPaths.length,
            localOnlyTrackTitles: localOnlyTracks.slice(0, 5).map(track => track.title || track.fileName || track.filePath),
            removedRemoteTrackPaths: removedRemoteTrackPaths.slice(0, 5)
        };
    }

    private getStates(): Record<string, NetEasePlaylistSyncState> {
        return cacheManager.getLocalCache<Record<string, NetEasePlaylistSyncState>>(this.cacheKey) || {};
    }

    private saveState(state: NetEasePlaylistSyncState): NetEasePlaylistSyncState {
        const states = this.getStates();
        const previous = states[state.playlistId];
        const next = {
            ...previous,
            ...state
        };
        cacheManager.setLocalCache(this.cacheKey, {
            ...states,
            [state.playlistId]: next
        });
        return next;
    }

    private emptyConflict(): NetEasePlaylistSyncConflict {
        return {
            localOnlyTrackCount: 0,
            removedRemoteCount: 0,
            localOnlyTrackTitles: [],
            removedRemoteTrackPaths: []
        };
    }

    private describeConflict(conflict: NetEasePlaylistSyncConflict): string {
        const parts: string[] = [];
        if (conflict.localOnlyTrackCount > 0) {
            parts.push(`${conflict.localOnlyTrackCount} local-only tracks`);
        }
        if (conflict.removedRemoteCount > 0) {
            parts.push(`${conflict.removedRemoteCount} tracks removed from cloud`);
        }
        return `Sync conflict: ${parts.join(', ')}. Local tracks are protected.`;
    }

    private toSyncResult(success: boolean, error: string, state: NetEasePlaylistSyncState): StatefulSyncResult {
        return {
            success,
            addedCount: 0,
            existingCount: 0,
            skippedCount: 0,
            removedRemoteCount: state.conflict?.removedRemoteCount || 0,
            updatedMetadata: false,
            error,
            state
        };
    }
}

export const netEaseSyncStateService = new NetEaseSyncStateService();
export {NetEaseSyncStateService};
