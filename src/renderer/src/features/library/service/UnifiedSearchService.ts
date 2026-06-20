import type {Track} from "@api/types/library";
import {libraryDataService} from "@/features/library/service/LibraryDataService";
import {netEaseSearchService} from "@/features/netease/service/NetEaseSearchService";
import {netEaseApiClient} from "@/features/netease/service/NetEaseApiClient";

export interface UnifiedSearchResult {
    track: Track;
    source: 'local' | 'netease';
}

class UnifiedSearchService {
    async search(query: string): Promise<UnifiedSearchResult[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const [localResults, neteaseResults] = await Promise.all([
            this.searchLocal(trimmed),
            this.searchNetEase(trimmed)
        ]);

        return [...localResults, ...neteaseResults];
    }

    private async searchLocal(query: string): Promise<UnifiedSearchResult[]> {
        try {
            const tracks = await libraryDataService.searchLibrary(query);
            return tracks
                .filter(t => {
                    if ((t as any).libraryVisible === false) return false;
                    if ((t as any).source === 'netease') return false;
                    if (typeof t.filePath === 'string' && t.filePath.startsWith('netease://')) return false;
                    return true;
                })
                .map(track => ({track, source: 'local' as const}));
        } catch {
            return [];
        }
    }

    private async searchNetEase(query: string): Promise<UnifiedSearchResult[]> {
        try {
            const available = await netEaseApiClient.checkAvailability();
            if (!available) return [];

            const songs = await netEaseSearchService.search(query, 10);
            return songs.map(song => ({
                track: {
                    filePath: `netease://${song.id}`,
                    title: song.title,
                    artist: song.artist,
                    album: song.album,
                    duration: song.duration,
                    cover: song.cover,
                    source: 'netease',
                    isVirtual: true,
                    libraryVisible: false
                } as Track,
                source: 'netease' as const
            }));
        } catch {
            return [];
        }
    }
}

export const unifiedSearchService = new UnifiedSearchService();
export {UnifiedSearchService};
