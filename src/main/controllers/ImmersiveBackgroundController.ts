import {app} from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {spawn} from 'child_process';
import {BaseController, Controller, IpcHandle} from '../decorators/IpcHandler';

interface PrepareVideoResult {
    success: boolean;
    sourcePath?: string;
    cachePath?: string;
    reused?: boolean;
    preset?: ImmersiveVideoQuality;
    error?: string;
}

type ImmersiveVideoQuality = 'smooth' | 'quality';
type ImmersiveCacheMediaType = 'image' | 'video';
type ImmersiveCacheQuality = 'source' | ImmersiveVideoQuality;

interface ImportBackgroundResult {
    success: boolean;
    sourcePath?: string;
    cachePath?: string;
    mediaType?: ImmersiveCacheMediaType;
    reused?: boolean;
    error?: string;
}

interface CacheManifestEntry {
    mediaType: ImmersiveCacheMediaType;
    sourcePath: string;
    sourceName: string;
    sourceSize: number;
    sourceMtimeMs: number;
    quality: ImmersiveCacheQuality;
    presetVersion: string;
    cachePath: string;
    cacheSize: number;
    previewPath?: string;
    createdAt: number;
}

interface CacheListItem {
    mediaType: ImmersiveCacheMediaType;
    sourcePath: string;
    sourceName: string;
    sourceSize: number;
    sourceMtimeMs: number;
    previewPath?: string;
    qualities: Array<{
        quality: ImmersiveCacheQuality;
        presetVersion: string;
        cachePath: string;
        cacheSize: number;
        previewPath?: string;
        createdAt: number;
    }>;
}

interface VideoPreset {
    version: string;
    maxWidth: number;
    bitrate: string;
    maxrate: string;
    bufsize: string;
    level: string;
    minLoopSeconds: number;
}

const SUPPORTED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_PRESETS: Record<ImmersiveVideoQuality, VideoPreset> = {
    smooth: {
        version: 'immersive-bg-v2-smooth-1080p60-h264-24s-min',
        maxWidth: 1920,
        bitrate: '10M',
        maxrate: '12M',
        bufsize: '24M',
        level: '4.2',
        minLoopSeconds: 24
    },
    quality: {
        version: 'immersive-bg-v3-quality-1440p60-h264-24s-min',
        maxWidth: 2560,
        bitrate: '22M',
        maxrate: '26M',
        bufsize: '52M',
        level: '5.1',
        minLoopSeconds: 24
    }
};

@Controller('immersiveBackground')
export class ImmersiveBackgroundController extends BaseController {
    @IpcHandle('immersiveBackground:importBackground')
    async importBackground(filePath: string, mediaType: ImmersiveCacheMediaType): Promise<ImportBackgroundResult> {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return {success: false, error: 'Invalid background path'};
            }

            const ext = path.extname(filePath).toLowerCase();
            if (mediaType === 'image' && !SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
                return {success: false, sourcePath: filePath, error: 'Unsupported image format'};
            }
            if (mediaType === 'video' && !SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
                return {success: false, sourcePath: filePath, error: 'Unsupported video format'};
            }

            console.log(`ImmersiveBackground: import ${mediaType} ${filePath}`);

            const sourceStat = await fs.promises.stat(filePath);
            if (!sourceStat.isFile()) {
                return {success: false, sourcePath: filePath, error: 'Background path is not a file'};
            }

            const cacheDir = this.getCacheDir();
            await fs.promises.mkdir(cacheDir, {recursive: true});
            const cacheKey = crypto
                .createHash('sha1')
                .update(`source\n${mediaType}\n${filePath}\n${sourceStat.size}\n${sourceStat.mtimeMs}`)
                .digest('hex');
            const cachePath = path.join(cacheDir, `${cacheKey}${ext}`);
            const reused = await this.fileExists(cachePath);
            if (!reused) {
                await fs.promises.copyFile(filePath, cachePath);
            }

