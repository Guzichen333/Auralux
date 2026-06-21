import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {cacheManager} from '@/shared/cache/CacheManager';

export type NetEaseMigrationReportKind = 'playlist-import' | 'playlist-sync';
export type NetEaseMigrationReportStatus = 'completed' | 'partial' | 'failed' | 'synced' | 'undone' | 'cancelled';

export interface NetEaseMigrationSnapshot {
    playlistCount: number;
    trackCount: number;
    existingPlaylistId?: string;
    existingPlaylistTrackCount?: number;
}

export interface NetEaseMigrationFailure {
    songId: number | string;
    title: string;
    reason: string;
}

export interface NetEaseMigrationReport {
    id: string;
    createdAt: number;
    kind: NetEaseMigrationReportKind;
    status: NetEaseMigrationReportStatus;
    externalId: string;
    playlistId?: string;
    playlistName: string;
    snapshot: NetEaseMigrationSnapshot;
    total: number;
    added: number;
    existing: number;
    skipped: number;
    failed: number;
    duplicates: number;
    failures: NetEaseMigrationFailure[];
    createdPlaylistId?: string;
    canUndo: boolean;
    undoneAt?: number;
}

export interface PlaylistImportReportInput {
    externalId: string;
    playlistId?: string;
    playlistName: string;
    snapshot: NetEaseMigrationSnapshot;
    total: number;
    added: number;
    existing: number;
    skipped: number;
    duplicates: number;
    failures: NetEaseMigrationFailure[];
    createdPlaylistId?: string;
    status?: NetEaseMigrationReportStatus;
}

export interface PlaylistSyncReportInput {
    externalId: string;
    playlistId: string;
    playlistName: string;
    snapshot: NetEaseMigrationSnapshot;
    total: number;
    added: number;
    existing: number;
    skipped: number;
    failures?: NetEaseMigrationFailure[];
    status?: NetEaseMigrationReportStatus;
}

class NetEaseMigrationReportService {
    private readonly reportsKey = 'netease-migration-reports';
    private readonly maxReports = 20;

    async createSnapshot(existingPlaylistId?: string): Promise<NetEaseMigrationSnapshot> {
        const playlists = await libraryDataService.getPlaylists();
        let trackCount = 0;
        let existingPlaylistTrackCount: number | undefined;

        for (const playlist of playlists || []) {
            trackCount += playlist.trackCount || playlist.tracks?.length || 0;
            if (existingPlaylistId && playlist.id === existingPlaylistId) {
                existingPlaylistTrackCount = playlist.trackCount || playlist.tracks?.length || 0;
            }
        }

        if (existingPlaylistId && existingPlaylistTrackCount === undefined) {
            const detail = await libraryDataService.getPlaylistDetail(existingPlaylistId);
            if (detail?.success) {
                existingPlaylistTrackCount = detail.tracks?.length || detail.playlist?.trackCount || 0;
            }
        }

        return {
            playlistCount: playlists?.length || 0,
            trackCount,
            existingPlaylistId,
            existingPlaylistTrackCount
        };
    }

    recordPlaylistImport(input: PlaylistImportReportInput): NetEaseMigrationReport {
        const failed = input.failures.length;
        const status = input.status || (failed > 0 || input.skipped > 0 ? 'partial' : 'completed');
        return this.saveReport({
            id: this.createReportId('playlist-import', input.externalId),
            createdAt: Date.now(),
            kind: 'playlist-import',
            status,
            externalId: input.externalId,
            playlistId: input.playlistId,
            playlistName: input.playlistName,
            snapshot: input.snapshot,
            total: input.total,
            added: input.added,
            existing: input.existing,
            skipped: input.skipped,
            failed,
            duplicates: input.duplicates,
            failures: input.failures,
            createdPlaylistId: input.createdPlaylistId,
            canUndo: Boolean(input.createdPlaylistId) && status !== 'failed'
        });
    }

    recordPlaylistSync(input: PlaylistSyncReportInput): NetEaseMigrationReport {
        const failures = input.failures || [];
        return this.saveReport({
            id: this.createReportId('playlist-sync', input.externalId),
            createdAt: Date.now(),
            kind: 'playlist-sync',
            status: input.status || (failures.length > 0 ? 'partial' : 'synced'),
            externalId: input.externalId,
            playlistId: input.playlistId,
            playlistName: input.playlistName,
            snapshot: input.snapshot,
            total: input.total,
            added: input.added,
            existing: input.existing,
            skipped: input.skipped,
            failed: failures.length,
            duplicates: input.existing,
            failures,
            canUndo: false
        });
    }

    getLatestReport(): NetEaseMigrationReport | null {
        return this.getRecentReports()[0] || null;
    }

    getRecentReports(): NetEaseMigrationReport[] {
        return cacheManager.getLocalCache<NetEaseMigrationReport[]>(this.reportsKey) || [];
    }

    async undoLatestCreatedImport(): Promise<{success: boolean; report?: NetEaseMigrationReport; error?: string}> {
        const latest = this.getRecentReports().find(report => report.canUndo && report.createdPlaylistId);
        if (!latest?.createdPlaylistId) {
            return {success: false, error: '没有可撤销的网易云导入'};
        }

        const result = await libraryDataService.deletePlaylist(latest.createdPlaylistId);
        if (!result?.success) {
            return {success: false, report: latest, error: result?.error || '撤销导入失败'};
        }

        return {success: true, report: this.markUndone(latest.id)};
    }

    markUndone(reportId: string): NetEaseMigrationReport | undefined {
        const reports = this.getRecentReports();
        const nextReports = reports.map(report => {
            if (report.id !== reportId) return report;
            return {
                ...report,
                status: 'undone' as NetEaseMigrationReportStatus,
                canUndo: false,
                undoneAt: Date.now()
            };
        });
        cacheManager.setLocalCache(this.reportsKey, nextReports);
        return nextReports.find(report => report.id === reportId);
    }

    private saveReport(report: NetEaseMigrationReport): NetEaseMigrationReport {
        const reports = [report, ...this.getRecentReports().filter(item => item.id !== report.id)]
            .slice(0, this.maxReports);
        cacheManager.setLocalCache(this.reportsKey, reports);
        return report;
    }

    private createReportId(kind: NetEaseMigrationReportKind, externalId: string): string {
        return `${kind}:${externalId}:${Date.now()}`;
    }
}

export const netEaseMigrationReportService = new NetEaseMigrationReportService();
export {NetEaseMigrationReportService};
