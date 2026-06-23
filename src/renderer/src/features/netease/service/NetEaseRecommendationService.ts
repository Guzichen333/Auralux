import type {Track} from '@api/types/track';
import {netEaseApiClient, type NetEaseApiClient} from './NetEaseApiClient';
import type {NetEasePlaylist, NetEaseSong} from '../types';

interface CacheEntry<T> {
    expiresAt: number;
    value: T;
}

interface NetEaseArtistLike {
    name?: string;
}

interface NetEaseAlbumLike {
    name?: string;
    picUrl?: string;
}

interface NetEaseSongLike {
    id?: number | string;
    name?: string;
    title?: string;
    ar?: NetEaseArtistLike[];
    artists?: NetEaseArtistLike[];
    album?: NetEaseAlbumLike;
    al?: NetEaseAlbumLike;
    dt?: number;
    duration?: number;
    picUrl?: string;
}

interface NetEasePlaylistLike {
    id?: number | string;
    name?: string;
    description?: string;
    copywriter?: string;
    picUrl?: string;
    coverImgUrl?: string;
    trackCount?: number;
    playCount?: number;
}

class NetEaseRecommendationService {
    private readonly cacheTtlMs = 5 * 60 * 1000;
    private readonly cache = new Map<string, CacheEntry<unknown>>();
    private readonly inflight = new Map<string, Promise<unknown>>();

    constructor(private readonly apiClient: NetEaseApiClient = netEaseApiClient) {}

    async getDailySongs(): Promise<Track[]> {
        return this.withCache('daily-songs', async () => {
            const data = await this.apiClient.get('/recommend/songs', {
                timestamp: String(Date.now())
            });
            const songs = this.extractSongs((data as any)?.data?.dailySongs)
                || this.extractSongs((data as any)?.recommend)
                || this.extractSongs((data as any)?.data?.recommend)
                || [];
            return songs.map((song) => this.mapSongToTrack(song));
        });
    }

    async getRecommendedPlaylists(limit = 12): Promise<NetEasePlaylist[]> {
        return this.withCache(`recommended-playlists:${limit}`, async () => {
            const personalized = await this.apiClient.get('/personalized', {
                limit: String(limit),
                timestamp: String(Date.now())
            });
            const publicPlaylists = this.extractPlaylists((personalized as any)?.result)
                || this.extractPlaylists((personalized as any)?.data?.result)
                || [];
            return publicPlaylists
                .filter((playlist) => !this.isAccountAssetPlaylist(playlist))
                .slice(0, limit)
                .map((playlist) => this.mapPlaylist(playlist));
        });
    }

    async getPersonalFm(): Promise<Track[]> {
        return this.withCache('personal-fm', async () => {
            const data = await this.apiClient.get('/personal_fm', {
                timestamp: String(Date.now())
            });
            const songs = this.extractSongs((data as any)?.data) || [];
            return songs.map((song) => this.mapSongToTrack(song));
        });
    }

    async getPlaylistTracks(playlistId: number): Promise<Track[]> {
        return this.withCache(`playlist-tracks:${playlistId}`, async () => {
            const data = await this.apiClient.get('/playlist/detail', {
                id: String(playlistId),
                timestamp: String(Date.now())
            });
            const songs = this.extractSongs((data as any)?.playlist?.tracks) || [];
            return songs.map((song) => this.mapSongToTrack(song));
        });
    }

    private async withCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
        const cached = this.cache.get(key) as CacheEntry<T> | undefined;
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }

        const existing = this.inflight.get(key) as Promise<T> | undefined;
        if (existing) {
            return existing;
        }

        const promise = loader()
            .then((value) => {
                this.cache.set(key, {
                    value,
                    expiresAt: Date.now() + this.cacheTtlMs
                });
                return value;
            })
            .finally(() => {
                this.inflight.delete(key);
            });

        this.inflight.set(key, promise);
        return promise;
    }

    private extractSongs(value: unknown): NetEaseSongLike[] | null {
        return Array.isArray(value) ? value.filter((item): item is NetEaseSongLike => Boolean(item)) : null;
    }

    private extractPlaylists(value: unknown): NetEasePlaylistLike[] | null {
        return Array.isArray(value) ? value.filter((item): item is NetEasePlaylistLike => Boolean(item)) : null;
    }

    private mapSongToTrack(song: NetEaseSongLike): Track {
        const id = String(song.id || '');
        const album = this.asAlbum(song.al || song.album);
        const artists = this.asArtists(song.ar || song.artists);
        const artist = artists.map((item) => item.name).filter(Boolean).join(', ');
        const durationMs = typeof song.dt === 'number' ? song.dt : song.duration || 0;

        return {
            id: `netease-${id}`,
            filePath: `netease://${String(song.id)}`,
            fileName: `${song.name || song.title || 'NetEase Song'}.netease`,
            title: song.name || song.title || 'NetEase Song',
            artist: artist || 'NetEase Artist',
            album: album.name || '',
            duration: durationMs > 1000 ? Math.floor(durationMs / 1000) : durationMs,
            cover: album.picUrl || song.picUrl || null,
            source: 'netease',
            libraryVisible: false
        } as Track & {source: 'netease'; libraryVisible: false};
    }

    private mapPlaylist(playlist: NetEasePlaylistLike): NetEasePlaylist {
        return {
            id: Number(playlist.id || 0),
            name: playlist.name || 'NetEase Playlist',
            description: playlist.description || playlist.copywriter || '',
            cover: playlist.picUrl || playlist.coverImgUrl || '',
            trackCount: playlist.trackCount || 0,
            playCount: playlist.playCount || 0,
            tracks: [] as NetEaseSong[]
        };
    }

    private isAccountAssetPlaylist(playlist: NetEasePlaylistLike): boolean {
        const name = playlist.name || '';
        return /\u6211\u559c\u6b22|\u7ea2\u5fc3|\u559c\u6b22\u7684\u97f3\u4e50|Liked Songs/i.test(name);
    }

    private asArtists(value: unknown): NetEaseArtistLike[] {
        return Array.isArray(value) ? value.filter((item): item is NetEaseArtistLike => Boolean(item)) : [];
    }

    private asAlbum(value: unknown): NetEaseAlbumLike {
        return value && typeof value === 'object' ? value as NetEaseAlbumLike : {};
    }
}

export const netEaseRecommendationService = new NetEaseRecommendationService();
export {NetEaseRecommendationService};