            const manifestSourcePath = mediaType === 'video' ? cachePath : filePath;
            const manifestSourceStat = mediaType === 'video' ? await fs.promises.stat(cachePath) : sourceStat;
            const previewPath = mediaType === 'video'
                ? await this.ensureVideoPreview(cachePath).catch(() => '')
                : cachePath;

            await this.upsertCacheManifest(
                manifestSourcePath,
                manifestSourceStat,
                'source',
                {version: 'immersive-bg-source'},
                cachePath,
                mediaType,
                path.basename(filePath),
                previewPath
            );

            console.log(`ImmersiveBackground: imported ${mediaType} cache ${cachePath}`);
            return {success: true, sourcePath: filePath, cachePath, mediaType, reused};
        } catch (error: any) {
            return {success: false, sourcePath: filePath, error: error?.message || 'Failed to import background'};
        }
    }

    @IpcHandle('immersiveBackground:prepareVideo')
    async prepareVideo(filePath: string, quality: ImmersiveVideoQuality = 'quality'): Promise<PrepareVideoResult> {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return {success: false, error: 'Invalid video path'};
            }

            const preset = VIDEO_PRESETS[quality] || VIDEO_PRESETS.quality;

            const ext = path.extname(filePath).toLowerCase();
            if (!SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
                return {success: false, sourcePath: filePath, error: 'Unsupported video format'};
            }

            const stat = await fs.promises.stat(filePath);
            if (!stat.isFile()) {
                return {success: false, sourcePath: filePath, error: 'Video path is not a file'};
            }

            const cacheDir = this.getCacheDir();
            await fs.promises.mkdir(cacheDir, {recursive: true});

            const cacheKey = crypto
                .createHash('sha1')
                .update(`${preset.version}\n${filePath}\n${stat.size}\n${stat.mtimeMs}`)
                .digest('hex');
            const cachePath = path.join(cacheDir, `${cacheKey}.mp4`);

            if (await this.fileExists(cachePath)) {
                const sourceName = await this.findSourceDisplayName(filePath);
                const previewPath = await this.ensureVideoPreview(filePath).catch(() => '');
                await this.upsertCacheManifest(filePath, stat, quality, preset, cachePath, 'video', sourceName, previewPath);
                return {success: true, sourcePath: filePath, cachePath, reused: true, preset: quality};
            }

            const tempPath = path.join(cacheDir, `${cacheKey}.tmp.mp4`);
            await this.removeIfExists(tempPath);
            const duration = await this.probeDuration(filePath);
            await this.transcodeVideo(filePath, tempPath, duration, preset);
            await fs.promises.rename(tempPath, cachePath);
            const sourceName = await this.findSourceDisplayName(filePath);
            const previewPath = await this.ensureVideoPreview(filePath).catch(() => '');
            await this.upsertCacheManifest(filePath, stat, quality, preset, cachePath, 'video', sourceName, previewPath);

            return {success: true, sourcePath: filePath, cachePath, reused: false, preset: quality};
        } catch (error: any) {
            return {
                success: false,
                sourcePath: filePath,
                error: error?.message || 'Video background optimization failed'
            };
        }
    }

    @IpcHandle('immersiveBackground:listCachedVideos')
    async listCachedVideos(): Promise<{success: boolean; items: CacheListItem[]; error?: string}> {
        try {
            const entries = await this.readCacheManifest();
            const validEntries: CacheManifestEntry[] = [];
            for (const entry of entries) {
                const normalizedEntry = this.normalizeCacheEntry(entry);
                if (normalizedEntry && await this.fileExists(normalizedEntry.cachePath)) {
                    validEntries.push(normalizedEntry);
                }
            }

            const previewPaths = new Set(
                validEntries
                    .filter(entry => entry.mediaType === 'video' && entry.previewPath)
                    .map(entry => path.resolve(entry.previewPath as string))
            );
            const visibleEntries = validEntries.filter(entry => !(
                entry.mediaType === 'image'
                && previewPaths.has(path.resolve(entry.cachePath))
            ));

            if (visibleEntries.length !== entries.length) {
                await this.writeCacheManifest(visibleEntries);
            }

            const grouped = new Map<string, CacheListItem>();
            for (const entry of visibleEntries) {
                this.addCacheEntryToGroup(grouped, entry);
            }

            const knownCachePaths = new Set(visibleEntries.map(entry => entry.cachePath));
            for (const previewPath of previewPaths) {
                knownCachePaths.add(previewPath);
            }
            const orphanEntries = await this.scanOrphanCacheEntries(knownCachePaths);
            for (const entry of orphanEntries) {
                this.addCacheEntryToGroup(grouped, entry);
            }
            if (orphanEntries.length > 0) {
                await this.writeCacheManifest([...visibleEntries, ...orphanEntries]);
            }

            const items = Array.from(grouped.values())
                .map(item => ({
                    ...item,
                    previewPath: item.previewPath || item.qualities.find(q => q.previewPath)?.previewPath || '',
                    qualities: item.qualities.sort((a, b) => this.qualityOrder(a.quality) - this.qualityOrder(b.quality))
                }))
                .sort((a, b) => Math.max(...b.qualities.map(q => q.createdAt)) - Math.max(...a.qualities.map(q => q.createdAt)));

            return {success: true, items};
        } catch (error: any) {
            return {success: false, items: [], error: error?.message || 'Failed to list cached videos'};
        }
    }

    @IpcHandle('immersiveBackground:renameCachedVideo')
    async renameCachedVideo(cachePath: string, displayName: string): Promise<{success: boolean; error?: string}> {
        try {
            const resolvedCachePath = this.resolveCacheFilePath(cachePath);
            const nextName = displayName.trim().slice(0, 80);
            if (!nextName) {
                return {success: false, error: 'Display name is required'};
            }

            const stat = await fs.promises.stat(resolvedCachePath);
            if (!stat.isFile()) {
                return {success: false, error: 'Cached video not found'};
            }

            const entries = await this.readCacheManifest();
            const target = entries.find(entry => entry.cachePath === resolvedCachePath);
            let matched = false;
            const nextEntries = entries.map(entry => {
                const sameCachedFile = entry.cachePath === resolvedCachePath;
                const sameImportedItem = target
                    && entry.mediaType === target.mediaType
                    && entry.sourcePath === target.sourcePath
                    && entry.sourceSize === target.sourceSize
                    && entry.sourceMtimeMs === target.sourceMtimeMs;
                if (!sameCachedFile && !sameImportedItem) {
                    return entry;
                }
                matched = true;
                return {
                    ...entry,
                    sourceName: nextName
                };
            });

            if (!matched) {
                nextEntries.push(await this.createOrphanCacheEntry(resolvedCachePath, nextName));
            }

            await this.writeCacheManifest(nextEntries);
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error?.message || 'Failed to rename cached video'};
        }
    }

    @IpcHandle('immersiveBackground:deleteCachedVideo')
    async deleteCachedVideo(cachePath: string): Promise<{success: boolean; error?: string}> {
        try {
            const resolvedCachePath = this.resolveCacheFilePath(cachePath);
            const entries = await this.readCacheManifest();
            const target = entries.find(entry => entry.cachePath === resolvedCachePath);
            const pathsToDelete = new Set<string>([resolvedCachePath]);
            const nextEntries = entries.filter(entry => {
                const sameCachedFile = entry.cachePath === resolvedCachePath;
                const sameImportedItem = target
                    && entry.mediaType === target.mediaType
                    && entry.sourcePath === target.sourcePath
                    && entry.sourceSize === target.sourceSize
                    && entry.sourceMtimeMs === target.sourceMtimeMs;
                if (sameCachedFile || sameImportedItem) {
                    pathsToDelete.add(entry.cachePath);
                    return false;
                }
                return true;
            });

            for (const filePath of pathsToDelete) {
                await this.removeIfExists(filePath);
            }
            await this.writeCacheManifest(nextEntries);
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error?.message || 'Failed to delete cached video'};
        }
    }

    private addCacheEntryToGroup(grouped: Map<string, CacheListItem>, entry: CacheManifestEntry): void {
        const key = `${entry.mediaType}\n${entry.sourcePath}\n${entry.sourceSize}\n${entry.sourceMtimeMs}`;
        let item = grouped.get(key);
        if (!item) {
            item = {
                mediaType: entry.mediaType,
                sourcePath: entry.sourcePath,
                sourceName: entry.sourceName,
                sourceSize: entry.sourceSize,
                sourceMtimeMs: entry.sourceMtimeMs,
                previewPath: entry.previewPath || '',
                qualities: []
            };
            grouped.set(key, item);
        }

        const existingQuality = item.qualities.find(q => q.quality === entry.quality);
        if (!existingQuality || existingQuality.createdAt < entry.createdAt) {
            item.qualities = item.qualities.filter(q => q.quality !== entry.quality);
            item.qualities.push({
                quality: entry.quality,
                presetVersion: entry.presetVersion,
                cachePath: entry.cachePath,
                cacheSize: entry.cacheSize,
                previewPath: entry.previewPath || '',
                createdAt: entry.createdAt
            });
        }
    }

    private async scanOrphanCacheEntries(knownCachePaths: Set<string>): Promise<CacheManifestEntry[]> {
        try {
            const cacheDir = this.getCacheDir();
            const files = await fs.promises.readdir(cacheDir, {withFileTypes: true});
            const entries: CacheManifestEntry[] = [];
            const knownPreviewPaths = new Set<string>();
            for (const file of files) {
                if (!file.isFile()) {
                    continue;
                }

                const cachePath = path.join(cacheDir, file.name);
                if (knownCachePaths.has(cachePath) || file.name.endsWith('.tmp.mp4')) {
                    continue;
                }

                const ext = path.extname(file.name).toLowerCase();
                if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
                    const entry = await this.createOrphanCacheEntry(cachePath, this.getDefaultOrphanCacheName(file.name), 'video');
                    if (entry.previewPath) {
                        knownPreviewPaths.add(path.resolve(entry.previewPath));
                    }
                    entries.push(entry);
                }
            }

            for (const file of files) {
                if (!file.isFile()) {
                    continue;
                }

                const cachePath = path.join(cacheDir, file.name);
                if (knownCachePaths.has(cachePath) || file.name.endsWith('.tmp.jpg') || file.name.endsWith('.tmp.mp4')) {
                    continue;
                }

                const ext = path.extname(file.name).toLowerCase();
                if (SUPPORTED_IMAGE_EXTENSIONS.has(ext) && !knownPreviewPaths.has(path.resolve(cachePath))) {
                    entries.push(await this.createOrphanCacheEntry(cachePath, this.getDefaultOrphanCacheName(file.name), 'image'));
                }
            }
            return entries;
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    private inferOrphanCacheQuality(size: number): ImmersiveCacheQuality {
        return size >= 45 * 1024 * 1024 ? 'quality' : 'smooth';
    }

    private async createOrphanCacheEntry(
        cachePath: string,
        sourceName: string,
        mediaType: ImmersiveCacheMediaType = 'video'
    ): Promise<CacheManifestEntry> {
        const stat = await fs.promises.stat(cachePath);
        const quality = mediaType === 'image' ? 'source' : this.inferOrphanCacheQuality(stat.size);
        return {
            mediaType,
            sourcePath: cachePath,
            sourceName,
            sourceSize: stat.size,
            sourceMtimeMs: stat.mtimeMs,
            quality,
            presetVersion: quality === 'source'
                ? 'immersive-bg-source'
                : (quality === 'smooth' ? VIDEO_PRESETS.smooth.version : VIDEO_PRESETS.quality.version),
            cachePath,
            cacheSize: stat.size,
            previewPath: mediaType === 'video' ? await this.ensureVideoPreview(cachePath).catch(() => '') : cachePath,
            createdAt: stat.mtimeMs
        };
    }

    private getDefaultOrphanCacheName(fileName: string): string {
        return `\u5386\u53f2\u7f13\u5b58 ${fileName.slice(0, 8)}`;
    }

    private normalizeCacheEntry(entry: Partial<CacheManifestEntry>): CacheManifestEntry | null {
        if (!entry || typeof entry.cachePath !== 'string' || typeof entry.sourcePath !== 'string') {
            return null;
        }

        const ext = path.extname(entry.cachePath).toLowerCase();
        const mediaType = entry.mediaType === 'image' || entry.mediaType === 'video'
            ? entry.mediaType
            : (SUPPORTED_IMAGE_EXTENSIONS.has(ext) ? 'image' : 'video');
        const quality = entry.quality === 'source' || entry.quality === 'smooth' || entry.quality === 'quality'
            ? entry.quality
            : (mediaType === 'image' ? 'source' : this.inferOrphanCacheQuality(Number(entry.cacheSize) || 0));

        return {
            mediaType,
            sourcePath: entry.sourcePath,
            sourceName: typeof entry.sourceName === 'string' && entry.sourceName ? entry.sourceName : path.basename(entry.sourcePath),
            sourceSize: Number(entry.sourceSize) || 0,
            sourceMtimeMs: Number(entry.sourceMtimeMs) || 0,
            quality,
            presetVersion: typeof entry.presetVersion === 'string' ? entry.presetVersion : '',
            cachePath: entry.cachePath,
            cacheSize: Number(entry.cacheSize) || 0,
            previewPath: typeof entry.previewPath === 'string' ? entry.previewPath : '',
            createdAt: Number(entry.createdAt) || 0
        };
    }

    private resolveCacheFilePath(cachePath: string): string {
        if (!cachePath || typeof cachePath !== 'string') {
            throw new Error('Invalid cache path');
        }

        const cacheDir = path.resolve(this.getCacheDir());
        const resolvedCachePath = path.resolve(cachePath);
        const relativePath = path.relative(cacheDir, resolvedCachePath);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            throw new Error('Cache path is outside immersive cache directory');
        }
        return resolvedCachePath;
    }

    private getCacheDir(): string {
        return path.join(app.getPath('userData'), 'immersive-bg-cache');
    }

    private getManifestPath(): string {
        return path.join(this.getCacheDir(), 'manifest.json');
    }

    private async readCacheManifest(): Promise<CacheManifestEntry[]> {
        try {
            const content = await fs.promises.readFile(this.getManifestPath(), 'utf8');
            const parsed = JSON.parse(content.replace(/^\uFEFF/, ''));
            return Array.isArray(parsed?.entries) ? parsed.entries : [];
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return [];
            }
            console.warn('ImmersiveBackground: ignoring invalid manifest', error?.message || error);
            return [];
        }
    }

    private async writeCacheManifest(entries: CacheManifestEntry[]): Promise<void> {
        await fs.promises.mkdir(this.getCacheDir(), {recursive: true});
        await fs.promises.writeFile(this.getManifestPath(), JSON.stringify({entries}, null, 2), 'utf8');
    }

    private async upsertCacheManifest(
        sourcePath: string,
        sourceStat: fs.Stats,
        quality: ImmersiveCacheQuality,
        preset: Pick<VideoPreset, 'version'>,
        cachePath: string,
        mediaType: ImmersiveCacheMediaType,
        sourceName?: string,
        previewPath?: string
    ): Promise<void> {
        const cacheStat = await fs.promises.stat(cachePath);
        const entries = await this.readCacheManifest();
        const nextEntry: CacheManifestEntry = {
            mediaType,
            sourcePath,
            sourceName: sourceName || path.basename(sourcePath),
            sourceSize: sourceStat.size,
            sourceMtimeMs: sourceStat.mtimeMs,
            quality,
            presetVersion: preset.version,
            cachePath,
            cacheSize: cacheStat.size,
            previewPath: previewPath || '',
            createdAt: Date.now()
        };
        const filtered = entries.filter(entry => !(
            entry.sourcePath === sourcePath
            && entry.sourceSize === sourceStat.size
            && entry.sourceMtimeMs === sourceStat.mtimeMs
            && entry.quality === quality
            && entry.presetVersion === preset.version
        ));
        filtered.push(nextEntry);
        await this.writeCacheManifest(filtered);
    }

    private async findSourceDisplayName(sourcePath: string): Promise<string | undefined> {
        const entries = await this.readCacheManifest();
        const match = entries.find(entry => entry.sourcePath === sourcePath && typeof entry.sourceName === 'string' && entry.sourceName);
        return match?.sourceName;
    }

    private qualityOrder(quality: ImmersiveCacheQuality): number {
        if (quality === 'source') {
            return 0;
        }
        if (quality === 'smooth') {
            return 1;
        }
        return 2;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }

    private async removeIfExists(filePath: string): Promise<void> {
        try {
            await fs.promises.unlink(filePath);
        } catch (error: any) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    private async probeDuration(inputPath: string): Promise<number | null> {
        const ffprobePath = process.env.MUSICBOX_FFPROBE_PATH || 'ffprobe';
        const args = [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            inputPath
        ];

        try {
            const output = await this.runProcess(ffprobePath, args);
            const duration = Number.parseFloat(output.trim());
            return Number.isFinite(duration) && duration > 0 ? duration : null;
        } catch {
            return null;
        }
    }

    private async transcodeVideo(
        inputPath: string,
        outputPath: string,
        duration: number | null,
        preset: VideoPreset
    ): Promise<void> {
        const ffmpegPath = process.env.MUSICBOX_FFMPEG_PATH || 'ffmpeg';
        const shouldExtendLoop = duration !== null && duration > 0 && duration < preset.minLoopSeconds;
        const args = [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            ...(shouldExtendLoop ? ['-stream_loop', String(Math.ceil(preset.minLoopSeconds / duration) - 1)] : []),
            '-i',
            inputPath,
            ...(shouldExtendLoop ? ['-t', String(preset.minLoopSeconds)] : []),
            '-an',
            '-vf',
            `scale='min(${preset.maxWidth},iw)':-2:flags=lanczos,fps=60,format=yuv420p`,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-profile:v',
            'high',
            '-level',
            preset.level,
            '-b:v',
            preset.bitrate,
            '-maxrate',
            preset.maxrate,
            '-bufsize',
            preset.bufsize,
            '-movflags',
            '+faststart',
            outputPath
        ];

        await this.runProcess(ffmpegPath, args);
    }

    private async ensureVideoPreview(inputPath: string): Promise<string> {
        const cacheDir = this.getCacheDir();
        await fs.promises.mkdir(cacheDir, {recursive: true});
        const stat = await fs.promises.stat(inputPath);
        const previewKey = crypto
            .createHash('sha1')
            .update(`preview-v1\n${inputPath}\n${stat.size}\n${stat.mtimeMs}`)
            .digest('hex');
        const previewPath = path.join(cacheDir, `${previewKey}.jpg`);
        if (await this.fileExists(previewPath)) {
            return previewPath;
        }

        const tempPath = path.join(cacheDir, `${previewKey}.tmp.jpg`);
        await this.removeIfExists(tempPath);
        const ffmpegPath = process.env.MUSICBOX_FFMPEG_PATH || 'ffmpeg';
        const args = [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-ss',
            '1',
            '-i',
            inputPath,
            '-frames:v',
            '1',
            '-vf',
            `scale='min(480,iw)':-2:flags=bicubic`,
            '-q:v',
            '5',
            tempPath
        ];
        await this.runProcess(ffmpegPath, args);
        await fs.promises.rename(tempPath, previewPath);
        return previewPath;
    }

    private async runProcess(command: string, args: string[]): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            const child = spawn(command, args, {windowsHide: true});
            let stderr = '';
            let stdout = '';

            child.stdout.on('data', chunk => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', chunk => {
                stderr += chunk.toString();
            });

            child.on('error', error => {
                reject(new Error(`ffmpeg unavailable: ${error.message}`));
            });

            child.on('close', code => {
                if (code === 0) {
                    resolve(stdout);
                    return;
                }
                reject(new Error((stderr || `ffmpeg exited with code ${code}`).trim()));
            });
        });
    }
}
