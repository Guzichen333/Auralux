import {libraryController} from '@/features/library/LibraryController';
import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {netEaseApiClient} from './NetEaseApiClient';
import {netEaseMigrationReportService, type NetEaseMigrationFailure} from './NetEaseMigrationReportService';
import {netEasePlaylistImportService} from './NetEasePlaylistImportService';
import type {
    NetEaseMigrationAssetKind,
    NetEaseMigrationControl,
    NetEaseMigrationPreview,
    NetEaseMigrationProgress,
    NetEasePlaylist,
    NetEaseSong
} from '../types';
import type {Track} from '@api/types/library';

type ProgressHandler = (progress: NetEaseMigrationProgress) => void;

interface PlaylistMigrationStats {
    playlistId?: string;
    added: number;
    existing: number;
    skipped: number;
    duplicates: number;
    failures: NetEaseMigrationFailure[];
}

interface MigrationSummary {
    success: boolean;
    preview?: NetEaseMigrationPreview;
    importedPlaylists: number;
    importedTracks: number;
    existingTracks: number;
    skippedTracks: number;
    failures: NetEaseMigrationFailure[];
    error?: string;
    cancelled?: boolean;
}

interface NetEaseMigrationPreflight {
    preview: NetEaseMigrationPreview;
    totalTracks: number;
    estimatedPlaylists: number;
    groups: NetEaseMigrationPreview['groups'];
}

class NetEaseAssetMigrationService {
    async getMigrationPreview(): Promise<NetEaseMigrationPreview | null> {
        const account = await netEaseApiClient.get('/user/account');
        const userId = Number(account?.account?.id || account?.profile?.userId || 0);
        if (!Number.isFinite(userId) || userId <= 0) {
            return null;
        }

        const [likedSongs, playlists, recentPlays] = await Promise.all([
            this.getLikedSongs(userId),
            this.getUserPlaylists(userId),
            this.getRecentPlays()
        ]);

        const createdPlaylists = playlists.filter(playlist => playlist.creatorUserId === userId);
        const subscribedPlaylists = playlists.filter(playlist => playlist.creatorUserId !== userId);

        return {
            userId,
            likedSongs,
            createdPlaylists,
            subscribedPlaylists,
            recentPlays,
            groups: [
                {kind: 'liked-songs', label: '我喜欢', count: likedSongs.length},
                {kind: 'created-playlists', label: '创建歌单', count: createdPlaylists.length},
                {kind: 'subscribed-playlists', label: '收藏歌单', count: subscribedPlaylists.length},
                {kind: 'recent-plays', label: '最近播放', count: recentPlays.length}
            ]
        };
    }

    async migrateAllAssets(onProgress?: ProgressHandler, control?: NetEaseMigrationControl): Promise<MigrationSummary> {
        const preview = await this.getMigrationPreview();
        if (!preview) {
            return {
                success: false,
                importedPlaylists: 0,
                importedTracks: 0,
                existingTracks: 0,
                skippedTracks: 0,
                failures: [{songId: 'account', title: '网易云账号', reason: '无法获取账号资产'}],
                error: '无法获取网易云账号资产'
            };
        }

        return await this.migratePreview(preview, onProgress, control);
    }

    async prepareMigrationPreflight(): Promise<NetEaseMigrationPreflight> {
        const preview = await this.getMigrationPreview();
        if (!preview) {
            throw new Error('Unable to read NetEase account assets');
        }

        const totalTracks = preview.likedSongs.length
            + preview.recentPlays.length
            + preview.createdPlaylists.reduce((sum, playlist) => sum + Number(playlist.trackCount || playlist.tracks?.length || 0), 0)
            + preview.subscribedPlaylists.reduce((sum, playlist) => sum + Number(playlist.trackCount || playlist.tracks?.length || 0), 0);

        return {
            preview,
            totalTracks,
            estimatedPlaylists: 2 + preview.createdPlaylists.length + preview.subscribedPlaylists.length,
            groups: preview.groups
        };
    }

