import {netEaseApiClient} from './NetEaseApiClient';
import type {LyricLine} from '@api/types/lyrics';

export interface NetEaseLyricsResult {
    lrc: string | null;
    tlyric: string | null;
    yrc: string | null;
    yrcLines: LyricLine[];
}

class NetEaseLyricsService {
    private readonly cache = new Map<number, NetEaseLyricsResult | null>();
    private readonly inflight = new Map<number, Promise<NetEaseLyricsResult | null>>();

    async getLyrics(songId: number): Promise<NetEaseLyricsResult | null> {
        if (this.cache.has(songId)) {
            return this.cache.get(songId) ?? null;
        }

        if (this.inflight.has(songId)) {
            return this.inflight.get(songId)!;
        }

        const promise = this.fetchLyrics(songId);
        this.inflight.set(songId, promise);

        try {
            const result = await promise;
            this.cache.set(songId, result);
            return result;
        } finally {
            this.inflight.delete(songId);
        }
    }

    private async fetchLyrics(songId: number): Promise<NetEaseLyricsResult | null> {
        try {
            const richData = await netEaseApiClient.get('/lyric/new', {
                id: songId.toString()
            });

            const yrc = richData && richData.yrc && richData.yrc.lyric ? richData.yrc.lyric : null;
            const yrcLines = yrc ? this.parseYRC(yrc) : [];

            if (yrcLines.length > 0) {
                return {
                    lrc: null,
                    tlyric: richData.tlyric && richData.tlyric.lyric ? richData.tlyric.lyric : null,
                    yrc,
                    yrcLines
                };
            }

            const data = await netEaseApiClient.get('/lyric', {
                id: songId.toString()
            });

            if (!data) {
                return {
                    lrc: null,
                    tlyric: null,
                    yrc: null,
                    yrcLines: []
                };
            }

            return {
                lrc: data.lrc && data.lrc.lyric ? data.lrc.lyric : null,
                tlyric: data.tlyric && data.tlyric.lyric ? data.tlyric.lyric : null,
                yrc: null,
                yrcLines: []
            };
        } catch {
            return null;
        }
    }

    parseYRC(yrcText: string): LyricLine[] {
        const lines: LyricLine[] = [];
        if (!yrcText) return lines;

        const lineRegex = /^\[(\d+),(\d+)](.*)$/;
        const wordRegex = /\((\d+),(\d+),\d+\)([^(]*)/g;

        for (const rawLine of yrcText.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith('{')) continue;

            const lineMatch = line.match(lineRegex);
            if (!lineMatch) continue;

            const lineStartMs = parseInt(lineMatch[1], 10);
            const lineDurationMs = parseInt(lineMatch[2], 10);
            const payload = lineMatch[3] || '';
            const words: NonNullable<LyricLine['words']> = [];
            let content = '';

            for (const wordMatch of payload.matchAll(wordRegex)) {
                const wordStartMs = parseInt(wordMatch[1], 10);
                const wordDurationMs = parseInt(wordMatch[2], 10);
                const text = wordMatch[3] || '';
                if (!text) continue;

                content += text;
                words.push({
                    text,
                    time: wordStartMs / 1000,
                    endTime: (wordStartMs + wordDurationMs) / 1000
                });
            }

            content = content.trim();
            if (!content || words.length === 0) continue;

            lines.push({
                time: lineStartMs / 1000,
                endTime: (lineStartMs + lineDurationMs) / 1000,
                content,
                type: 'word-by-word',
                words
            });
        }

        lines.sort((a, b) => a.time - b.time);
        return this.sanitizeYRCLines(lines);
    }

    private sanitizeYRCLines(lines: LyricLine[]): LyricLine[] {
        return lines
            .filter((line) => Number.isFinite(line.time) && line.time >= 0)
            .map((line) => {
                const words = (line.words || [])
                    .filter((word) => Number.isFinite(word.time))
                    .filter((word) => word.time >= line.time)
                    .filter((word) => word.endTime == null || word.endTime >= word.time);

                return {
                    ...line,
                    endTime: line.endTime == null || line.endTime >= line.time ? line.endTime : null,
                    words
                };
            })
            .filter((line) => line.words && line.words.length > 0);
    }
}

export const netEaseLyricsService = new NetEaseLyricsService();
export {NetEaseLyricsService};
