import type {UINextPlaylistLike} from './playlistCoverTypes';

export const PLAYLIST_COVER_MANIFEST_KEY = 'ui-next.playlistCoverManifest.v1';
const PLAYLIST_COVER_CACHE_NAME = 'ui-next-playlist-covers-v1';
const MAX_CONCURRENT_COVER_CHECKS = 3;
const FAILURE_RETRY_BASE_MS = 5 * 60 * 1000;
export const COVER_FRESH_MS = 7 * 24 * 60 * 60 * 1000;
export const COVER_STALE_WHILE_REVALIDATE_MS = 45 * 24 * 60 * 60 * 1000;

export interface PlaylistCoverManifestEntry {
    key: string;
    sourceUrl: string;
    resolvedUrl: string;
    updatedAt: number;
    failureCount: number;
    retryAfter?: number;
    objectUrl?: string;
}

interface PlaylistCoverManifestData {
    version: 1;
    entries: Record<string, PlaylistCoverManifestEntry>;
}

type QueueItem = {
    run: () => void;
};

class PlaylistCoverManifest {
    private readonly inFlight = new Map<string, Promise<PlaylistCoverManifestEntry | null>>();
    private readonly objectUrlByResolvedUrl = new Map<string, string>();
    private queue: QueueItem[] = [];
    private activeCount = 0;

    resolveCachedPlaylistCover(playlist: UINextPlaylistLike): string | undefined {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) {
            return this.getRenderableCover(playlist.cover);
        }

        const entry = this.getManifest().entries[this.getKey(playlist, sourceUrl)];
        if (!entry || entry.sourceUrl !== sourceUrl || !entry.resolvedUrl) {
            return this.getRenderableCover(playlist.cover);
        }

