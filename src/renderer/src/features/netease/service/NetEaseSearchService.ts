import {netEaseApiClient} from './NetEaseApiClient';
import type {NetEaseSong} from '../types';

class NetEaseSearchService {
    async search(keyword: string, limit = 20): Promise<NetEaseSong[]> {
        const data = await netEaseApiClient.get('/cloudsearch', {
            keywords: keyword,
            limit: limit.toString(),
            type: '1'
        });

        if (!data || !data.result || !data.result.songs) {
            return [];
        }

        return data.result.songs.map((song: any) => ({
            id: song.id,
            title: song.name || '未知',
            artist: song.ar ? song.ar.map((a: any) => a.name).join(', ') : '未知',
            album: song.al ? song.al.name : '未知',
            duration: song.dt ? Math.floor(song.dt / 1000) : 0,
            cover: song.al ? song.al.picUrl : null
        }));
    }

    async getSongUrl(songId: number): Promise<string | null> {
        const data = await netEaseApiClient.get('/song/url/v1', {
            id: songId.toString(),
            level: 'exhigh'
        });

        if (data && data.data && data.data[0] && data.data[0].url) {
            return data.data[0].url;
        }

        return null;
    }

    async getSongUrls(songIds: number[]): Promise<Map<number, string>> {
        const result = new Map<number, string>();
        const data = await netEaseApiClient.get('/song/url/v1', {
            id: songIds.join(','),
            level: 'exhigh'
        });

        if (data && data.data) {
            for (const item of data.data) {
                if (item.url) {
                    result.set(item.id, item.url);
                }
            }
        }

        return result;
    }

    async getLyrics(songId: number): Promise<string | null> {
        const data = await netEaseApiClient.get('/lyric', {
            id: songId.toString()
        });

        if (data && data.lrc && data.lrc.lyric) {
            return data.lrc.lyric;
        }

        return null;
    }
}

export const netEaseSearchService = new NetEaseSearchService();
export {NetEaseSearchService};
