import {libraryDataService} from "@/features/library/service/LibraryDataService";

function isNeteaseVirtualPath(filePath: unknown): boolean {
    if (typeof filePath !== 'string') return false;
    const normalized = filePath.replace(/\\/g, '/');
    return /^netease:\/+\d+$/.test(normalized) || /(?:^|\/)netease:\/+\d+$/.test(normalized);
}

interface EmbeddedCoverResult {
    success: boolean;
    error?: string;
    url?: string;
    mimeType?: string;
    format?: string;
    size?: number;
    source?: 'embedded';
    cachedAt?: number;
}

interface EmbeddedCoverData {
    data: any;
    format?: string;
}

interface TrackMetadataWithCover {
    cover?: EmbeddedCoverData;
}

interface BufferLike {
    length: number;
    constructor?: {
        name?: string;
    };
    slice?: (...args: any[]) => unknown;
    toString?: (...args: any[]) => string;
}

interface CoverConversionResult {
    success: boolean;
    error?: string;
    url?: string;
    mimeType?: string;
    size?: number;
}

class EmbeddedCoverManager {
    private readonly cache: Map<string, EmbeddedCoverResult>;
    private readonly maxCacheSize: number;
    private readonly objectUrls: Set<string>;
    private readonly urlReferences: Map<string, number>;
    private readonly pendingReleases: Map<string, ReturnType<typeof setTimeout>>;
    private readonly processingFiles: Set<string>;

    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 5;
        this.objectUrls = new Set();
        this.urlReferences = new Map();
        this.pendingReleases = new Map();
        this.processingFiles = new Set();
    }

    async getEmbeddedCover(filePath: string): Promise<EmbeddedCoverResult> {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return {success: false, error: 'invalid file path'};
            }

            if (isNeteaseVirtualPath(filePath)) {
                return {success: false, error: 'netease virtual path not supported'};
            }

            const cacheKey = this.generateCacheKey(filePath);
            if (this.cache.has(cacheKey)) {
                const cachedResult = this.cache.get(cacheKey)!;
                if (cachedResult.success && cachedResult.url && cachedResult.url.startsWith('blob:')) {
                    const currentCount = this.urlReferences.get(cachedResult.url) || 0;
                    this.urlReferences.set(cachedResult.url, currentCount + 1);
                }
                return cachedResult;
            }

            if (this.processingFiles.has(filePath)) {
                return new Promise<EmbeddedCoverResult>((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (!this.processingFiles.has(filePath)) {
                            clearInterval(checkInterval);
                            resolve(this.getEmbeddedCover(filePath));
                        }
                    }, 50);

                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve({success: false, error: 'processing timeout'});
                    }, 5000);
                });
            }

            this.processingFiles.add(filePath);

            const metadata = await libraryDataService.getTrackMetadata(filePath) as TrackMetadataWithCover | null;
            if (!metadata || typeof metadata !== 'object') {
                const errorResult: EmbeddedCoverResult = {success: false, error: 'invalid metadata response'};
                this.setCache(cacheKey, errorResult);
                this.processingFiles.delete(filePath);
                return errorResult;
            }

            if (!metadata.cover) {
                const errorResult: EmbeddedCoverResult = {success: false, error: 'embedded cover not found'};
                this.setCache(cacheKey, errorResult);
                this.processingFiles.delete(filePath);
                return errorResult;
            }

            if (!metadata.cover.data || !metadata.cover.format) {
                const errorResult: EmbeddedCoverResult = {success: false, error: 'invalid embedded cover data'};
                this.setCache(cacheKey, errorResult);
                this.processingFiles.delete(filePath);
                return errorResult;
            }

            const convertedCover = this.convertCoverToUrl(metadata.cover);
            if (!convertedCover.success || typeof convertedCover.url !== 'string') {
                const errorResult: EmbeddedCoverResult = {
                    success: false,
                    error: convertedCover.error || 'cover conversion failed'
                };
                this.setCache(cacheKey, errorResult);
                this.processingFiles.delete(filePath);
                return errorResult;
            }

            const finalResult: EmbeddedCoverResult = {
                success: true,
                url: convertedCover.url,
                mimeType: convertedCover.mimeType,
                format: metadata.cover.format,
                size: convertedCover.size,
                source: 'embedded',
            };

            this.setCache(cacheKey, finalResult);
            this.processingFiles.delete(filePath);
            return finalResult;
        } catch (error) {
            this.processingFiles.delete(filePath);

            const caughtError = error instanceof Error ? error : new Error(String(error));
            const errorResult: EmbeddedCoverResult = {
                success: false,
                error: caughtError.message || 'embedded cover lookup failed'
            };

            if (caughtError.name !== 'NetworkError') {
                const cacheKey = this.generateCacheKey(filePath);
                this.setCache(cacheKey, errorResult);
            }

            return errorResult;
        }
    }

    convertCoverToUrl(coverData: EmbeddedCoverData): CoverConversionResult {
        try {
            if (!coverData || !coverData.data) {
                throw new Error('cover data is empty');
            }

            let imageData: any = coverData.data;
            const format = coverData.format || 'jpeg';

            if (imageData instanceof ArrayBuffer) {
                imageData = new Uint8Array(imageData);
            } else if (Array.isArray(imageData)) {
                imageData = new Uint8Array(imageData);
            } else if (imageData instanceof Uint8Array) {
                // Already usable.
            } else if (this.isBufferLike(imageData)) {
                imageData = new Uint8Array(imageData as any);
            } else if (imageData.length && typeof imageData.length === 'number') {
                imageData = new Uint8Array(imageData);
            } else {
                throw new Error('unsupported cover data type');
            }

            if (!imageData.length || imageData.length === 0) {
                throw new Error('cover data is empty');
            }

            const mimeType = `image/${format.toLowerCase()}`;
            const blob = new Blob([imageData as BlobPart], {type: mimeType});
            if (blob.size === 0) {
                throw new Error('cover blob is empty');
            }

            const objectUrl = URL.createObjectURL(blob);
            if (typeof objectUrl !== 'string' || !objectUrl.startsWith('blob:')) {
                throw new Error('failed to create blob URL');
            }

            this.objectUrls.add(objectUrl);
            this.urlReferences.set(objectUrl, 2);

            return {
                success: true,
                url: objectUrl,
                mimeType,
                size: blob.size
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    isBufferLike(obj: unknown): obj is BufferLike {
        if (!obj) return false;
        const candidate = obj as any;

        if (
            typeof candidate === 'object' &&
            typeof candidate.length === 'number' &&
            typeof candidate.constructor === 'function'
        ) {
            if (candidate.constructor.name === 'Buffer') {
                return true;
            }

            return (
                typeof candidate.slice === 'function' &&
                typeof candidate.toString === 'function' &&
                candidate.length >= 0
            );
        }

        return false;
    }

    generateCacheKey(filePath: string): string {
        return `cover_${filePath}`;
    }

    setCache(key: string, data: EmbeddedCoverResult): void {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            const oldData = firstKey ? this.cache.get(firstKey) : null;

            if (oldData && oldData.url && oldData.url.startsWith('blob:')) {
                this.releaseUrlReference(oldData.url);
            }

            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            ...data,
            cachedAt: Date.now()
        });
    }

    clearCache(): void {
        this.objectUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });
        this.objectUrls.clear();
        this.urlReferences.clear();
        this.processingFiles.clear();

        this.pendingReleases.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.pendingReleases.clear();
        this.cache.clear();
    }

    releaseUrlReference(url: string): void {
        if (!url || !url.startsWith('blob:')) return;

        const currentCount = this.urlReferences.get(url) || 0;
        if (currentCount <= 1) {
            this.scheduleUrlRelease(url);
        } else {
            this.urlReferences.set(url, currentCount - 1);
        }
    }

    scheduleUrlRelease(url: string): void {
        if (this.pendingReleases.has(url)) {
            return;
        }

        const timeoutId = setTimeout(() => {
            this.safeReleaseUrl(url);
            this.pendingReleases.delete(url);
        }, 3000);

        this.pendingReleases.set(url, timeoutId);
    }

    safeReleaseUrl(url: string): void {
        try {
            if (this.objectUrls.has(url)) {
                URL.revokeObjectURL(url);
                this.objectUrls.delete(url);
                this.urlReferences.delete(url);
            }
        } catch (error) {
            console.warn('EmbeddedCoverManager: failed to revoke blob URL', error);
        }
    }

    clearCacheForFile(filePath: string): boolean {
        if (!filePath) return false;

        const cacheKey = this.generateCacheKey(filePath);
        if (this.cache.has(cacheKey)) {
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult?.success && cachedResult.url && cachedResult.url.startsWith('blob:')) {
                this.releaseUrlReference(cachedResult.url);
            }

            this.cache.delete(cacheKey);
            return true;
        }

        return false;
    }

    isBlobUrlValid(url: string): boolean {
        if (!url || !url.startsWith('blob:')) {
            return false;
        }

        return this.objectUrls.has(url) && this.urlReferences.has(url);
    }
}

const embeddedCoverManager = new EmbeddedCoverManager();
export {embeddedCoverManager};