        console.info('[ui-next] playlist cover cache hit', {
            playlistId: playlist.id,
            sourceUrl
        });
        return this.getRenderableCover(entry.objectUrl || this.objectUrlByResolvedUrl.get(entry.resolvedUrl) || entry.resolvedUrl);
    }

    async resolveCachedPlaylistCoverAsync(playlist: UINextPlaylistLike): Promise<string | undefined> {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) {
            return this.getRenderableCover(playlist.cover);
        }

        const entry = this.getManifest().entries[this.getKey(playlist, sourceUrl)];
        if (!entry || entry.sourceUrl !== sourceUrl || !entry.resolvedUrl) {
            return this.getRenderableCover(playlist.cover);
        }

        const objectUrl = await this.readCachedObjectUrl(entry.resolvedUrl);
        if (!objectUrl) {
            return this.getRenderableCover(playlist.cover);
        }

        entry.objectUrl = objectUrl;
        playlist.cover = objectUrl;
        console.info('[ui-next] playlist cover cache hit', {
            playlistId: playlist.id,
            sourceUrl
        });
        return objectUrl;
    }

    async hydratePlaylistCovers(playlists: UINextPlaylistLike[]): Promise<void> {
        const candidates = playlists.filter((playlist) => Boolean(this.getSourceUrl(playlist)));
        await Promise.all(candidates.map((playlist) => this.ensurePlaylistCover(playlist)));
    }

    preloadStableCoverMetadata(playlists: UINextPlaylistLike[], limit = 60): {hits: number; scheduled: number} {
        let hits = 0;
        let scheduled = 0;
        const candidates = playlists.filter((playlist) => Boolean(this.getSourceUrl(playlist))).slice(0, limit);

        for (const playlist of candidates) {
            const sourceUrl = this.getSourceUrl(playlist);
            const entry = this.getManifest().entries[this.getKey(playlist, sourceUrl)];
            if (entry?.sourceUrl === sourceUrl && entry.resolvedUrl) {
                hits += 1;
                const cachedCover = this.resolveCachedPlaylistCover(playlist);
                if (cachedCover) {
                    playlist.cover = cachedCover;
                }
                if (!this.isFreshCoverEntry(entry) && this.isStaleButUsableCoverEntry(entry)) {
                    scheduled += this.refreshPlaylistCoverInBackground(playlist) ? 1 : 0;
                }
                continue;
            }

            scheduled += this.refreshPlaylistCoverInBackground(playlist) ? 1 : 0;
        }

        return {hits, scheduled};
    }

    async ensurePlaylistCover(playlist: UINextPlaylistLike): Promise<PlaylistCoverManifestEntry | null> {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) {
            return null;
        }

        const key = this.getKey(playlist, sourceUrl);
        const manifest = this.getManifest();
        const existing = manifest.entries[key];
        const now = Date.now();
        const current = this.inFlight.get(key);
        if (current) {
            return current;
        }
        if (existing?.sourceUrl === sourceUrl && existing.resolvedUrl && this.isFreshCoverEntry(existing)) {
            const cachedCover = await this.resolveCachedPlaylistCoverAsync(playlist);
            if (cachedCover) {
                playlist.cover = cachedCover;
                return existing;
            }
            return this.enqueueCoverRefresh(playlist, key, sourceUrl);
        }
        if (existing?.sourceUrl === sourceUrl && existing.resolvedUrl && this.isStaleButUsableCoverEntry(existing)) {
            const cachedCover = await this.resolveCachedPlaylistCoverAsync(playlist);
            if (cachedCover) {
                playlist.cover = cachedCover;
                void this.refreshPlaylistCoverInBackground(playlist);
                return existing;
            }
            return this.enqueueCoverRefresh(playlist, key, sourceUrl);
        }
        if (existing?.retryAfter && existing.retryAfter > now) {
            return null;
        }

        const task = this.enqueue(async () => {
            try {
                const resolvedUrl = await this.resolveCoverUrl(sourceUrl);
                const nextEntry: PlaylistCoverManifestEntry = {
                    key,
                    sourceUrl,
                    resolvedUrl,
                    updatedAt: Date.now(),
                    failureCount: 0
                };
                const nextManifest = this.getManifest();
                nextManifest.entries[key] = nextEntry;
                this.saveManifest(nextManifest);
                const objectUrl = await this.readCachedObjectUrl(resolvedUrl, {forceRefresh: true});
                if (objectUrl) {
                    nextEntry.objectUrl = objectUrl;
                    playlist.cover = objectUrl;
                } else {
                    playlist.cover = this.getRenderableCover(playlist.cover);
                }
                console.info('[ui-next] playlist cover cache stored', {
                    playlistId: playlist.id,
                    sourceUrl
                });
                return nextEntry;
            } catch (error) {
                this.recordFailure(key, sourceUrl, error);
                return null;
            } finally {
                this.inFlight.delete(key);
            }
        });

        this.inFlight.set(key, task);
        return task;
    }

    invalidatePlaylistCover(playlist: UINextPlaylistLike): void {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) return;
        const manifest = this.getManifest();
        const key = this.getKey(playlist, sourceUrl);
        const entry = manifest.entries[key];
        delete manifest.entries[key];
        if (entry?.resolvedUrl && !this.hasOtherEntryForResolvedUrl(manifest, key, entry.resolvedUrl)) {
            this.revokeObjectUrl(entry.resolvedUrl);
        }
        this.saveManifest(manifest);
    }

    dispose(): void {
        for (const objectUrl of this.objectUrlByResolvedUrl.values()) {
            URL.revokeObjectURL(objectUrl);
        }
        this.objectUrlByResolvedUrl.clear();
    }

    refreshPlaylistCoverInBackground(playlist: UINextPlaylistLike): boolean {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) return false;
        const key = this.getKey(playlist, sourceUrl);
        if (this.inFlight.has(key)) return false;

        const manifest = this.getManifest();
        const existing = manifest.entries[key];
        if (existing?.retryAfter && existing.retryAfter > Date.now()) {
            return false;
        }

        void this.enqueueCoverRefresh(playlist, key, sourceUrl);
        return true;
    }

    async refreshPlaylistCover(playlist: UINextPlaylistLike): Promise<PlaylistCoverManifestEntry | null> {
        const sourceUrl = this.getSourceUrl(playlist);
        if (!sourceUrl) return null;
        const key = this.getKey(playlist, sourceUrl);
        if (this.inFlight.has(key)) return this.inFlight.get(key) || null;

        const manifest = this.getManifest();
        const existing = manifest.entries[key];
        if (existing?.retryAfter && existing.retryAfter > Date.now()) {
            return null;
        }

        return this.enqueueCoverRefresh(playlist, key, sourceUrl);
    }

    private isFreshCoverEntry(entry: PlaylistCoverManifestEntry): boolean {
        return Boolean(entry.resolvedUrl) && Date.now() - entry.updatedAt <= COVER_FRESH_MS;
    }

    private isStaleButUsableCoverEntry(entry: PlaylistCoverManifestEntry): boolean {
        const age = Date.now() - entry.updatedAt;
        return Boolean(entry.resolvedUrl) && age > COVER_FRESH_MS && age <= COVER_STALE_WHILE_REVALIDATE_MS;
    }

    private async enqueueCoverRefresh(playlist: UINextPlaylistLike, key: string, sourceUrl: string): Promise<PlaylistCoverManifestEntry | null> {
        const current = this.inFlight.get(key);
        if (current) {
            return current;
        }

        const task = this.enqueue(async () => {
            try {
                const resolvedUrl = await this.resolveCoverUrl(sourceUrl, true);
                const nextEntry: PlaylistCoverManifestEntry = {
                    key,
                    sourceUrl,
                    resolvedUrl,
                    updatedAt: Date.now(),
                    failureCount: 0
                };
                const nextManifest = this.getManifest();
                nextManifest.entries[key] = nextEntry;
                this.saveManifest(nextManifest);
                const objectUrl = await this.readCachedObjectUrl(resolvedUrl, {forceRefresh: true});
                if (objectUrl) {
                    nextEntry.objectUrl = objectUrl;
                    playlist.cover = objectUrl;
                } else {
                    playlist.cover = this.getRenderableCover(playlist.cover);
                }
                return nextEntry;
            } catch (error) {
                this.recordFailure(key, sourceUrl, error);
                return null;
            } finally {
                this.inFlight.delete(key);
            }
        });

        this.inFlight.set(key, task);
        return task;
    }

    private async resolveCoverUrl(sourceUrl: string, refresh = false): Promise<string> {
        if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
            return sourceUrl;
        }

        const cache = await caches.open(PLAYLIST_COVER_CACHE_NAME);
        const cached = await cache.match(sourceUrl);
        if (cached && !refresh) {
            return sourceUrl;
        }

        const response = await fetch(sourceUrl, {cache: refresh ? 'reload' : 'force-cache'});
        if (!response.ok) {
            throw new Error(`cover check failed: ${response.status}`);
        }
        await cache.put(sourceUrl, response.clone());
        return sourceUrl;
    }

    private async readCachedObjectUrl(sourceUrl: string, options: {forceRefresh?: boolean} = {}): Promise<string | null> {
        if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
            return sourceUrl;
        }
        if (!options.forceRefresh) {
            const existing = this.objectUrlByResolvedUrl.get(sourceUrl);
            if (existing) {
                return existing;
            }
        }
        if (options.forceRefresh) {
            this.revokeObjectUrl(sourceUrl);
        }
        try {
            const cache = await caches.open(PLAYLIST_COVER_CACHE_NAME);
            const cached = await cache.match(sourceUrl);
            if (!cached) {
                return null;
            }
            const blob = await cached.blob();
            return this.rememberObjectUrl(sourceUrl, URL.createObjectURL(blob));
        } catch {
            return null;
        }
    }

    private rememberObjectUrl(resolvedUrl: string, objectUrl: string): string {
        const previous = this.objectUrlByResolvedUrl.get(resolvedUrl);
        if (previous && previous !== objectUrl) {
            this.revokeObjectUrl(resolvedUrl);
        }
        this.objectUrlByResolvedUrl.set(resolvedUrl, objectUrl);
        return objectUrl;
    }

    private revokeObjectUrl(resolvedUrl: string): void {
        const objectUrl = this.objectUrlByResolvedUrl.get(resolvedUrl);
        if (!objectUrl) return;
        URL.revokeObjectURL(objectUrl);
        this.objectUrlByResolvedUrl.delete(resolvedUrl);
    }

    private getRenderableCover(cover: string | undefined): string | undefined {
        if (!cover || this.isRemoteUrl(cover)) {
            return undefined;
        }
        return cover;
    }

    private isRemoteUrl(value: string): boolean {
        return value.startsWith('http://') || value.startsWith('https://');
    }

    private recordFailure(key: string, sourceUrl: string, error: unknown): void {
        const manifest = this.getManifest();
        const previous = manifest.entries[key];
        const failureCount = (previous?.failureCount || 0) + 1;
        manifest.entries[key] = {
            key,
            sourceUrl,
            resolvedUrl: previous?.resolvedUrl || '',
            updatedAt: Date.now(),
            failureCount,
            retryAfter: Date.now() + Math.min(FAILURE_RETRY_BASE_MS * failureCount, 60 * 60 * 1000)
        };
        this.saveManifest(manifest);
        console.info('[ui-next] playlist cover cache degraded', {
            sourceUrl,
            failureCount,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const run = () => {
                this.activeCount += 1;
                operation()
                    .then(resolve, reject)
                    .finally(() => {
                        this.activeCount -= 1;
                        this.drainQueue();
                    });
            };
            this.queue.push({run});
            this.drainQueue();
        });
    }

    private drainQueue(): void {
        while (this.activeCount < MAX_CONCURRENT_COVER_CHECKS && this.queue.length > 0) {
            const item = this.queue.shift();
            item?.run();
        }
    }

    private getSourceUrl(playlist: UINextPlaylistLike): string {
        const sourceUrl = playlist.coverSourceUrl || playlist.cover;
        return typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
    }

    private getKey(playlist: UINextPlaylistLike, sourceUrl: string): string {
        return `${playlist.source || 'local'}:${playlist.externalId || playlist.id}:${sourceUrl}`;
    }

    private getManifest(): PlaylistCoverManifestData {
        try {
            const raw = localStorage.getItem(PLAYLIST_COVER_MANIFEST_KEY);
            if (!raw) {
                return {version: 1, entries: {}};
            }
            const parsed = JSON.parse(raw) as Partial<PlaylistCoverManifestData>;
            return {
                version: 1,
                entries: parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {}
            };
        } catch {
            return {version: 1, entries: {}};
        }
    }

    private saveManifest(manifest: PlaylistCoverManifestData): void {
        try {
            const entries: Record<string, PlaylistCoverManifestEntry> = {};
            for (const [key, entry] of Object.entries(manifest.entries)) {
                const {objectUrl, ...persistedEntry} = entry;
                entries[key] = persistedEntry;
            }
            localStorage.setItem(PLAYLIST_COVER_MANIFEST_KEY, JSON.stringify({version: 1, entries}));
        } catch (error) {
            console.warn('[ui-next] playlist cover cache manifest save failed', error);
        }
    }

    private hasOtherEntryForResolvedUrl(manifest: PlaylistCoverManifestData, removedKey: string, resolvedUrl: string): boolean {
        return Object.entries(manifest.entries).some(([key, entry]) => (
            key !== removedKey && entry.resolvedUrl === resolvedUrl
        ));
    }
}

export const playlistCoverManifest = new PlaylistCoverManifest();
