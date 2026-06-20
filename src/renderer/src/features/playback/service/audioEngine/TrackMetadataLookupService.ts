import type {Track} from '@api/types/track';
import {libraryDataService} from '@/features/library/service/LibraryDataService';

export type AudioTrackMetadata = Partial<Track> & {
    cover?: unknown;
};

function isNeteaseVirtualPath(filePath: unknown): boolean {
    if (typeof filePath !== 'string') return false;
    const normalized = filePath.replace(/\\/g, '/');
    return /^netease:\/+\d+$/.test(normalized) || /(?:^|\/)netease:\/+\d+$/.test(normalized);
}

export class TrackMetadataLookupService {
    async getTrackMetadata(filePath: string): Promise<AudioTrackMetadata | null> {
        if (isNeteaseVirtualPath(filePath)) {
            return null;
        }
        return await libraryDataService.getTrackMetadata(filePath) as AudioTrackMetadata | null;
    }

    async getTrackPlaybackMetadata(filePath: string): Promise<AudioTrackMetadata | null> {
        if (isNeteaseVirtualPath(filePath)) {
            return null;
        }
        return await libraryDataService.getTrackPlaybackMetadata(filePath) as AudioTrackMetadata | null;
    }
}

export const trackMetadataLookupService = new TrackMetadataLookupService();