    async migratePreview(preview: NetEaseMigrationPreview, onProgress?: ProgressHandler, control?: NetEaseMigrationControl): Promise<MigrationSummary> {
        const failures: NetEaseMigrationFailure[] = [];
        let importedPlaylists = 0;
        let importedTracks = 0;
        let existingTracks = 0;
        let skippedTracks = 0;

        if (this.ensureNotCancelled(control, onProgress)) {
            return this.cancelledSummary(preview, failures, importedPlaylists, importedTracks, existingTracks, skippedTracks);
        }

        const liked = await this.migrateLikedSongs(preview, onProgress, control);
        importedPlaylists += liked.playlistId ? 1 : 0;
        importedTracks += liked.added;
        existingTracks += liked.existing;
        skippedTracks += liked.skipped;
        failures.push(...liked.failures);

        if (this.ensureNotCancelled(control, onProgress)) {
            return this.cancelledSummary(preview, failures, importedPlaylists, importedTracks, existingTracks, skippedTracks);
        }

        const created = await this.migrateUserPlaylists('created-playlists', preview.createdPlaylists, onProgress, control);
        importedPlaylists += created.importedPlaylists;
        importedTracks += created.importedTracks;
        existingTracks += created.existingTracks;
        skippedTracks += created.skippedTracks;
        failures.push(...created.failures);

        if (this.ensureNotCancelled(control, onProgress)) {
            return this.cancelledSummary(preview, failures, importedPlaylists, importedTracks, existingTracks, skippedTracks);
        }

        const subscribed = await this.migrateUserPlaylists('subscribed-playlists', preview.subscribedPlaylists, onProgress, control);
        importedPlaylists += subscribed.importedPlaylists;
        importedTracks += subscribed.importedTracks;
        existingTracks += subscribed.existingTracks;
        skippedTracks += subscribed.skippedTracks;
        failures.push(...subscribed.failures);

        if (this.ensureNotCancelled(control, onProgress)) {
            return this.cancelledSummary(preview, failures, importedPlaylists, importedTracks, existingTracks, skippedTracks);
        }

        const recent = await this.migrateRecentPlays(preview, onProgress, control);
        importedPlaylists += recent.playlistId ? 1 : 0;
        importedTracks += recent.added;
        existingTracks += recent.existing;
        skippedTracks += recent.skipped;
        failures.push(...recent.failures);

        onProgress?.({
            kind: 'recent-plays',
            label: '网易云资产',
            current: importedTracks + existingTracks + skippedTracks,
            total: importedTracks + existingTracks + skippedTracks,
            message: '网易云资产迁移完成',
            phase: 'completed'
        });

        return {
            success: failures.length === 0,
            preview,
            importedPlaylists,
            importedTracks,
            existingTracks,
            skippedTracks,
            failures
        };
    }

    async migrateLikedSongs(
        preview: NetEaseMigrationPreview,
        onProgress?: ProgressHandler,
        control?: NetEaseMigrationControl
    ): Promise<PlaylistMigrationStats> {
        return await this.importSongsAsPlaylist({
            kind: 'liked-songs',
            label: '我喜欢',
            externalId: `liked-${preview.userId}`,
            playlistName: '[网易云] 我喜欢',
            description: '从网易云音乐迁移的我喜欢歌曲',
            cover: preview.likedSongs[0]?.cover || '',
            songs: preview.likedSongs,
            onProgress,
            control
        });
    }

    async migrateRecentPlays(
        preview: NetEaseMigrationPreview,
        onProgress?: ProgressHandler,
        control?: NetEaseMigrationControl
    ): Promise<PlaylistMigrationStats> {
        return await this.importSongsAsPlaylist({
            kind: 'recent-plays',
            label: '最近播放',
            externalId: `recent-${preview.userId}`,
            playlistName: '[网易云] 最近播放',
            description: '从网易云音乐迁移的最近播放歌曲',
            cover: preview.recentPlays[0]?.cover || '',
            songs: preview.recentPlays,
            onProgress,
            control
        });
    }

