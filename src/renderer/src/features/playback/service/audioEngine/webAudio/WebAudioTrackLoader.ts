import {audioFileReaderService} from '@/features/media/service';
import {trackMetadataLookupService} from '../TrackMetadataLookupService';
import {netEaseApiClient} from '@/features/netease/service/NetEaseApiClient';
import {netEaseLyricsService} from '@/features/netease/service/NetEaseLyricsService';
import type {LoadedWebAudioTrack, TrackMetadata, WebAudioTrack} from './WebAudioTypes';

const NETEASE_STREAM_URL_CACHE_TTL_MS = 5 * 60 * 1000;
const NETEASE_SONG_DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;
const NETEASE_STREAM_URL_TIMEOUT_MS = 8000;
const NETEASE_SONG_DETAIL_TIMEOUT_MS = 5000;
const NETEASE_LYRICS_TIMEOUT_MS = 5000;
const MEDIA_METADATA_TIMEOUT_MS = 10000;

interface TimedCacheEntry<T> {
    value: T;
    expiresAt: number;
}

const neteaseStreamUrlCache = new Map<number, TimedCacheEntry<string>>();
const neteaseSongDetailCache = new Map<number, TimedCacheEntry<TrackMetadata>>();
const neteaseStreamUrlInFlight = new Map<number, Promise<string | null>>();
const neteaseSongDetailInFlight = new Map<number, Promise<TrackMetadata>>();

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
            })
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

async function withTimeoutFallback<T>(promise: Promise<T>, timeoutMs: number, fallback: T, label: string): Promise<T> {
    try {
        return await withTimeout(promise, timeoutMs, label);
    } catch (error) {
        console.warn(`${label} failed`, error);
        return fallback;
    }
}

function isHttpUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
}

function isNeteaseUrl(path: string): boolean {
    return path.startsWith('netease://');
}

