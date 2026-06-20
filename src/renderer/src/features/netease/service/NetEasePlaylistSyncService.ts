import {libraryController} from '@/features/library/LibraryController';
import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {netEaseApiClient} from './NetEaseApiClient';
import {netEasePlaylistImportService} from './NetEasePlaylistImportService';
import type {Track} from '@api/types/library';

export interface SyncResult {
    success: boolean;
    addedCount: number;
    existingCount: number;
    skippedCount: number;
    removedRemoteCount: number;
    updatedMetadata: boolean;
    error?: string;
}

class NetEasePlaylistSyncService {
    async syncPlaylist(playlistId: string, externalId: string): Promise<SyncResult> {
        const available = await netEaseApiClient.checkAvailability();
        if (!available) {
            return {success: false, addedCount: 0, existingCount: 0, skippedCount: 0, removedRemoteCount: 0, updatedMetadata: false, error: 'NetEase API 服务未启动'};
        }

        const remotePlaylistId = Number.parseInt(externalId, 10);
        if (!Number.isFinite(remotePlaylistId) || remotePlaylistId <= 0) {
            return {success: false, addedCount: 0, existingCount: 0, skippedCount: 0, removedRemoteCount: 0, updatedMetadata: false, error: '无效的网易云歌单 ID'};
        }

        const remotePlaylist = await netEasePlaylistImportService.getPlaylistDetail(remotePlaylistId);
        if (!remotePlaylist) {
            return {success: false, addedCount: 0, existingCount: 0, skippedCount: 0, removedRemoteCount: 0, updatedMetadata: false, error: '无法获取远程歌单信息'};
        }

        const detailResult = await libraryDataService.getPlaylistDetail(playlistId);
        if (!detailResult || !detailResult.success) {
            return {success: false, addedCount: 0, existingCount: 0, skippedCount: 0, removedRemoteCount: 0, updatedMetadata: false, error: '无法获取本地歌单信息'};
        }

        const existingTracks: Track[] = detailResult.tracks || [];
        const existingFilePaths = new Set(existingTracks.map(t => t.filePath).filter(Boolean));

        const remotePaths = new Set(remotePlaylist.tracks.map(song => `netease://${song.id}`));
        const localNeteasePaths = new Set([...existingFilePaths].filter(p => p.startsWith('netease://')));
        let removedRemoteCount = 0;
        for (const lp of localNeteasePaths) {
            if (!remotePaths.has(lp)) removedRemoteCount++;
        }

        let addedCount = 0;
        let existingCount = 0;
        let skippedCount = 0;
        const newFileIds: string[] = [];

        for (const song of remotePlaylist.tracks) {
            const filePath = `netease://${song.id}`;

            if (existingFilePaths.has(filePath)) {
                existingCount++;
                continue;
            }

            try {
                const trackData: Partial<Track> = {
                    filePath,
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    duration: song.duration,
                    cover: song.cover
                };

                const result = await libraryController.addTrackToLibrary(trackData);
                if (result && result.success && result.track?.fileId) {
                    newFileIds.push(result.track.fileId);
                    addedCount++;
                } else {
                    skippedCount++;
                }
            } catch {
                skippedCount++;
            }
        }

        if (newFileIds.length > 0) {
            await libraryDataService.addToPlaylist(playlistId, newFileIds);
        }

        await libraryDataService.updatePlaylistMetadata(playlistId, {
            lastSyncedAt: Date.now(),
            coverImagePath: remotePlaylist.cover
        });

        await libraryDataService.renamePlaylist(playlistId, `[网易云] ${remotePlaylist.name}`);

        return {
            success: true,
            addedCount,
            existingCount,
            skippedCount,
            removedRemoteCount,
            updatedMetadata: true
        };
    }
}

export const netEasePlaylistSyncService = new NetEasePlaylistSyncService();
export {NetEasePlaylistSyncService};