    async migrateUserPlaylists(
        kind: Extract<NetEaseMigrationAssetKind, 'created-playlists' | 'subscribed-playlists'>,
        playlists: NetEasePlaylist[],
        onProgress?: ProgressHandler,
        control?: NetEaseMigrationControl
    ): Promise<Omit<MigrationSummary, 'success' | 'preview' | 'error'>> {
        const label = kind === 'created-playlists' ? '创建歌单' : '收藏歌单';
        const failures: NetEaseMigrationFailure[] = [];
        let importedPlaylists = 0;
        let importedTracks = 0;
        let existingTracks = 0;
        let skippedTracks = 0;

        for (let i = 0; i < playlists.length; i++) {
            if (this.ensureNotCancelled(control, onProgress, kind, label)) {
                break;
            }

            const sourcePlaylist = playlists[i];
            onProgress?.({
                kind,
                label,
                current: i + 1,
                total: playlists.length,
                message: `正在获取${label}：${sourcePlaylist.name}`,
                phase: 'fetching'
            });

            const playlist = sourcePlaylist.tracks?.length
                ? sourcePlaylist
                : await netEasePlaylistImportService.getPlaylistDetail(sourcePlaylist.id);
            if (!playlist) {
                skippedTracks++;
                failures.push({
                    songId: sourcePlaylist.id,
                    title: sourcePlaylist.name,
                    reason: '无法获取歌单详情'
                });
                continue;
            }

            const stats = await this.importSongsAsPlaylist({
                kind,
                label,
                externalId: String(playlist.id),
                playlistName: `[网易云] ${playlist.name}`,
                description: playlist.description || '',
                cover: playlist.cover,
                songs: playlist.tracks,
                onProgress,
                control
            });
            importedPlaylists += stats.playlistId ? 1 : 0;
            importedTracks += stats.added;
            existingTracks += stats.existing;
            skippedTracks += stats.skipped;
            failures.push(...stats.failures);
        }

        return {
            importedPlaylists,
            importedTracks,
            existingTracks,
            skippedTracks,
            failures
        };
    }

