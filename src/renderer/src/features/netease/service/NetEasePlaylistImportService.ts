import {netEaseApiClient} from './NetEaseApiClient';
import {netEaseSearchService} from './NetEaseSearchService';
import type {NetEasePlaylist} from '../types';

class NetEasePlaylistImportService {
    async getPlaylistDetail(playlistId: number): Promise<NetEasePlaylist | null> {
        const data = await netEaseApiClient.get('/playlist/detail', {
            id: playlistId.toString()
        });

        if (!data || !data.playlist) {
            return null;
        }

        const playlist = data.playlist;
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description || '',
            cover: playlist.coverImgUrl,
            trackCount: playlist.trackCount,
            tracks: (playlist.tracks || []).map((track: any) => ({
                id: track.id,
                title: track.name || '未知',
                artist: track.ar ? track.ar.map((a: any) => a.name).join(', ') : '未知',
                album: track.al ? track.al.name : '未知',
                duration: track.dt ? Math.floor(track.dt / 1000) : 0,
                cover: track.al ? track.al.picUrl : null
            }))
        };
    }

    async getPlayableUrl(songId: number): Promise<string | null> {
        return await netEaseSearchService.getSongUrl(songId);
    }

    parsePlaylistId(input: string): number | null {
        if (!input || typeof input !== 'string') return null;
        const trimmed = input.trim();
        if (!trimmed) return null;

        const patterns = [
            /playlist[\/#?&].*?id=(\d+)/i,
            /playlist\/(\d+)/i,
            /#\/playlist\?id=(\d+)/i,
        ];
        for (const pat of patterns) {
            const m = trimmed.match(pat);
            if (m) {
                const id = parseInt(m[1], 10);
                if (id > 0) return id;
            }
        }

        if (/(?:song|album|artist|dj|mv|video)[?/#]/i.test(trimmed)) return null;

        const allIds = trimmed.match(/\d+/g);
        if (allIds) {
            for (const numStr of allIds) {
                const id = parseInt(numStr, 10);
                if (id > 0 && numStr.length >= 5) return id;
            }
        }

        return null;
    }
}

export const netEasePlaylistImportService = new NetEasePlaylistImportService();
export {NetEasePlaylistImportService};