function getNeteaseSongId(path: string): number | null {
    const match = path.match(/^netease:\/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

function getFreshCacheValue<T>(cache: Map<number, TimedCacheEntry<T>>, songId: number, now = Date.now()): T | null {
    const cached = cache.get(songId);
    if (!cached) {
        return null;
    }
    if (cached.expiresAt <= now) {
        cache.delete(songId);
        return null;
    }
    return cached.value;
}

function rememberCacheValue<T>(cache: Map<number, TimedCacheEntry<T>>, songId: number, value: T, ttlMs: number, now = Date.now()): void {
    cache.set(songId, {
        value,
        expiresAt: now + ttlMs
    });
}

async function fetchNeteaseStreamUrl(songId: number): Promise<string | null> {
    const now = Date.now();
    const cached = getFreshCacheValue(neteaseStreamUrlCache, songId, now);
    if (cached) {
        return cached;
    }

    const inFlight = neteaseStreamUrlInFlight.get(songId);
    if (inFlight) {
        return await inFlight;
    }

    const request = withTimeout(fetchNeteaseStreamUrlUncached(songId), NETEASE_STREAM_URL_TIMEOUT_MS, 'NetEase stream URL request')
        .then((streamUrl) => {
            if (streamUrl) {
                rememberCacheValue(neteaseStreamUrlCache, songId, streamUrl, NETEASE_STREAM_URL_CACHE_TTL_MS);
            }
            return streamUrl;
        })
        .finally(() => {
            neteaseStreamUrlInFlight.delete(songId);
        });
    neteaseStreamUrlInFlight.set(songId, request);
    return await request;
}

async function fetchNeteaseStreamUrlUncached(songId: number): Promise<string | null> {
    try {
        const data = await netEaseApiClient.get('/song/url/v1', {
            id: songId.toString(),
            level: 'exhigh'
        });

        if (!data || !data.data || !data.data[0]) {
            throw new Error('网络异常，获取播放地址失败');
        }

        const trackData = data.data[0];

        if (trackData.url) {
            return trackData.url;
        }

        const fee = trackData.fee;
        const code = trackData.code;

        if (fee === 1 || fee === 4) {
            throw new Error('需要网易云 VIP 权限');
        }

        if (code === 403) {
            throw new Error('该歌曲当前无法播放');
        }

        if (code === 404) {
            throw new Error('歌曲不存在');
        }

        throw new Error('该歌曲当前无法播放');
    } catch (error) {
        if (error instanceof Error && error.message) {
            throw error;
        }
        throw new Error('网络异常，获取播放地址失败');
    }
}

async function fetchNeteaseSongDetail(songId: number): Promise<TrackMetadata> {
    const now = Date.now();
    const cached = getFreshCacheValue(neteaseSongDetailCache, songId, now);
    if (cached) {
        return cached;
    }

    const inFlight = neteaseSongDetailInFlight.get(songId);
    if (inFlight) {
        return await inFlight;
    }

    const request = withTimeoutFallback(fetchNeteaseSongDetailUncached(songId), NETEASE_SONG_DETAIL_TIMEOUT_MS, {}, 'NetEase song detail request')
        .then((detail) => {
            if (Object.keys(detail).length > 0) {
                rememberCacheValue(neteaseSongDetailCache, songId, detail, NETEASE_SONG_DETAIL_CACHE_TTL_MS);
            }
            return detail;
        })
        .finally(() => {
            neteaseSongDetailInFlight.delete(songId);
        });
    neteaseSongDetailInFlight.set(songId, request);
    return await request;
}

async function fetchNeteaseSongDetailUncached(songId: number): Promise<TrackMetadata> {
    try {
        const data = await netEaseApiClient.get('/song/detail', {
            ids: songId.toString()
        });
        if (data && data.songs && data.songs[0]) {
            const song = data.songs[0];
            return {
                title: song.name || '未知标题',
                artist: song.ar ? song.ar.map((a: any) => a.name).join(', ') : '未知艺术家',
                album: song.al ? song.al.name : '未知专辑',
                duration: song.dt ? Math.floor(song.dt / 1000) : 0,
                cover: song.al ? song.al.picUrl : null
            };
        }
        return {};
    } catch {
        return {};
    }
}

async function fetchNeteaseLyrics(songId: number) {
    try {
        return await withTimeout(netEaseLyricsService.getLyrics(songId), NETEASE_LYRICS_TIMEOUT_MS, 'NetEase lyrics request');
    } catch {
        return null;
    }
}

class WebAudioTrackLoader {
    async load(filePath: string, audioElement: HTMLAudioElement, preload = false): Promise<LoadedWebAudioTrack> {
        let sourceUrl: string;
        let metadata: TrackMetadata;
        let lyrics: WebAudioTrack['lyrics'] | null = null;
        let lyricsFormat: string | null = null;
        let lyricsContent: string | null = null;
        let neteaseSongIdForHydration: number | null = null;
        let prepared = false;

        if (isNeteaseUrl(filePath)) {
            const songId = getNeteaseSongId(filePath);
            if (!songId) {
                throw Error('无效的网易云歌曲链接');
            }

            neteaseSongIdForHydration = songId;
            const songDetailPromise = fetchNeteaseSongDetail(songId);
            const lyricsPromise = fetchNeteaseLyrics(songId);
            sourceUrl = await this.prepareNeteaseElementWithRetry(songId, audioElement, preload);
            prepared = true;
            metadata = getFreshCacheValue(neteaseSongDetailCache, songId) || {};
            void Promise.all([songDetailPromise, lyricsPromise]).catch(() => null);
        } else if (isHttpUrl(filePath)) {
            sourceUrl = filePath;
            metadata = {};
        } else {
            sourceUrl = await audioFileReaderService.createAudioStreamUrl(filePath);
            metadata = await this.getTrackMetadata(filePath);
        }

        if (!prepared) {
            this.prepareElement(audioElement, sourceUrl, preload);
            await this.waitForMetadata(audioElement);
        }

        const mediaDuration = Number.isFinite(audioElement.duration) && audioElement.duration > 0
            ? audioElement.duration
            : 0;

        const duration = this.resolvePlaybackDuration(metadata.duration, mediaDuration, isNeteaseUrl(filePath));
        const track: WebAudioTrack = {
            filePath,
            sourceUrl,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration,
            bitrate: metadata.bitrate,
            sampleRate: metadata.sampleRate,
            year: metadata.year,
            genre: metadata.genre,
            track: metadata.track,
            disc: metadata.disc,
            cover: metadata.cover || null,
            lyrics: lyrics || undefined,
            lyricsFormat: lyricsFormat || undefined,
            lyricsContent: lyricsContent || undefined
        };

        if (neteaseSongIdForHydration) {
            this.hydrateNeteaseTrackMetadata(track, neteaseSongIdForHydration);
        }

        return {
            duration,
            track
        };
    }

    private async prepareNeteaseElementWithRetry(songId: number, audioElement: HTMLAudioElement, preload: boolean): Promise<string> {
        const sourceUrl = await this.createNeteaseRemoteSourceUrl(songId, false);
        try {
            this.prepareElement(audioElement, sourceUrl, preload);
            await this.waitForMetadata(audioElement);
            return sourceUrl;
        } catch (firstError) {
            neteaseStreamUrlCache.delete(songId);
            console.warn('NetEase stream URL failed during media load; refreshing once', firstError);
            const retrySourceUrl = await this.createNeteaseRemoteSourceUrl(songId, true);
            this.prepareElement(audioElement, retrySourceUrl, preload);
            await this.waitForMetadata(audioElement);
            return retrySourceUrl;
        }
    }

    private async createNeteaseRemoteSourceUrl(songId: number, forceRefresh: boolean): Promise<string> {
        if (forceRefresh) {
            neteaseStreamUrlCache.delete(songId);
        }

        const streamUrl = await fetchNeteaseStreamUrl(songId);

        if (!streamUrl) {
            throw new Error('网易云播放地址为空');
        }

        return await audioFileReaderService.createRemoteAudioStreamUrl(streamUrl);
    }

    private hydrateNeteaseTrackMetadata(track: WebAudioTrack, songId: number): void {
        void Promise.all([fetchNeteaseSongDetail(songId), fetchNeteaseLyrics(songId)])
            .then(([songDetail, lyricsResult]) => {
                Object.assign(track, {
                    title: songDetail.title || track.title,
                    artist: songDetail.artist || track.artist,
                    album: songDetail.album || track.album,
                    duration: songDetail.duration || track.duration,
                    cover: songDetail.cover || track.cover
                });

                if (lyricsResult?.yrcLines && lyricsResult.yrcLines.length > 0) {
                    track.lyrics = lyricsResult.yrcLines;
                    track.lyricsFormat = 'yrc';
                    track.lyricsContent = lyricsResult.yrc || undefined;
                } else if (lyricsResult?.lrc) {
                    track.lyrics = lyricsResult.lrc;
                    track.lyricsFormat = 'lrc';
                    track.lyricsContent = lyricsResult.lrc;
                }
            })
            .catch((error) => {
                console.warn('NetEase metadata hydration failed', error);
            });
    }

    private resolvePlaybackDuration(metadataDuration: number | undefined, mediaDuration: number, neteaseTrack: boolean): number {
        if (!Number.isFinite(metadataDuration) || !metadataDuration || metadataDuration <= 0) {
            return mediaDuration;
        }

        if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) {
            return metadataDuration;
        }

        const ratio = mediaDuration / metadataDuration;
        if (neteaseTrack && mediaDuration > 0 && metadataDuration > 0 && ratio < 0.65) {
            return mediaDuration;
        }

        return metadataDuration;
    }

    private prepareElement(audioElement: HTMLAudioElement, sourceUrl: string, preload: boolean): void {
        audioElement.pause();
        audioElement.crossOrigin = 'anonymous';
        audioElement.preload = preload ? 'auto' : 'metadata';
        audioElement.src = sourceUrl;
        audioElement.load();
    }

    private async waitForMetadata(audioElement: HTMLAudioElement): Promise<void> {
        if (audioElement.readyState >= 1) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out waiting for media metadata: ${audioElement.src}`));
            }, MEDIA_METADATA_TIMEOUT_MS);
            const cleanup = () => {
                clearTimeout(timeoutId);
                audioElement.removeEventListener('loadedmetadata', handleMetadata);
                audioElement.removeEventListener('error', handleError);
                audioElement.removeEventListener('abort', handleAbort);
            };
            const handleMetadata = () => {
                cleanup();
                resolve();
            };
            const handleError = () => {
                cleanup();
                const mediaError = audioElement.error;
                reject(new Error(mediaError?.message || `Media element failed to load source: ${audioElement.src}`));
            };
            const handleAbort = () => {
                cleanup();
                reject(new Error(`Media element load aborted: ${audioElement.src}`));
            };

            audioElement.addEventListener('loadedmetadata', handleMetadata, {once: true});
            audioElement.addEventListener('error', handleError, {once: true});
            audioElement.addEventListener('abort', handleAbort, {once: true});
        });
    }

    private async getTrackMetadata(filePath: string): Promise<TrackMetadata> {
        const metadata = await trackMetadataLookupService.getTrackPlaybackMetadata(filePath);
        if (!metadata) {
            return {};
        }

        return {
            title: metadata.title || '未知标题',
            artist: metadata.artist || '未知艺术家',
            album: metadata.album || '未知专辑',
            duration: metadata.duration || 0,
            bitrate: metadata.bitrate || 0,
            sampleRate: metadata.sampleRate || 0,
            year: metadata.year,
            genre: metadata.genre,
            track: metadata.track,
            disc: metadata.disc,
            cover: null
        };
    }
}

export {WebAudioTrackLoader};
export default WebAudioTrackLoader;