    private async getLikedSongs(userId: number): Promise<NetEaseSong[]> {
        const data = await netEaseApiClient.get('/likelist', {uid: String(userId)});
        const ids = Array.isArray(data?.ids) ? data.ids : [];
        return await this.getSongDetails(ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id)));
    }

    private async getUserPlaylists(userId: number): Promise<Array<NetEasePlaylist & {creatorUserId?: number}>> {
        const data = await netEaseApiClient.get('/user/playlist', {uid: String(userId), limit: '1000'});
        const playlists = Array.isArray(data?.playlist) ? data.playlist : [];
        return playlists.map((playlist: any) => ({
            id: Number(playlist.id),
            name: playlist.name || '未命名歌单',
            description: playlist.description || '',
            cover: playlist.coverImgUrl || '',
            trackCount: Number(playlist.trackCount || 0),
            tracks: [],
            creatorUserId: Number(playlist.creator?.userId || 0)
        })).filter((playlist: NetEasePlaylist) => Number.isFinite(playlist.id) && playlist.id > 0);
    }

    private async getRecentPlays(): Promise<NetEaseSong[]> {
        const data = await netEaseApiClient.get('/record/recent/song', {limit: '100'});
        const list = Array.isArray(data?.data?.list) ? data.data.list : [];
        return list
            .map((item: any) => item?.data || item?.song || item)
            .map((song: any) => this.toSong(song))
            .filter((song: NetEaseSong | null): song is NetEaseSong => Boolean(song));
    }

    private async getSongDetails(ids: number[]): Promise<NetEaseSong[]> {
        if (ids.length === 0) return [];
        const data = await netEaseApiClient.get('/song/detail', {ids: ids.join(',')});
        const songs = Array.isArray(data?.songs) ? data.songs : [];
        return songs
            .map((song: any) => this.toSong(song))
            .filter((song: NetEaseSong | null): song is NetEaseSong => Boolean(song));
    }

    private async importSongsAsPlaylist(input: {
        kind: NetEaseMigrationAssetKind;
        label: string;
        externalId: string;
        playlistName: string;
        description: string;
        cover: string;
        songs: NetEaseSong[];
        onProgress?: ProgressHandler;
        control?: NetEaseMigrationControl;
    }): Promise<PlaylistMigrationStats> {
        const existing = await libraryDataService.getPlaylistByExternalId(input.externalId, 'netease');
        const snapshot = await netEaseMigrationReportService.createSnapshot((existing as any)?.playlist?.id);
        if (this.ensureNotCancelled(input.control, input.onProgress, input.kind, input.label)) {
            netEaseMigrationReportService.recordPlaylistImport({
                externalId: input.externalId,
                playlistName: input.playlistName,
                snapshot,
                total: input.songs.length,
                added: 0,
                existing: 0,
                skipped: input.songs.length,
                duplicates: 0,
                failures: [{
                    songId: input.externalId,
                    title: input.playlistName,
                    reason: 'cancelled'
                }],
                status: 'cancelled'
            });
            return {added: 0, existing: 0, skipped: input.songs.length, duplicates: 0, failures: []};
        }

        const playlistId = await this.ensurePlaylist(input);
        if (!playlistId) {
            const failure = {
                songId: input.externalId,
                title: input.playlistName,
                reason: '创建或定位歌单失败'
            };
            netEaseMigrationReportService.recordPlaylistImport({
                externalId: input.externalId,
                playlistName: input.playlistName,
                snapshot,
                total: input.songs.length,
                added: 0,
                existing: 0,
                skipped: input.songs.length,
                duplicates: 0,
                failures: [failure],
                status: 'failed'
            });
            return {added: 0, existing: 0, skipped: input.songs.length, duplicates: 0, failures: [failure]};
        }

        if (this.ensureNotCancelled(input.control, input.onProgress, input.kind, input.label)) {
            netEaseMigrationReportService.recordPlaylistImport({
                externalId: input.externalId,
                playlistId,
                playlistName: input.playlistName,
                snapshot,
                total: input.songs.length,
                added: 0,
                existing: 0,
                skipped: input.songs.length,
                duplicates: 0,
                failures: [{
                    songId: input.externalId,
                    title: input.playlistName,
                    reason: 'cancelled'
                }],
                status: 'cancelled'
            });
            return {playlistId, added: 0, existing: 0, skipped: input.songs.length, duplicates: 0, failures: []};
        }

        let added = 0;
        let existingCount = 0;
        let skipped = 0;
        let duplicates = 0;
        const failures: NetEaseMigrationFailure[] = [];

        input.onProgress?.({
            kind: input.kind,
            label: input.label,
            current: input.songs.length,
            total: input.songs.length,
            message: `正在写入${input.label}：${input.songs.length} 首`,
            phase: 'writing'
        });

        const trackData = input.songs.map((song): Partial<Track> => ({
            filePath: `netease://${song.id}`,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            cover: song.cover
        }));
        const bulkResult = await libraryDataService.bulkImportVirtualTracksToPlaylist(playlistId, trackData);
        const results = Array.isArray(bulkResult.results) ? bulkResult.results : [];
        if (!bulkResult.success) {
            failures.push({
                songId: input.externalId,
                title: input.playlistName,
                reason: bulkResult.error || '?????????'
            });
            skipped += input.songs.length;
        } else {
            for (let i = 0; i < input.songs.length; i++) {
                const song = input.songs[i];
                const result = results[i];
                if (!result?.success) {
                    skipped++;
                    failures.push({songId: song.id, title: song.title, reason: result?.error || '??????'});
                    continue;
                }

                if (result.isNew === false) {
                    existingCount++;
                }
                if (result.duplicate) {
                    duplicates++;
                }
                if (result.playlistAdded) {
                    added++;
                } else if (!result.isNew) {
                    existingCount++;
                }
            }
        }

        await libraryDataService.updatePlaylistMetadata(playlistId, {
            source: 'netease',
            externalId: input.externalId,
            externalType: input.kind,
            syncEnabled: true,
            lastSyncedAt: Date.now(),
            coverImagePath: input.cover
        });

        netEaseMigrationReportService.recordPlaylistImport({
            externalId: input.externalId,
            playlistId,
            playlistName: input.playlistName,
            snapshot,
            total: input.songs.length,
            added,
            existing: existingCount,
            skipped,
            duplicates,
            failures,
            status: failures.length > 0 || skipped > 0 ? 'partial' : 'completed'
        });

        return {playlistId, added, existing: existingCount, skipped, duplicates, failures};
    }

    private ensureNotCancelled(
        control?: NetEaseMigrationControl,
        onProgress?: ProgressHandler,
        kind: NetEaseMigrationAssetKind = 'recent-plays',
        label = '网易云资产'
    ): boolean {
        if (!control?.isCancelled()) {
            return false;
        }

        onProgress?.({
            kind,
            label,
            current: 0,
            total: 0,
            message: '已取消网易云资产迁移',
            phase: 'cancelled'
        });
        return true;
    }

    private cancelledSummary(
        preview: NetEaseMigrationPreview,
        failures: NetEaseMigrationFailure[],
        importedPlaylists: number,
        importedTracks: number,
        existingTracks: number,
        skippedTracks: number
    ): MigrationSummary {
        netEaseMigrationReportService.recordPlaylistImport({
            externalId: 'asset-migration-cancelled',
            playlistName: '[网易云] 资产迁移',
            snapshot: {
                playlistCount: importedPlaylists,
                trackCount: importedTracks + existingTracks + skippedTracks
            },
            total: preview.groups.reduce((total, group) => total + group.count, 0),
            added: importedTracks,
            existing: existingTracks,
            skipped: skippedTracks,
            duplicates: 0,
            failures: failures.length ? failures : [{
                songId: 'asset-migration-cancelled',
                title: '网易云资产迁移',
                reason: 'cancelled'
            }],
            status: 'cancelled'
        });

        return {
            success: false,
            preview,
            importedPlaylists,
            importedTracks,
            existingTracks,
            skippedTracks,
            failures,
            cancelled: true,
            error: 'cancelled'
        };
    }

    private async ensurePlaylist(input: {
        externalId: string;
        kind: NetEaseMigrationAssetKind;
        playlistName: string;
        description: string;
        cover: string;
    }): Promise<string | null> {
        const existing = await libraryDataService.getPlaylistByExternalId(input.externalId, 'netease');
        if (existing?.success && (existing as any).playlist?.id) {
            return (existing as any).playlist.id;
        }

        const createResult = await libraryController.createPlaylist(input.playlistName, input.description);
        const playlistId = createResult?.playlist?.id;
        if (!createResult?.success || !playlistId) {
            return null;
        }

        await libraryDataService.updatePlaylistMetadata(playlistId, {
            source: 'netease',
            externalId: input.externalId,
            externalType: input.kind,
            syncEnabled: true,
            lastSyncedAt: Date.now(),
            coverImagePath: input.cover
        });
        return playlistId;
    }

    private toSong(song: any): NetEaseSong | null {
        if (!song || !Number.isFinite(Number(song.id))) {
            return null;
        }
        return {
            id: Number(song.id),
            title: song.name || '未知歌曲',
            artist: Array.isArray(song.ar)
                ? song.ar.map((artist: any) => artist.name).filter(Boolean).join(', ')
                : (Array.isArray(song.artists) ? song.artists.map((artist: any) => artist.name).filter(Boolean).join(', ') : '未知歌手'),
            album: song.al?.name || song.album?.name || '未知专辑',
            duration: song.dt ? Math.floor(song.dt / 1000) : Math.floor((song.duration || 0) / 1000),
            cover: song.al?.picUrl || song.album?.picUrl || null
        };
    }
}

export const netEaseAssetMigrationService = new NetEaseAssetMigrationService();
export {NetEaseAssetMigrationService};
