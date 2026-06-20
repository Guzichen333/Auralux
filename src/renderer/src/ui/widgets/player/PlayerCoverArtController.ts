import {coverLookupService} from "@/features/mediaAssets/service/CoverLookupService";
import {coverUpdateManager} from "@/features/mediaAssets/service/CoverUpdateManager";
import type {Track} from "@api/types/track";

function isNeteaseVirtualPath(filePath: unknown): boolean {
    if (typeof filePath !== 'string') return false;
    const normalized = filePath.replace(/\\/g, '/');
    return /^netease:\/+\d+$/.test(normalized) || /(?:^|\/)netease:\/+\d+$/.test(normalized);
}

interface CoverUpdatePayload {
    filePath?: string;
    title?: string;
    artist?: string;
    type?: string;
}

interface PlayerCoverArtControllerOptions {
    trackCover: HTMLImageElement;
    getCurrentTrack: () => Track | null;
    onCoverReady?: () => Promise<void> | void;
}

class PlayerCoverArtController {
    private readonly trackCover: HTMLImageElement;
    private readonly getCurrentTrack: () => Track | null;
    private readonly onCoverReady?: () => Promise<void> | void;
    private coverUpdateUnsubscribe: (() => void) | null = null;
    private coverGeneration = 0;

    constructor(options: PlayerCoverArtControllerOptions) {
        this.trackCover = options.trackCover;
        this.getCurrentTrack = options.getCurrentTrack;
        this.onCoverReady = options.onCoverReady;
    }

    start(): void {
        if (this.coverUpdateUnsubscribe) {
            return;
        }

        this.coverUpdateUnsubscribe = coverUpdateManager.onCoverUpdate((data: unknown) => {
            void this.handleCoverUpdate(data as CoverUpdatePayload);
        });
    }

    async updateTrackCover(track: Track): Promise<void> {
        const gen = ++this.coverGeneration;
        this.trackCover.src = 'assets/images/default-cover.svg';
        this.trackCover.classList.add('loading');

        try {
            if (track.cover && typeof track.cover === 'string' && track.cover.startsWith('http')) {
                this.setImageSrcForGeneration(track.cover, gen);
                return;
            }

            if (isNeteaseVirtualPath(track.filePath)) {
                return;
            }

            if (track.title && track.artist) {
                const coverResult = await coverLookupService.getCover(track.title, track.artist, track.album, track.filePath, true);
                if (gen !== this.coverGeneration) return;
                if (coverResult.success && coverResult.imageUrl && typeof coverResult.imageUrl === 'string') {
                track.cover = coverResult.imageUrl;
                    this.setImageSrcForGeneration(coverResult.imageUrl, gen);
                }
            }
        } catch (error) {
            if (gen === this.coverGeneration) {
                console.error('❌ PlayerCoverArtController: 封面更新失败:', error);
            }
        } finally {
            if (gen === this.coverGeneration) {
                this.trackCover.classList.remove('loading');
                await this.onCoverReady?.();
            }
        }
    }

    private setImageSrcForGeneration(url: string, gen: number): void {
        if (gen !== this.coverGeneration) return;

        const image = this.trackCover;
        const cleanup = () => {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
        };
        const handleLoad = () => {
            cleanup();
        };
        const handleError = () => {
            cleanup();
            if (gen === this.coverGeneration) {
                image.src = 'assets/images/default-cover.svg';
            }
        };

        image.addEventListener('load', handleLoad, {once: true});
        image.addEventListener('error', handleError, {once: true});
        image.src = url;
    }

    destroy(): void {
        if (!this.coverUpdateUnsubscribe) {
            return;
        }

        try {
            this.coverUpdateUnsubscribe();
        } catch (error) {
            console.warn('⚠️ PlayerCoverArtController: 移除封面更新订阅失败:', error);
        }
        this.coverUpdateUnsubscribe = null;
    }

    private async handleCoverUpdate(data: CoverUpdatePayload): Promise<void> {
        const {filePath, title, artist, type} = data;
        if (type && type !== 'cover-updated' && type !== 'manual-refresh') {
            return;
        }

        const currentTrack = this.getCurrentTrack();
        if (!currentTrack) {
            return;
        }

        const isCurrentTrack = (
            currentTrack.filePath === filePath ||
            (currentTrack.title === title && currentTrack.artist === artist)
        );
        if (!isCurrentTrack) {
            return;
        }

        if (currentTrack.cover) {
            delete currentTrack.cover;
        }

        try {
            await this.updateTrackCover(currentTrack);
        } catch (error) {
            console.error('❌ PlayerCoverArtController: 处理封面更新失败:', error);
        }
    }
}

export {PlayerCoverArtController};
