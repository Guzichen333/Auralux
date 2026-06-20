import type {Track} from '@api/types/library';

export type NetEaseLocalMatchStatus = 'matched' | 'cloud-only' | 'missing' | 'conflict';

export interface NetEaseLocalMatch {
    status: NetEaseLocalMatchStatus;
    confidence: number;
    matchedTrack?: Track;
    reason: string;
    corrected?: boolean;
}

const CORRECTIONS_CACHE_KEY = 'netease-local-match-corrections';
const TITLE_WEIGHT = 0.42;
const ARTIST_WEIGHT = 0.28;
const ALBUM_WEIGHT = 0.14;
const DURATION_WEIGHT = 0.16;

function normalizeTrackText(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[（(].*?[)）]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function isNetEaseTrack(track: Track): boolean {
    return (track as Track & {source?: string}).source === 'netease' || track.filePath?.startsWith('netease://');
}

function trackKey(track: Track): string {
    const externalId = (track as Track & {externalId?: string; songId?: string | number}).externalId || (track as any).songId;
    if (externalId) return String(externalId);
    const match = typeof track.filePath === 'string' ? track.filePath.match(/^netease:\/\/(\d+)/) : null;
    return match?.[1] || track.fileId || track.id || track.filePath;
}

function textScore(left: unknown, right: unknown): number {
    const a = normalizeTrackText(left);
    const b = normalizeTrackText(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.82;
    const aParts = new Set(a.split(' ').filter(Boolean));
    const bParts = b.split(' ').filter(Boolean);
    if (!aParts.size || !bParts.length) return 0;
    const hits = bParts.filter((part) => aParts.has(part)).length;
    return hits / Math.max(aParts.size, bParts.length);
}

function durationScore(left?: number, right?: number): number {
    if (!left || !right) return 0.35;
    const delta = Math.abs(left - right);
    if (delta <= 2) return 1;
    if (delta <= 5) return 0.85;
    if (delta <= 10) return 0.55;
    return 0;
}

function correctionStore(): Record<string, string> {
    try {
        const raw = localStorage.getItem(CORRECTIONS_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export class NetEaseLocalMatchService {
    matchTracks(tracks: Track[], libraryTracks: Track[]): Map<string, NetEaseLocalMatch> {
        const localTracks = libraryTracks.filter((track) => !isNetEaseTrack(track));
        const matches = new Map<string, NetEaseLocalMatch>();

        for (const track of tracks) {
            matches.set(trackKey(track), this.matchTrack(track, localTracks));
        }

        return matches;
    }

    matchTrack(track: Track, localTracks: Track[]): NetEaseLocalMatch {
        if (!isNetEaseTrack(track)) {
            return {status: 'matched', confidence: 1, matchedTrack: track, reason: 'local-file'};
        }

        const corrected = this.resolveCorrection(track, localTracks);
        if (corrected) {
            return {status: 'matched', confidence: 1, matchedTrack: corrected, reason: 'manual-correction', corrected: true};
        }

        const candidates = localTracks
            .map((candidate) => ({
                track: candidate,
                confidence: this.scoreCandidate(track, candidate)
            }))
            .sort((a, b) => b.confidence - a.confidence);

        const best = candidates[0];
        const second = candidates[1];
        if (!best || best.confidence < 0.68) {
            return {status: 'cloud-only', confidence: best?.confidence || 0, reason: 'no-local-match'};
        }

        if (second && best.confidence - second.confidence < 0.06 && second.confidence >= 0.68) {
            return {status: 'conflict', confidence: best.confidence, matchedTrack: best.track, reason: 'multiple-close-matches'};
        }

        return {status: 'matched', confidence: best.confidence, matchedTrack: best.track, reason: 'metadata-match'};
    }

    saveCorrection(neteaseTrack: Track, localTrack: Track): void {
        const corrections = correctionStore();
        corrections[trackKey(neteaseTrack)] = trackKey(localTrack);
        localStorage.setItem(CORRECTIONS_CACHE_KEY, JSON.stringify(corrections));
    }

    private resolveCorrection(track: Track, localTracks: Track[]): Track | undefined {
        const corrections = correctionStore();
        const correctedId = corrections[trackKey(track)];
        if (!correctedId) return undefined;
        return localTracks.find((candidate) => trackKey(candidate) === correctedId);
    }

    private scoreCandidate(neteaseTrack: Track, localTrack: Track): number {
        const score =
            textScore(neteaseTrack.title, localTrack.title) * TITLE_WEIGHT +
            textScore(neteaseTrack.artist, localTrack.artist) * ARTIST_WEIGHT +
            textScore(neteaseTrack.album, localTrack.album) * ALBUM_WEIGHT +
            durationScore(neteaseTrack.duration, localTrack.duration) * DURATION_WEIGHT;
        return Math.round(score * 1000) / 1000;
    }
}

export const netEaseLocalMatchService = new NetEaseLocalMatchService();
export {normalizeTrackText};
