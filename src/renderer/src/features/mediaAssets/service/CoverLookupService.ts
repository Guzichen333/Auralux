import {networkRequestClient} from '@/shared/network';
import {urlValidator} from '@utils/URLValidator';
import type {CoverResult, ImageFormat} from '@api/types';
import {embeddedCoverManager} from './EmbeddedCoverManager';
import {localCoverManager} from './LocalCoverManager';

function isNeteaseVirtualPath(filePath: unknown): boolean {
    if (typeof filePath !== 'string') return false;
    const normalized = filePath.replace(/\\/g, '/');
    return /^netease:\/+\d+$/.test(normalized) || /(?:^|\/)netease:\/+\d+$/.test(normalized);
}

export class CoverLookupService {
    private readonly transientObjectUrls = new Set<string>();

    async getCover(
        title: string,
        artist: string,
        album = '',
        filePath: string | null = null,
        forceRefresh = false
    ): Promise<CoverResult> {
        try {
            if (isNeteaseVirtualPath(filePath)) {
                return {success: false, error: 'netease virtual path does not support embedded cover lookup'};
            }

            if (forceRefresh && filePath) {
                embeddedCoverManager.clearCacheForFile(filePath);
                localCoverManager.clearCacheForTrack(title, artist, album);
            }

            if (filePath) {
                const embeddedCover = await this.getEmbeddedCover(filePath);
                if (embeddedCover.success) {
                    return embeddedCover;
                }
            }

            const localCover = await this.getLocalCover(title, artist, album);
            if (localCover.success) {
                return localCover;
            }

            const networkCover = await this.getNetworkCover(title, artist, album);
            if (networkCover.success) {
                const cachedCover = await this.saveCoverToLocalCache(title, artist, album, networkCover.imageData);
                if (cachedCover) {
                    this.releaseTransientObjectUrl(networkCover.imageUrl);
                    return cachedCover;
                }
                return networkCover;
            }

            return {success: false, error: 'cover not found'};
        } catch (error) {
            this.logError(`cover lookup failed: ${title}`, error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async getEmbeddedCover(filePath: string): Promise<CoverResult> {
        try {
            if (isNeteaseVirtualPath(filePath)) {
                return {success: false, error: 'netease virtual path does not support embedded cover lookup'};
            }

            const embeddedResult: any = await embeddedCoverManager.getEmbeddedCover(filePath);
            if (embeddedResult.success && embeddedResult.url) {
                if (embeddedResult.url.startsWith('blob:')) {
                    return this.createEmbeddedCoverResult(embeddedResult);
                }

                const isValidUrl = urlValidator
                    ? await urlValidator.isValidUrl(embeddedResult.url)
                    : true;
                if (isValidUrl) {
                    return this.createEmbeddedCoverResult(embeddedResult);
                }
            }

            return {success: false};
        } catch (error) {
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async getLocalCover(title: string, artist: string, album = ''): Promise<CoverResult> {
        const localCoverResult: any = await localCoverManager.checkLocalCover(title, artist, album);
        if (localCoverResult.success) {
            return {
                success: true,
                imageUrl: `file://${localCoverResult.filePath}`,
                type: 'local-file',
                source: 'local-cache',
                filePath: localCoverResult.filePath
            };
        }

        return {success: false, error: 'local cover not found'};
    }

    async getNetworkCover(title: string, artist: string, album = ''): Promise<CoverResult> {
        try {
            const params = new URLSearchParams();
            if (title) params.append('title', title);
            if (artist) params.append('artist', artist);
            if (album) params.append('album', album);

            const url = `https://api.lrc.cx/cover?${params.toString()}`;
            const response = await networkRequestClient.fetchWithRetry(url);
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.startsWith('image/')) {
                const blob = await response.blob();
                return {
                    success: true,
                    imageUrl: this.createTransientObjectUrl(blob),
                    type: 'blob',
                    source: 'api',
                    imageData: blob
                };
            }

            if (response.redirected) {
                return {
                    success: true,
                    imageUrl: response.url,
                    type: 'url',
                    source: 'api',
                    imageData: response.url
                };
            }

            const text = await response.text();
            if (text.startsWith('http')) {
                const imageUrl = text.trim();
                return {
                    success: true,
                    imageUrl,
                    type: 'url',
                    source: 'api',
                    imageData: imageUrl
                };
            }

            throw new Error('invalid cover response');
        } catch (error) {
            this.logError('network cover lookup failed', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    clearCacheForFile(filePath: string): void {
        embeddedCoverManager.clearCacheForFile(filePath);
    }

    clearCacheForTrack(title: string, artist: string, album = ''): void {
        localCoverManager.clearCacheForTrack(title, artist, album);
    }

    clearAllCache(): void {
        if (typeof (embeddedCoverManager as any).clearAllCache === 'function') {
            (embeddedCoverManager as any).clearAllCache();
        }
        if (typeof (localCoverManager as any).clearAllCache === 'function') {
            (localCoverManager as any).clearAllCache();
        }
        this.clearTransientObjectUrls();
    }

    destroy(): void {
        this.clearAllCache();
    }

    private createEmbeddedCoverResult(embeddedResult: any): CoverResult {
        return {
            success: true,
            imageUrl: embeddedResult.url,
            type: 'embedded',
            source: 'embedded-cover',
            format: embeddedResult.format,
            size: embeddedResult.size,
            mimeType: embeddedResult.mimeType
        };
    }

    private async saveCoverToLocalCache(
        title: string,
        artist: string,
        album: string,
        imageData: CoverResult['imageData']
    ): Promise<CoverResult | null> {
        try {
            if (!imageData || !localCoverManager.getCoverDirectory()) {
                return null;
            }

            const imageFormat = this.detectImageFormat(imageData);
            const saveResult = await localCoverManager.saveCoverToCache(title, artist, album, imageData, imageFormat);
            if (!saveResult.success || !saveResult.filePath) {
                return null;
            }

            return {
                success: true,
                imageUrl: `file://${saveResult.filePath}`,
                type: 'local-file',
                source: 'local-cache',
                filePath: saveResult.filePath
            };
        } catch (error) {
            this.logError('cover cache save failed', error);
            return null;
        }
    }

    private detectImageFormat(imageData: CoverResult['imageData']): ImageFormat {
        let imageFormat: ImageFormat = 'jpg';
        if (imageData instanceof Blob) {
            if (imageData.type.includes('png')) imageFormat = 'png';
            else if (imageData.type.includes('webp')) imageFormat = 'webp';
            else if (imageData.type.includes('gif')) imageFormat = 'gif';
            else if (imageData.type.includes('jpeg') || imageData.type.includes('jpg')) {
                imageFormat = 'jpg';
            }
        } else if (typeof imageData === 'string') {
            const lower = imageData.toLowerCase();
            if (lower.includes('.png') || lower.includes('png')) imageFormat = 'png';
            else if (lower.includes('.webp') || lower.includes('webp')) imageFormat = 'webp';
            else if (lower.includes('.gif') || lower.includes('gif')) imageFormat = 'gif';
        }

        return imageFormat;
    }

    private createTransientObjectUrl(blob: Blob): string {
        const objectUrl = URL.createObjectURL(blob);
        this.transientObjectUrls.add(objectUrl);
        return objectUrl;
    }

    private releaseTransientObjectUrl(url: string | null | undefined): void {
        if (!url || !this.transientObjectUrls.has(url)) {
            return;
        }

        URL.revokeObjectURL(url);
        this.transientObjectUrls.delete(url);
    }

    private clearTransientObjectUrls(): void {
        this.transientObjectUrls.forEach((url) => {
            try {
                URL.revokeObjectURL(url);
            } catch (error) {
                console.warn('CoverLookupService: failed to revoke object URL', error);
            }
        });
        this.transientObjectUrls.clear();
    }

    private logError(message: string, error: unknown): void {
        console.error(`CoverLookupService: ${message}`, error);
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}

export const coverLookupService = new CoverLookupService();
