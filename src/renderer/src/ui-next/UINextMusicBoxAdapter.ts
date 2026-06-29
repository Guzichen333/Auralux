import type {Track} from '@api/types/track';
import {unifiedSearchService} from '@/features/library/service/UnifiedSearchService';
import {libraryController} from '@/features/library/LibraryController';
import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {playbackController} from '@/features/playback/PlaybackController';
import {PLAYBACK_QUEUE_CACHE_KEY, PLAYBACK_STATE_CACHE_KEY} from '@/features/playback/service/PlaybackPersistence';
import {recentPlaybackHistoryService} from '@/features/playback/service/RecentPlaybackHistoryService';
import {netEaseApiClient, netEaseAuthService, netEaseLocalMatchService, netEaseMigrationReportService, netEaseRecommendationService, netEaseSyncStateService} from '@/features/netease/service';
import type {NetEaseLocalMatch, NetEaseLocalMatchStatus} from '@/features/netease/service';
import type {NetEaseMigrationReport} from '@/features/netease/service/NetEaseMigrationReportService';
import type {NetEasePlaylistSyncState} from '@/features/netease/service/NetEaseSyncStateService';
import type {NetEasePlaylist} from '@/features/netease/types';
import {appFileImportActionService, appModalService, trayShellService, updateService} from '@/features/appShell/service';
import {desktopLyricsService} from '@/features/desktopLyrics/service';
import {lyricsContentService} from '@/features/mediaAssets/service/LyricsContentService';
import {windowGateway} from '@/infrastructure/electron';
import {cacheManager} from '@/shared/cache';
import {playlistCoverManifest} from './playlistCoverManifest';
import type {UINextPlaylistLike} from './playlistCoverTypes';
import {showToast} from '@utils/index.js';
import {
    appInfoSettingsService,
    audioEngineSettingsController,
    cacheSettingsService,
    displayModeSettingsController,
    embeddedLyricsDiagnosticsService,
    hardwareAccelerationSettingsController,
    lyricsAppearanceSettingsService,
    mediaDirectorySettingsService,
    musicFolderSettingsController,
    musicFolderSettingsService,
    trackCoverDisplayPreferenceService
} from '@/features/settings/service';
import type {NetEaseCloudMusic} from '@ui/widgets/NetEaseCloudMusic';
import type {CreatePlaylistDialog} from '@ui/dialogs/CreatePlaylistDialog';
import type {PlaybackStoreChange} from '@/features/playback/PlaybackStore';
import type {MusicBoxSettings} from '@api/types/settings';
import type {LyricLine} from '@api/types/lyrics';
import type {PlaybackStateSnapshot, PlayMode} from '@api/types/playback';

type UINextSource = 'local' | 'netease';
type UINextSearchFilter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';
type UINextImmersiveLyricsMode = 'standard' | 'wrap' | 'fragments' | 'rail';
type UINextImmersiveVisualizerStyle = 'classic' | 'energy' | 'pulse' | 'orbit';
type UINextImmersiveBackgroundType = 'cover' | 'image' | 'video' | 'sonic-topography';
type UINextImmersiveVideoQuality = 'smooth' | 'quality' | 'original';

const IMMERSIVE_VIDEO_CACHE_PRESETS: Record<Exclude<UINextImmersiveVideoQuality, 'original'>, string> = {
    smooth: 'immersive-bg-v2-smooth-1080p60-h264-24s-min',
    quality: 'immersive-bg-v3-quality-1440p60-h264-24s-min'
};
const MATCHED_LOCAL_PLAYBACK_CONFIDENCE = 0.92;

interface UINextPlaybackRollbackSnapshot {
    playlist: Track[];
    currentIndex: number;
    currentTrack: Track | null;
    position: number;
    isPlaying: boolean;
}

interface UINextImmersiveSettings {
    lyricsMode: UINextImmersiveLyricsMode;
    visualizerStyle: UINextImmersiveVisualizerStyle;
    backgroundType: UINextImmersiveBackgroundType;
    backgroundSrc?: string;
    backgroundOriginalSrc?: string;
    backgroundOptimizedSrc?: string;
    backgroundOptimizedPreset?: string;
    backgroundQuality?: UINextImmersiveVideoQuality;
}

interface UINextCachedVideo {
    mediaType: 'image' | 'video';
    sourcePath: string;
    sourceName: string;
    sourceSize: number;
    sourceMtimeMs: number;
    previewPath?: string;
    qualities: Array<{
        quality: 'source' | Exclude<UINextImmersiveVideoQuality, 'original'>;
        presetVersion: string;
        cachePath: string;
        cacheSize: number;
        previewPath?: string;
        createdAt: number;
    }>;
}

interface UINextTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: number;
    cover?: string | null;
    source: UINextSource;
    liked?: boolean;
    cacheStatusLabel?: string;
    sourceStatusLabel?: string;
    offlinePlayable?: boolean;
    offlineStatusLabel?: string;
    coverCacheStatus?: string;
    lyricsCacheStatus?: string;
    localMatchStatus?: NetEaseLocalMatchStatus;
    matchConfidence?: number;
    localMatchLabel?: string;
    matchedLocalPlayback?: boolean;
    filePath: string;
    originalTrack: Track;
}

interface UINextPlaybackQueueMemory {
    playlist?: Track[];
    currentIndex?: number;
    playMode?: PlayMode;
}

interface UINextPlaybackMemoryCandidate {
    playlist: Track[];
    currentIndex: number;
    position: number;
    playMode?: PlayMode;
}

interface UINextPlaylist {
    id: string;
    name: string;
    description?: string;
    cover?: string;
    coverSourceUrl?: string;
    trackCount: number;
    playCount?: number;
    source: UINextSource;
    externalId?: string;
    externalType?: string;
    updatedAt?: string;
    trackIds: string[];
}

interface UINextSearchEntity {
    id: string;
    type: 'artist' | 'album' | 'playlist';
    title: string;
    subtitle: string;
    source: UINextSource;
    cover?: string | null;
    playlistId?: string;
}

interface UINextMigrationDashboardState {
    summary: {
        reportCount: number;
        completedCount: number;
        partialCount: number;
        failedCount: number;
        undoneCount: number;
        cancelledCount: number;
        added: number;
        existing: number;
        skipped: number;
        failed: number;
        duplicates: number;
        lastActivityText: string;
    };
    habitSummary: UINextMigrationHabitSummary;
    syncSummary: {
        total: number;
        success: number;
        failed: number;
        conflict: number;
        retryable: number;
    };
    syncStates: Array<NetEasePlaylistSyncState & {playlistName?: string; lastActivityText: string}>;
    reports: Array<NetEaseMigrationReport & {createdAtText: string; statusLabel: string; kindLabel: string}>;
    expandedReportIds: string[];
    diagnostics: UINextMigrationDiagnosticsState;
}

interface UINextMigrationHabitSummary {
    likedPlaylistCount: number;
    createdPlaylistCount: number;
    favoritePlaylistCount: number;
    recentPlaybackCount: number;
    migratedTrackCount: number;
    failureCount: number;
    retryableCount: number;
    confidenceLabel: string;
    actions: Array<{
        label: string;
        detail: string;
        tone: 'success' | 'warning' | 'danger' | 'info';
    }>;
}

interface UINextMigrationDiagnosticsState {
    generatedAtText: string;
    apiStatus: string;
    loginStatus: string;
    reportSummary: string;
    syncSummary: string;
    failedReportCount: number;
    retryableSyncCount: number;
    redactionNotice: string;
    copyText: string;
}

interface UINextNetEaseAccountCenterState {
    status: string;
    nickname: string;
    avatarUrl: string;
    lastSyncText: string;
    syncStatus: string;
    likedPlaylistCount: number;
    createdPlaylistCount: number;
    favoritePlaylistCount: number;
    recentPlaybackCount: number;
    migratedTrackCount: number;
    failureCount: number;
    retryableCount: number;
}

interface UINextDailyMusicDesktopState {
    continueTrack: UINextTrack | null;
    dailyRecommendations: UINextTrack[];
    recentlyObsessed: UINextTrack[];
    syncSummary: {
        statusText: string;
        detailText: string;
        actionText: string;
        warningCount: number;
    };
    insights: Array<{
        label: string;
        value: string;
    }>;
}

type UINextSettingsKey =
    | 'autoplay'
    | 'rememberPosition'
    | 'playerTheme'
    | 'regionTone'
    | 'desktopLyrics'
    | 'showTrackCovers'
    | 'gaplessPlayback'
    | 'exclusiveMode'
    | 'wasapiShareMode'
    | 'networkDriveEnabled'
    | 'lyricsDirectory'
    | 'coverCacheDirectory'
    | 'lyricsHighlightOpacity'
    | 'lyricsHighlightColor'
    | 'desktopLyricsDisplayMode'
    | 'desktopLyricsLayoutMode'
    | 'desktopLyricsThemeColor'
    | 'desktopLyricsFontColor'
    | 'desktopLyricsOpacity'
    | 'desktopLyricsFontSize'
    | 'miniModeFontColor'
    | 'miniModeHighlightColor'
    | 'miniModeFontSize'
    | 'systemTray'
    | 'trayCloseBehavior'
    | 'trayStartMinimized';

interface UINextSettingsState {
    autoplay: boolean;
    rememberPosition: boolean;
    playerTheme: string;
    regionTone: string;
    desktopLyrics: boolean;
    showTrackCovers: boolean;
    gaplessPlayback: boolean;
    exclusiveMode: boolean;
    wasapiShareMode: string;
    wasapiAvailable: boolean;
    networkDriveEnabled: boolean;
    musicFolders: string[];
    autoScanEnabled: boolean;
    scanFrequency: string;
    lyricsDirectory: string;
    coverCacheDirectory: string;
    cacheDescription: string;
    cacheBusy: string;
    lyricsHighlightOpacity: number;
    lyricsHighlightColor: string;
    desktopLyricsDisplayMode: string;
    desktopLyricsLayoutMode: string;
    desktopLyricsThemeColor: string;
    desktopLyricsFontColor: string;
    desktopLyricsOpacity: number;
    desktopLyricsFontSize: number;
    desktopLyricsSettings: Record<string, string | number>;
    miniModeFontColor: string;
    miniModeHighlightColor: string;
    miniModeFontSize: number;
    hardwareAcceleration: boolean;
    systemTray: boolean;
    trayCloseBehavior: string;
    trayStartMinimized: boolean;
}

interface UINextShellState {
    currentTrack: UINextTrack | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    volume: number;
    muted: boolean;
    playMode: string;
    queue: {
        tracks: UINextTrack[];
        currentIndex: number;
    };
    playbackCacheState?: {
        sourceStatusLabel: string;
        cacheStatusLabel: string;
    };
    searchResults: {
        local: UINextTrack[];
        netease: UINextTrack[];
        entities?: {
            artists: UINextSearchEntity[];
            albums: UINextSearchEntity[];
            playlists: UINextSearchEntity[];
        };
    };
    searchFilter: UINextSearchFilter;
    searchFilters: Array<{id: UINextSearchFilter; label: string}>;
    searchHistory: string[];
    searchSuggestions: string[];
    libraryCount: number;
    searchSelectedIndex: number;
    searchFocused: boolean;
    neteaseStatus: string;
    neteaseAvatarUrl?: string;
    neteaseNickname?: string;
    neteaseLastSyncText?: string;
    neteaseSyncStatus?: string;
    neteaseAssetMigrationRunning?: boolean;
    neteaseAccountCenter?: UINextNetEaseAccountCenterState;
    migrationDashboard?: UINextMigrationDashboardState;
    activePlaylistId: string | null;
    offlineFilter?: boolean;
    view: string;
    syncing: boolean;
    playlistOpenState?: {
        playlistId: string;
        status: 'idle' | 'loading' | 'ready' | 'error';
        message: string;
    };
    queueOpen?: boolean;
    viewTracks?: UINextTrack[];
    homeRecent?: UINextTrack[];
    homeRecommended?: UINextPlaylist[];
    homeNetEase?: UINextPlaylist[];
    homeFavorites?: UINextTrack[];
    homeDailyDesktop?: UINextDailyMusicDesktopState;
    songDetailDrawer?: {
        open: boolean;
        track: UINextTrack | null;
    };
    settings?: UINextSettingsState;
    immersiveLyrics?: LyricLine[];
    immersiveLyricsLoading?: boolean;
    immersiveLyricsStatus?: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
    immersiveLyricsError?: string;
    immersiveLyricsMode?: UINextImmersiveLyricsMode;
    immersiveVisualizerStyle?: UINextImmersiveVisualizerStyle;
    immersiveBackgroundPanelMode?: 'regular' | 'sonic';
    immersiveBackground?: {
        type: UINextImmersiveBackgroundType;
        src?: string;
        originalSrc?: string;
        status?: 'idle' | 'optimizing' | 'optimized' | 'failed';
        statusText?: string;
        importBusy?: boolean;
        quality?: UINextImmersiveVideoQuality;
    };
    immersiveCachedVideos?: UINextCachedVideo[];
}

interface UINextShell {
    mock: {
        tracks: UINextTrack[];
        playlists: UINextPlaylist[];
        queue: {
            tracks: UINextTrack[];
            currentIndex: number;
        };
        byId?(trackId: string): UINextTrack | null;
        playlistById?(playlistId: string): UINextPlaylist | null;
        tracksForPlaylist(playlistId: string): UINextTrack[];
    };
    state: UINextShellState;
    render(): void;
    renderNetEaseAccountStatus?(): void;
    recordSearchHistory?(query: string): void;
    _updateProgressOnly?(): void;
    _scheduleImmersiveProgressUpdate?(): void;
    _updateImmersiveProgressOnly?(): void;
    _resetImmersiveVisualizerState?(): void;
    _ensureImmersiveSonicBackgroundLoop?(): void;
    _updateVolumeOnly?(): void;
    _applyLiked?(trackId: string, liked: boolean): void;
    renderTrackLikeState?(trackId: string, liked: boolean): boolean;
    setPlaylistOpenState?(next: {
        playlistId: string;
        status: 'idle' | 'loading' | 'ready' | 'error';
        message: string;
    }): void;
    completeMigrationOnboarding?(reason?: string): void;
    confirm?(options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        danger?: boolean;
    }): Promise<boolean>;
}

declare global {
    interface Window {
        __newShellNetEase?: NetEaseCloudMusic;
        __newShellAddToPlaylistDialog?: {
            show(track: Track): Promise<void>;
        };
        __newShellCreatePlaylistDialog?: CreatePlaylistDialog;
        __mbImmersiveBackgroundError?: () => void;
    }
}

export class UINextMusicBoxAdapter {
    private readonly shell: UINextShell;
    private readonly trackMap = new Map<string, Track>();
    private readonly playlistTrackCache = new Map<string, UINextTrack[]>();
    private readonly libraryTrackById = new Map<string, Track>();
    private readonly neteaseRecommendationCoverHydrationKeys = new Set<string>();
    private libraryTracks: Track[] = [];
    private searchSession = 0;
    private playbackRequestSeq = 0;
    private lastPlaybackCoverRefreshKey = '';
    private lastNonZeroVolume = 0.7;
    private lastDesktopLyricsTrackPath: string | null = null;
    private lastDesktopLyricsPositionSync = 0;
    private immersiveLyricsSession = 0;
    private immersiveBackgroundErrorShown = false;
    private immersiveVideoPreparePath = '';
    private lastNetEaseSyncAt = 0;
    private netEaseStatusRefreshSession = 0;
    private netEaseStatusRefreshPromise: Promise<void> | null = null;
    private netEaseUnavailableRecoveryTimer = 0;
    private librarySnapshotPromise: Promise<void> | null = null;
    private librarySnapshotReconcileTimer = 0;
    private netEaseAssetMigrationInFlight = false;
    private neteaseRecommendationRefreshPromise: Promise<void> | null = null;
    private neteaseRecommendedSongs: UINextTrack[] = [];
    private neteaseRecommendedPlaylists: NetEasePlaylist[] = [];
    private searchDebounceTimer = 0;
    private readonly searchDebounceMs = 180;
    private playbackStateUnsubscribe: (() => void) | null = null;
    private libraryUpdatedUnsubscribe: (() => void) | null = null;
    private netEaseApiReadyUnsubscribe: (() => void) | null = null;
    private netEaseApiUnavailableUnsubscribe: (() => void) | null = null;
    private trayActionUnsubscribe: (() => void) | null = null;
    private initialShellReadyPromise: Promise<void> | null = null;
    private readonly handleNetEaseLoginStatusChanged = (): void => {
        void this.syncNetEaseStatus(0, {force: true});
        void this.refreshNetEaseRecommendations({force: true});
    };

    constructor(shell: UINextShell) {
        this.shell = shell;
        desktopLyricsService.configure({
            getPlaybackSnapshot: () => playbackController.getPlaybackSnapshot()
        });
        this.loadSettingsSnapshot();
        this.syncPlaybackState();
        void this.restorePlaybackMemory();
        void trayShellService.initSystemTray();
        this.bindTrayActions();
        void this.syncTrayPlaybackState();
        this.initialShellReadyPromise = this.requestLibrarySnapshotRefresh()
            .then(() => {
                void this.refreshInitialNetEaseStateInBackground();
            })
            .then(() => undefined);

        this.playbackStateUnsubscribe = playbackController.subscribe((_state, change) => {
            if (this.applyLightweightPlaybackUpdate(change)) {
                return;
            }

            this.syncPlaybackState();
            void this.syncTrayPlaybackState();
            void this.syncDesktopLyricsForChange(change);
            if (change.type === 'trackChanged' && this.shell.state.view === 'immersive-player') {
                this.shell._resetImmersiveVisualizerState?.();
                void this.loadCurrentLyrics();
            }
            this.shell.render();
        });

        this.libraryUpdatedUnsubscribe = libraryController.onLibraryUpdated(() => {
            void this.requestLibrarySnapshotRefresh();
        });

        this.netEaseApiReadyUnsubscribe = window.electronAPI?.netease?.onApiReady((data) => {
            netEaseApiClient.setApiEndpoint(data.endpoint);
            void this.syncNetEaseStatus(0, {force: true});
            void this.refreshNetEaseRecommendations({force: true});
        }) || null;
        this.netEaseApiUnavailableUnsubscribe = window.electronAPI?.netease?.onApiUnavailable((data) => {
            netEaseApiClient.setApiEndpoint(data.endpoint);
            this.handleNetEaseApiUnavailable();
        }) || null;
        window.addEventListener('netease-login-status-changed', this.handleNetEaseLoginStatusChanged);

        window.__mbImmersiveBackgroundError = () => {
            if (!this.immersiveBackgroundErrorShown) {
                this.immersiveBackgroundErrorShown = true;
                showToast('\u80cc\u666f\u6587\u4ef6\u65e0\u6cd5\u8bbf\u95ee\uff0c\u5df2\u56de\u9000\u5230\u5c01\u9762\u80cc\u666f', 'error', 2600);
            }
            this.useCoverImmersiveBackground();
        };
    }

    private bindTrayActions(): void {
        if (this.trayActionUnsubscribe) {
            return;
        }

        this.trayActionUnsubscribe = window.electronAPI?.tray?.onAction?.((action: string, payload?: unknown) => {
            switch (action) {
                case 'tray:previous':
                    this.previousTrack();
                    break;
                case 'tray:play-pause':
                    void playbackController.toggleCurrentPlayback();
                    break;
                case 'tray:next':
                    this.nextTrack();
                    break;
                case 'tray:favorite':
                    if (this.shell.state.currentTrack) {
                        this.toggleLike(this.shell.state.currentTrack);
                    }
                    break;
                case 'tray:set-play-mode':
                    playbackController.setPlayMode(payload as PlayMode);
                    this.syncPlaybackState();
                    void this.syncTrayPlaybackState();
                    this.shell.render();
                    break;
                case 'tray:open-immersive':
                    this.openImmersivePlayer();
                    break;
                case 'tray:open-desktop-lyrics':
                    void this.toggleDesktopLyrics();
                    break;
                case 'tray:open-settings':
                    this.openSettings();
                    break;
            }
        }) || null;
    }

    dispose(): void {
        this.playbackStateUnsubscribe?.();
        this.playbackStateUnsubscribe = null;
        this.libraryUpdatedUnsubscribe?.();
        this.libraryUpdatedUnsubscribe = null;
        this.netEaseApiReadyUnsubscribe?.();
        this.netEaseApiReadyUnsubscribe = null;
        this.netEaseApiUnavailableUnsubscribe?.();
        this.netEaseApiUnavailableUnsubscribe = null;
        this.trayActionUnsubscribe?.();
        this.trayActionUnsubscribe = null;
        window.removeEventListener('netease-login-status-changed', this.handleNetEaseLoginStatusChanged);
        if (this.netEaseUnavailableRecoveryTimer) {
            window.clearTimeout(this.netEaseUnavailableRecoveryTimer);
            this.netEaseUnavailableRecoveryTimer = 0;
        }
        if (this.librarySnapshotReconcileTimer) {
            window.clearTimeout(this.librarySnapshotReconcileTimer);
            this.librarySnapshotReconcileTimer = 0;
        }
        if (this.searchDebounceTimer) {
            window.clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = 0;
        }
        if (window.__mbImmersiveBackgroundError) {
            delete window.__mbImmersiveBackgroundError;
        }
        playlistCoverManifest.dispose();
    }

    search(query: string): void {
        const trimmed = query.trim();
        const session = ++this.searchSession;
        if (this.searchDebounceTimer) {
            window.clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = 0;
        }

        if (!trimmed) {
            this.shell.state.searchResults = {local: [], netease: [], entities: {artists: [], albums: [], playlists: []}};
            this.shell.state.searchSelectedIndex = 0;
            this.shell.state.searchSuggestions = this.buildSearchSuggestions(trimmed, []);
            this.shell.render();
            return;
        }

        this.searchDebounceTimer = window.setTimeout(() => {
            this.searchDebounceTimer = 0;
            this.runSearch(trimmed, session);
        }, this.searchDebounceMs);
    }

    private runSearch(trimmed: string, session: number): void {
        void unifiedSearchService.search(trimmed).then((results) => {
            if (session !== this.searchSession) {
                return;
            }

            const local: UINextTrack[] = [];
            const netease: UINextTrack[] = [];

            results.forEach((result) => {
                const track = this.toUINextTrack(result.track, result.source);
                if (result.source === 'netease') {
                    netease.push(track);
                } else {
                    local.push(track);
                }
            });

            const allTracks = [...local, ...netease];
            this.shell.state.searchResults = {
                local,
                netease,
                entities: this.buildSearchEntities(trimmed, allTracks)
            };
            this.shell.state.searchSuggestions = this.buildSearchSuggestions(trimmed, allTracks);
            this.shell.state.searchSelectedIndex = 0;
            this.recordSearchHistory(trimmed);
            this.shell.render();
        }).catch((error) => {
            console.error('[ui-next] search failed', error);
            if (session === this.searchSession) {
                this.shell.state.searchResults = {local: [], netease: [], entities: {artists: [], albums: [], playlists: []}};
                this.shell.render();
            }
        });
    }

    playTrack(track: UINextTrack): void {
        const original = this.resolvePlaybackTrack(track);
        const queue = this.resolveQueueForTrack(original);
        const startIndex = Math.max(0, queue.findIndex((item) => item.filePath === original.filePath));

        void this.playPreparedTrack(original, queue, startIndex, 'playTrack');
    }

    pause(): void {
        void playbackController.pause();
    }

    resume(): void {
        void playbackController.play();
    }

    seek(ratio: number, dragging: boolean): void {
        if (!Number.isFinite(ratio)) {
            return;
        }

        const safeRatio = Math.max(0, Math.min(1, ratio));
        const duration = this.shell.state.duration || playbackController.getDurationSnapshot() || 0;
        const nextPosition = Math.max(0, Math.min(duration, safeRatio * duration));
        this.shell.state.position = nextPosition;

        if (!dragging) {
            void playbackController.seek(nextPosition);
        }
    }

    setVolume(ratio: number): void {
        const volume = Math.max(0, Math.min(1, ratio));
        if (volume > 0) {
            this.lastNonZeroVolume = volume;
        }

        void playbackController.setVolume(volume);
        this.shell.state.volume = volume;
        this.shell.state.muted = volume === 0;
    }

    toggleMute(): void {
        const currentVolume = playbackController.getVolume();
        const nextVolume = currentVolume > 0 ? 0 : this.lastNonZeroVolume;
        void playbackController.setVolume(nextVolume);
    }

    nextTrack(): void {
        void playbackController.nextTrack();
    }

    previousTrack(): void {
        void playbackController.previousTrack();
    }

    playQueueIndex(index: number): void {
        const queue = playbackController.getPlaylist();
        const track = queue[index];
        if (!track) {
            return;
        }

        void this.playPreparedTrack(track, queue, index, 'playQueueIndex');
    }

    removeQueueIndex(index: number): void {
        const queue = playbackController.getPlaylist();
        if (index < 0 || index >= queue.length || queue.length <= 1) {
            return;
        }

        const state = playbackController.getState();
        const currentIndex = state.currentIndex;
        const nextQueue = queue.filter((_track, trackIndex) => trackIndex !== index);
        const nextIndex = index < currentIndex
            ? Math.max(0, currentIndex - 1)
            : Math.min(currentIndex, nextQueue.length - 1);
        const replacementTrack = nextQueue[nextIndex];

        if (index === currentIndex && replacementTrack) {
            if (state.isPlaying) {
                void this.playPreparedTrack(replacementTrack, nextQueue, nextIndex, 'removeQueueIndex');
            } else {
                void this.loadPreparedTrack(replacementTrack, nextQueue, nextIndex, 'removeQueueIndex');
            }
            return;
        }

        void playbackController.setPlaylist(nextQueue, nextIndex)
            .then(() => this.syncPlaybackState())
            .catch((error) => {
                console.error('[ui-next] removeQueueIndex failed', error);
                this.syncPlaybackState();
            });
    }

    clearQueue(): void {
        const state = playbackController.getState();
        const currentTrack = state.currentTrack;
        if (!currentTrack) {
            void playbackController.setPlaylist([], -1);
            return;
        }

        void playbackController.setPlaylist([currentTrack], 0);
    }

    addToQueue(track: UINextTrack): void {
        const original = this.resolveOriginalTrack(track);
        if (!original?.filePath && !original?.path) {
            showToast('无法添加到播放队列，歌曲路径缺失', 'error', 2200);
            return;
        }

        const queue = playbackController.getPlaylist();
        const currentIndex = playbackController.getCurrentIndex();
        const nextQueue = queue.concat([original]);
        const nextIndex = currentIndex >= 0 && currentIndex < queue.length
            ? currentIndex
            : (nextQueue.length ? 0 : -1);

        void playbackController.setPlaylist(nextQueue, nextIndex)
            .then((success) => {
                if (!success) {
                    showToast('添加到播放队列失败', 'error', 2200);
                    return;
                }
                showToast(`已添加到播放队列：${original.title || track.title || '歌曲'}`, 'success', 1800);
            })
            .catch((error) => {
                console.error('[ui-next] addToQueue failed', error);
                showToast('添加到播放队列失败', 'error', 2200);
            });
    }

    openSongDetail(track: UINextTrack): void {
        if (!track) {
            return;
        }
        const liveTrack = this.shell.mock.byId?.(track.id) || track;
        this.shell.state.songDetailDrawer = {
            open: true,
            track: liveTrack
        };
        this.shell.render();
    }

    togglePlayMode(): void {
        playbackController.togglePlayMode();
        this.syncPlaybackState();
        this.shell.render();
    }

    async toggleDesktopLyrics(): Promise<void> {
        const settings = this.readSettings();
        if (settings.desktopLyrics === false) {
            showToast('\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u5f00\u542f\u684c\u9762\u6b4c\u8bcd', 'info', 2200);
            return;
        }

        try {
            const result = await desktopLyricsService.toggle();
            if (result.success && result.visible) {
                this.lastDesktopLyricsTrackPath = null;
                await desktopLyricsService.syncCurrentState();
            }
            showToast(result.visible ? '\u684c\u9762\u6b4c\u8bcd\u5df2\u663e\u793a' : '\u684c\u9762\u6b4c\u8bcd\u5df2\u9690\u85cf', result.visible ? 'success' : 'info', 1800);
        } catch (error) {
            console.error('[ui-next] toggleDesktopLyrics failed', error);
            showToast('\u684c\u9762\u6b4c\u8bcd\u64cd\u4f5c\u5931\u8d25', 'error', 2200);
        }
    }

    openNetEaseLogin(): void {
        if (window.__newShellNetEase) {
            window.__newShellNetEase.openLoginModal();
            return;
        }
        document.getElementById('netease-status-indicator')?.click();
    }

    retryNetEaseAccountSync(): void {
        void this.retryRetryableNetEaseSyncs();
    }

    refreshNetEaseStatus(): void {
        void this.syncNetEaseStatus(0, {force: true});
    }

    openSettings(_fromHistory = false): void {
        this.loadSettingsSnapshot();
        this.shell.state.view = 'settings';
        this.shell.state.activePlaylistId = null;
        this.shell.render();
    }

    openMigrationDashboard(_fromHistory = false): void {
        this.refreshMigrationDashboardState();
        this.refreshNetEaseAccountCenterState();
        this.shell.state.view = 'migration-dashboard';
        this.shell.state.activePlaylistId = null;
        this.shell.render();
    }

    async retryMigrationDashboardSync(playlistId: string): Promise<void> {
        this.shell.state.syncing = true;
        this.shell.render();

        try {
            const result = await netEaseSyncStateService.retryPlaylistSync(playlistId);
            if (!result.success) {
                showToast(result.error || '网易云同步重试失败', 'error', 2400);
            } else {
                showToast(`同步重试完成，新增 ${result.addedCount} 首`, 'success', 2200);
                this.notifyLibraryChanged();
            }
        } catch (error) {
            console.error('[ui-next] retryMigrationDashboardSync failed', error);
            showToast('网易云同步重试失败', 'error', 2400);
        } finally {
            this.shell.state.syncing = false;
            this.refreshMigrationDashboardState();
            this.shell.render();
        }
    }

    private async retryRetryableNetEaseSyncs(): Promise<void> {
        const retryableStates = Object.values(netEaseSyncStateService.getAllPlaylistSyncStates())
            .filter((state) => state.retryable);

        if (!retryableStates.length) {
            await this.syncNetEaseStatus(0, {force: true});
            this.refreshMigrationDashboardState();
            this.refreshNetEaseAccountCenterState();
            if (typeof this.shell.renderNetEaseAccountStatus === 'function') {
                this.shell.renderNetEaseAccountStatus();
            } else {
                this.shell.render();
            }
            showToast('没有需要重试的网易云同步，已刷新账号状态', 'info', 2200);
            return;
        }

        this.shell.state.syncing = true;
        this.shell.render();

        let successCount = 0;
        let failedCount = 0;

        try {
            for (const state of retryableStates) {
                const result = await netEaseSyncStateService.retryPlaylistSync(state.playlistId);
                if (result.success) {
                    successCount += 1;
                } else {
                    failedCount += 1;
                }
            }

            if (successCount > 0) {
                this.notifyLibraryChanged();
            }

            const message = failedCount > 0
                ? `网易云同步重试完成，成功 ${successCount} 个，失败 ${failedCount} 个`
                : `网易云同步重试完成，成功 ${successCount} 个`;
            showToast(message, failedCount > 0 ? 'warning' : 'success', 2400);
            await this.syncNetEaseStatus(0, {force: true});
        } catch (error) {
            console.error('[ui-next] retryRetryableNetEaseSyncs failed', error);
            showToast('网易云同步重试失败', 'error', 2400);
        } finally {
            this.shell.state.syncing = false;
            this.refreshMigrationDashboardState();
            this.refreshNetEaseAccountCenterState();
            this.shell.render();
        }
    }

    async copyMigrationDiagnostics(): Promise<void> {
        const diagnostics = this.buildMigrationDiagnosticsState(
            netEaseMigrationReportService.getRecentReports(),
            Object.values(netEaseSyncStateService.getAllPlaylistSyncStates())
        );
        this.shell.state.migrationDashboard = {
            ...(this.shell.state.migrationDashboard || this.buildMigrationDashboardState()),
            diagnostics
        };

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(diagnostics.copyText);
                showToast('诊断信息已复制', 'success', 1800);
                return;
            }
        } catch (error) {
            console.error('[ui-next] copyMigrationDiagnostics failed', error);
        }

        showToast('当前环境无法访问剪贴板，请手动选择诊断文本', 'error', 2600);
        this.shell.render();
    }

    openImmersivePlayer(_fromHistory = false): void {
        this.loadImmersiveSettingsSnapshot();
        this.shell.state.view = 'immersive-player';
        this.shell.state.activePlaylistId = null;
        this.shell.state.searchFocused = false;
        this.shell.state.queueOpen = false;
        this.shell.state.immersiveBackgroundPanelMode = 'regular';
        this.shell.render();
        void this.loadCurrentLyrics();
        void this.loadImmersiveCachedVideos();
        const settings = this.readImmersiveSettings();
        const sourcePath = settings.backgroundOriginalSrc || settings.backgroundSrc || '';
        const expectedPreset = settings.backgroundQuality === 'original'
            ? ''
            : IMMERSIVE_VIDEO_CACHE_PRESETS[settings.backgroundQuality === 'smooth' ? 'smooth' : 'quality'];
        const needsVideoPrepare = settings.backgroundType === 'video'
            && sourcePath
            && settings.backgroundQuality !== 'original'
            && (!settings.backgroundOptimizedSrc || settings.backgroundOptimizedPreset !== expectedPreset);
        if (needsVideoPrepare) {
            void this.prepareImmersiveVideoBackground(sourcePath);
        }
    }

    setImmersiveLyricsMode(mode: UINextImmersiveLyricsMode): void {
        this.updateImmersiveSettings({lyricsMode: mode});
    }

    setImmersiveVisualizerStyle(style: UINextImmersiveVisualizerStyle): void {
        this.updateImmersiveSettings({visualizerStyle: style});
    }

    useCoverImmersiveBackground(): void {
        this.updateImmersiveSettings({
            backgroundType: 'cover',
            backgroundSrc: '',
            backgroundOriginalSrc: '',
            backgroundOptimizedSrc: '',
            backgroundOptimizedPreset: ''
        });
    }

    useSonicTopographyImmersiveBackground(): void {
        this.immersiveBackgroundErrorShown = false;
        this.updateImmersiveSettings({
            backgroundType: 'sonic-topography',
            backgroundSrc: '',
            backgroundOriginalSrc: '',
            backgroundOptimizedSrc: '',
            backgroundOptimizedPreset: ''
        });
        window.requestAnimationFrame(() => {
            this.shell._ensureImmersiveSonicBackgroundLoop?.();
        });
        showToast('\u5df2\u5207\u6362\u58f0\u573a\u5730\u5f62\u80cc\u666f', 'success', 1600);
    }

    async chooseImmersiveBackground(kind: 'image' | 'video'): Promise<void> {
        this.setImmersiveBackgroundImportBusy(true, kind === 'video' ? '\u7b49\u5f85\u9009\u62e9\u89c6\u9891\u6587\u4ef6' : '\u7b49\u5f85\u9009\u62e9\u56fe\u7247\u6587\u4ef6');
        try {
            const result = await window.electronAPI?.dialog?.showOpenDialog({
                title: kind === 'image' ? '\u9009\u62e9\u6c89\u6d78\u80cc\u666f\u56fe\u7247' : '\u9009\u62e9\u6c89\u6d78\u52a8\u6001\u80cc\u666f',
                properties: ['openFile'],
                filters: kind === 'image'
                    ? [{name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']}]
                    : [{name: 'Videos', extensions: ['mp4', 'webm']}]
            }) as {canceled?: boolean; filePaths?: string[]} | undefined;

            const filePath = result?.filePaths?.[0];
            if (result?.canceled || !filePath) {
                this.setImmersiveBackgroundImportBusy(false, '');
                return;
            }

            this.immersiveBackgroundErrorShown = false;
            this.setImmersiveBackgroundImportBusy(true, kind === 'video' ? '\u6b63\u5728\u590d\u5236\u89c6\u9891\u5230\u7f13\u5b58' : '\u6b63\u5728\u590d\u5236\u56fe\u7247\u5230\u7f13\u5b58');
            showToast(kind === 'video' ? '\u6b63\u5728\u5bfc\u5165\u89c6\u9891\u80cc\u666f...' : '\u6b63\u5728\u5bfc\u5165\u56fe\u7247\u80cc\u666f...', 'info', 1800);
            const importBackground = window.electronAPI?.immersiveBackground?.importBackground;
            if (typeof importBackground !== 'function') {
                this.setImmersiveBackgroundImportBusy(false, '');
                showToast('\u80cc\u666f\u5bfc\u5165\u4e0d\u53ef\u7528', 'error', 2200);
                return;
            }

            const imported = await importBackground(filePath, kind);
            if (!imported?.success || !imported.cachePath) {
                this.setImmersiveBackgroundImportBusy(false, '');
                showToast(imported?.error || '\u80cc\u666f\u5bfc\u5165\u5931\u8d25', 'error', 2400);
                return;
            }

            const cachedPath = imported.cachePath;
            if (kind === 'video') {
                this.updateImmersiveSettings({
                    backgroundType: 'video',
                    backgroundSrc: cachedPath,
                    backgroundOriginalSrc: cachedPath,
                    backgroundOptimizedSrc: '',
                    backgroundOptimizedPreset: '',
                    backgroundQuality: 'original'
                });
                void this.prepareImportedVideoQualities(cachedPath);
                await this.loadImmersiveCachedVideos();
                this.setImmersiveBackgroundImportBusy(false, '');
                this.setImmersiveBackgroundStatus('optimizing', '\u539f\u753b\u53ef\u7528\uff0c\u6d41\u7545/\u9ad8\u8d28\u751f\u6210\u4e2d');
                showToast('\u89c6\u9891\u80cc\u666f\u5df2\u5bfc\u5165\uff0c\u6b63\u5728\u81ea\u52a8\u751f\u6210\u6d41\u7545\u548c\u9ad8\u8d28', 'success', 2400);
                return;
            }

            this.updateImmersiveSettings({
                backgroundType: kind,
                backgroundSrc: cachedPath,
                backgroundOriginalSrc: cachedPath,
                backgroundOptimizedSrc: cachedPath,
                backgroundOptimizedPreset: '',
                backgroundQuality: this.readImmersiveSettings().backgroundQuality
            });
            await this.loadImmersiveCachedVideos();
            this.setImmersiveBackgroundImportBusy(false, '');
            showToast('\u56fe\u7247\u80cc\u666f\u5df2\u5bfc\u5165', 'success', 1800);
        } catch (error) {
            console.error('[ui-next] chooseImmersiveBackground failed', error);
            this.setImmersiveBackgroundImportBusy(false, '');
            showToast('\u80cc\u666f\u9009\u62e9\u5931\u8d25', 'error', 2200);
        }
    }

    resetImmersiveBackground(): void {
        this.updateImmersiveSettings({
            backgroundType: 'cover',
            backgroundSrc: '',
            backgroundOriginalSrc: '',
            backgroundOptimizedSrc: '',
            backgroundOptimizedPreset: ''
        });
    }

    setImmersiveVideoQuality(quality: UINextImmersiveVideoQuality): void {
        const current = this.readImmersiveSettings();
        if (current.backgroundQuality === quality) {
            return;
        }

        const sourcePath = current.backgroundOriginalSrc || current.backgroundSrc || '';
        if (quality === 'original') {
            this.updateImmersiveSettings({
                backgroundQuality: quality,
                backgroundOptimizedSrc: '',
                backgroundOptimizedPreset: '',
                backgroundSrc: sourcePath
            });
            this.setImmersiveBackgroundStatus('optimized', '\u539f\u7247\u76f4\u51fa');
            return;
        }

        this.updateImmersiveSettings({
            backgroundQuality: quality,
            backgroundOptimizedSrc: '',
            backgroundOptimizedPreset: '',
            backgroundSrc: sourcePath
        });
        if (current.backgroundType === 'video' && sourcePath) {
            void this.prepareImmersiveVideoBackground(sourcePath);
        }
    }

    async loadImmersiveCachedVideos(): Promise<void> {
        const listCachedVideos = window.electronAPI?.immersiveBackground?.listCachedVideos;
        if (typeof listCachedVideos !== 'function') {
            this.shell.state.immersiveCachedVideos = [];
            if (this.shell.state.view === 'immersive-player') {
                this.shell.render();
            }
            return;
        }

        try {
            const result = await listCachedVideos();
            if (!result?.success || !Array.isArray(result.items)) {
                this.shell.state.immersiveCachedVideos = [];
                this.resetMissingImmersiveVideoBackground([]);
                if (this.shell.state.view === 'immersive-player') {
                    this.shell.render();
                }
                return;
            }

            this.shell.state.immersiveCachedVideos = result.items.map((item): UINextCachedVideo => {
                const mediaType: UINextCachedVideo['mediaType'] = item.mediaType === 'image' ? 'image' : 'video';
                return {
                    mediaType,
                    sourcePath: String(item.sourcePath || ''),
                    sourceName: String(item.sourceName || ''),
                    sourceSize: Number(item.sourceSize) || 0,
                    sourceMtimeMs: Number(item.sourceMtimeMs) || 0,
                    previewPath: typeof item.previewPath === 'string' ? item.previewPath : '',
                    qualities: Array.isArray(item.qualities)
                        ? item.qualities
                            .filter((quality) => quality.quality === 'source' || quality.quality === 'smooth' || quality.quality === 'quality')
                            .map((quality) => ({
                                quality: quality.quality as 'source' | Exclude<UINextImmersiveVideoQuality, 'original'>,
                                presetVersion: String(quality.presetVersion || ''),
                                cachePath: String(quality.cachePath || ''),
                                cacheSize: Number(quality.cacheSize) || 0,
                                previewPath: typeof quality.previewPath === 'string' ? quality.previewPath : '',
                                createdAt: Number(quality.createdAt) || 0
                            }))
                        : []
                };
            }).filter((item) => item.sourcePath && item.qualities.length > 0);
            this.resetMissingImmersiveVideoBackground(this.shell.state.immersiveCachedVideos);
        } catch (error) {
            console.error('[ui-next] load immersive cached videos failed', error);
            this.shell.state.immersiveCachedVideos = [];
            this.resetMissingImmersiveVideoBackground([]);
        }

        if (this.shell.state.view === 'immersive-player') {
            this.shell.render();
        }
    }

    private resetMissingImmersiveVideoBackground(items: UINextCachedVideo[]): void {
        const settings = this.readImmersiveSettings();
        if (settings.backgroundType !== 'video') {
            return;
        }

        const knownPaths = new Set<string>();
        for (const item of items) {
            if (item.mediaType !== 'video') {
                continue;
            }
            if (item.sourcePath) {
                knownPaths.add(item.sourcePath);
            }
            for (const quality of item.qualities) {
                if (quality.cachePath) {
                    knownPaths.add(quality.cachePath);
                }
            }
        }

        const referenced = [
            settings.backgroundSrc,
            settings.backgroundOriginalSrc,
            settings.backgroundOptimizedSrc
        ].filter(Boolean) as string[];

        if (referenced.length > 0 && referenced.some(path => knownPaths.has(path))) {
            return;
        }

        this.updateImmersiveSettings({
            backgroundType: 'cover',
            backgroundSrc: '',
            backgroundOriginalSrc: '',
            backgroundOptimizedSrc: '',
            backgroundOptimizedPreset: '',
            backgroundQuality: 'quality'
        });
    }

    selectImmersiveCachedVideo(
        mediaType: 'image' | 'video',
        sourcePath: string,
        cachePath: string,
        quality: 'source' | Exclude<UINextImmersiveVideoQuality, 'original'>,
        presetVersion: string
    ): void {
        if (!sourcePath || !cachePath) {
            return;
        }

        this.immersiveBackgroundErrorShown = false;
        if (mediaType === 'image') {
            this.updateImmersiveSettings({
                backgroundType: 'image',
                backgroundSrc: cachePath,
                backgroundOriginalSrc: sourcePath,
                backgroundOptimizedSrc: cachePath,
                backgroundOptimizedPreset: presetVersion || 'immersive-bg-source',
                backgroundQuality: this.readImmersiveSettings().backgroundQuality
            });
            this.setImmersiveBackgroundStatus('optimized', '\u6b63\u5728\u4f7f\u7528\u7f13\u5b58');
            showToast('\u5df2\u5207\u6362\u56fe\u7247\u80cc\u666f\u7f13\u5b58', 'success', 1600);
            return;
        }

        const videoQuality = quality === 'source' ? 'original' : quality;
        this.updateImmersiveSettings({
            backgroundType: 'video',
            backgroundSrc: cachePath,
            backgroundOriginalSrc: sourcePath,
            backgroundOptimizedSrc: cachePath,
            backgroundOptimizedPreset: presetVersion || (videoQuality === 'original' ? 'immersive-bg-source' : IMMERSIVE_VIDEO_CACHE_PRESETS[videoQuality]),
            backgroundQuality: videoQuality
        });
        this.setImmersiveBackgroundStatus('optimized', '\u6b63\u5728\u4f7f\u7528\u7f13\u5b58');
        showToast('\u5df2\u5207\u6362\u89c6\u9891\u80cc\u666f\u7f13\u5b58', 'success', 1600);
    }

    async renameImmersiveCachedVideo(cachePath: string, nextName: string): Promise<void> {
        const renameCachedVideo = window.electronAPI?.immersiveBackground?.renameCachedVideo;
        if (typeof renameCachedVideo !== 'function') {
            showToast('\u7f13\u5b58\u6539\u540d\u4e0d\u53ef\u7528', 'error', 1800);
            return;
        }

        const trimmed = nextName.trim();
        if (!trimmed) {
            showToast('\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a', 'error', 1800);
            return;
        }

        const result = await renameCachedVideo(cachePath, trimmed);
        if (!result?.success) {
            showToast(result?.error || '\u7f13\u5b58\u6539\u540d\u5931\u8d25', 'error', 2200);
            return;
        }

        await this.loadImmersiveCachedVideos();
        showToast('\u7f13\u5b58\u540d\u79f0\u5df2\u66f4\u65b0', 'success', 1600);
    }

    async deleteImmersiveCachedVideo(cachePath: string): Promise<void> {
        const deleteCachedVideo = window.electronAPI?.immersiveBackground?.deleteCachedVideo;
        if (typeof deleteCachedVideo !== 'function') {
            showToast('\u7f13\u5b58\u5220\u9664\u4e0d\u53ef\u7528', 'error', 1800);
            return;
        }

        const confirmed = window.confirm('\u5220\u9664\u8fd9\u4e2a\u80cc\u666f\u7f13\u5b58\uff1f\u4e0d\u4f1a\u5220\u9664\u539f\u89c6\u9891\u6587\u4ef6\u3002');
        if (!confirmed) {
            return;
        }

        const result = await deleteCachedVideo(cachePath);
        if (!result?.success) {
            showToast(result?.error || '\u7f13\u5b58\u5220\u9664\u5931\u8d25', 'error', 2200);
            return;
        }

        if (this.shell.state.immersiveBackground?.src === cachePath) {
            this.useCoverImmersiveBackground();
        }
        await this.loadImmersiveCachedVideos();
        showToast('\u7f13\u5b58\u5df2\u5220\u9664', 'success', 1600);
    }

    private async prepareImmersiveVideoBackground(filePath: string): Promise<void> {
        const prepareVideo = window.electronAPI?.immersiveBackground?.prepareVideo;
        const settings = this.readImmersiveSettings();
        const quality = settings.backgroundQuality || 'quality';
        if (quality === 'original') {
            this.updateImmersiveSettings({
                backgroundType: 'video',
                backgroundSrc: filePath,
                backgroundOriginalSrc: filePath,
                backgroundOptimizedSrc: '',
                backgroundOptimizedPreset: '',
                backgroundQuality: 'original'
            });
            this.setImmersiveBackgroundStatus('optimized', '\u539f\u7247\u76f4\u51fa');
            return;
        }

        if (typeof prepareVideo !== 'function') {
            this.setImmersiveBackgroundStatus('failed', '\u4f18\u5316\u4e0d\u53ef\u7528');
            showToast('\u89c6\u9891\u80cc\u666f\u4f18\u5316\u4e0d\u53ef\u7528\uff0c\u5df2\u4f7f\u7528\u539f\u89c6\u9891', 'info', 2400);
            return;
        }

        if (this.immersiveVideoPreparePath === filePath) {
            return;
        }

        this.immersiveVideoPreparePath = filePath;
        this.setImmersiveBackgroundStatus('optimizing', '\u89c6\u9891\u4f18\u5316\u4e2d');
        showToast('\u6b63\u5728\u4f18\u5316\u89c6\u9891\u80cc\u666f...', 'info', 2200);
        try {
            const result = await prepareVideo(filePath, quality);
            const current = this.readImmersiveSettings();
            const currentSourcePath = current.backgroundOriginalSrc || current.backgroundSrc || '';
            if (current.backgroundType !== 'video' || currentSourcePath !== filePath || current.backgroundQuality !== quality) {
                return;
            }

            if (!result?.success || !result.cachePath) {
                console.warn('[ui-next] immersive video optimization failed', result?.error);
                this.setImmersiveBackgroundStatus('failed', '\u4f18\u5316\u5931\u8d25\uff0c\u4f7f\u7528\u539f\u89c6\u9891');
                showToast('\u89c6\u9891\u80cc\u666f\u4f18\u5316\u5931\u8d25\uff0c\u7ee7\u7eed\u4f7f\u7528\u539f\u89c6\u9891', 'error', 2600);
                return;
            }

            this.updateImmersiveSettings({
                backgroundType: 'video',
                backgroundSrc: result.cachePath,
                backgroundOriginalSrc: filePath,
                backgroundOptimizedSrc: result.cachePath,
                backgroundOptimizedPreset: IMMERSIVE_VIDEO_CACHE_PRESETS[quality],
                backgroundQuality: quality
            });
            this.setImmersiveBackgroundStatus('optimized', result.reused ? '\u6b63\u5728\u4f7f\u7528\u7f13\u5b58' : '\u89c6\u9891\u5df2\u4f18\u5316');
            void this.loadImmersiveCachedVideos();
            showToast(result.reused ? '\u5df2\u4f7f\u7528\u89c6\u9891\u80cc\u666f\u7f13\u5b58' : '\u89c6\u9891\u80cc\u666f\u4f18\u5316\u5b8c\u6210', 'success', 2200);
        } catch (error) {
            console.error('[ui-next] immersive video optimization failed', error);
            this.setImmersiveBackgroundStatus('failed', '\u4f18\u5316\u5931\u8d25\uff0c\u4f7f\u7528\u539f\u89c6\u9891');
            showToast('\u89c6\u9891\u80cc\u666f\u4f18\u5316\u5931\u8d25\uff0c\u7ee7\u7eed\u4f7f\u7528\u539f\u89c6\u9891', 'error', 2600);
        } finally {
            if (this.immersiveVideoPreparePath === filePath) {
                this.immersiveVideoPreparePath = '';
            }
        }
    }

    private async prepareImportedVideoQualities(filePath: string): Promise<void> {
        const prepareVideo = window.electronAPI?.immersiveBackground?.prepareVideo;
        if (typeof prepareVideo !== 'function') {
            return;
        }

        this.setImmersiveBackgroundStatus('optimizing', '\u6d41\u7545\u7248\u751f\u6210\u4e2d');
        for (const quality of ['smooth', 'quality'] as const) {
            try {
                await prepareVideo(filePath, quality);
                await this.loadImmersiveCachedVideos();
                this.setImmersiveBackgroundStatus(
                    quality === 'smooth' ? 'optimizing' : 'optimized',
                    quality === 'smooth' ? '\u9ad8\u8d28\u7248\u751f\u6210\u4e2d' : '\u4e09\u79cd\u753b\u8d28\u5df2\u5c31\u7eea'
                );
            } catch (error) {
                console.warn('[ui-next] prepare imported video quality failed', quality, error);
                this.setImmersiveBackgroundStatus(
                    'failed',
                    quality === 'smooth' ? '\u6d41\u7545\u7248\u751f\u6210\u5931\u8d25' : '\u9ad8\u8d28\u7248\u751f\u6210\u5931\u8d25'
                );
            }
        }
    }

    private setImmersiveBackgroundStatus(status: 'idle' | 'optimizing' | 'optimized' | 'failed', statusText = ''): void {
        const background = this.shell.state.immersiveBackground || {type: 'cover' as UINextImmersiveBackgroundType, src: ''};
        this.shell.state.immersiveBackground = {
            ...background,
            status,
            statusText
        };
        if (this.shell.state.view === 'immersive-player') {
            this.shell.render();
        }
    }

    private setImmersiveBackgroundImportBusy(importBusy: boolean, statusText: string): void {
        const background = this.shell.state.immersiveBackground || {type: 'cover' as UINextImmersiveBackgroundType, src: ''};
        this.shell.state.immersiveBackground = {
            ...background,
            status: statusText ? 'optimizing' : (background.status || 'idle'),
            statusText,
            importBusy
        };
        if (this.shell.state.view === 'immersive-player') {
            this.shell.render();
        }
    }

    async updateSetting(key: UINextSettingsKey, value: boolean | string | number): Promise<void> {
        const settings = this.readSettings();
        let nextSettings = this.applySettingValue(settings, key, value);

        cacheManager.setLocalCache('musicbox-settings', nextSettings);
        this.shell.state.settings = this.toSettingsState(nextSettings);
        this.shell.render();

        try {
            if (key === 'systemTray' || key === 'trayCloseBehavior' || key === 'trayStartMinimized') {
                await trayShellService.updateSettings({
                    enabled: nextSettings.systemTray !== false,
                    closeToTray: nextSettings.trayCloseBehavior === 'minimize',
                    startMinimized: nextSettings.trayStartMinimized === true
                });
            }

            if (key === 'desktopLyrics' && value !== true) {
                await desktopLyricsService.hide();
            }

            if (key === 'showTrackCovers') {
                trackCoverDisplayPreferenceService.setEnabled(value === true);
            }

            if (key === 'gaplessPlayback') {
                playbackController.setGaplessPlayback(value === true);
            }

            if (key === 'exclusiveMode') {
                const result = await audioEngineSettingsController.switchExclusiveMode(value === true);
                if (result.checked !== value) {
                    nextSettings = this.applySettingValue(nextSettings, 'exclusiveMode', result.checked);
                    cacheManager.setLocalCache('musicbox-settings', nextSettings);
                }
            }

            if (key === 'wasapiShareMode') {
                await audioEngineSettingsController.switchWasapiShareMode(value === 'shared' ? 'shared' : 'exclusive');
            }

            if (key === 'networkDriveEnabled' && value === true) {
                this.openNetworkDrive();
            }

            if (key === 'lyricsDirectory' && typeof value === 'string' && value) {
                mediaDirectorySettingsService.applyLyricsDirectory(value);
            }

            if (key === 'coverCacheDirectory' && typeof value === 'string' && value) {
                mediaDirectorySettingsService.applyCoverDirectory(value);
            }

            if (key === 'lyricsHighlightOpacity' && typeof value === 'number') {
                lyricsAppearanceSettingsService.applyHighlightOpacity(value);
            }

            if (key === 'lyricsHighlightColor' && typeof value === 'string') {
                lyricsAppearanceSettingsService.applyHighlightColor(value);
            }

            if (key.startsWith('desktopLyrics') && key !== 'desktopLyrics') {
                await desktopLyricsService.updateSettings(this.toSettingsState(nextSettings).desktopLyricsSettings);
            }

            if (key.startsWith('miniMode')) {
                const miniSettings = this.toSettingsState(nextSettings);
                displayModeSettingsController.applyMiniModeSetting('fontColor', miniSettings.miniModeFontColor);
                displayModeSettingsController.applyMiniModeSetting('highlightColor', miniSettings.miniModeHighlightColor);
                displayModeSettingsController.applyMiniModeSetting('fontSize', miniSettings.miniModeFontSize);
            }
        } catch (error) {
            console.error('[ui-next] updateSetting side effect failed', error);
            showToast('\u8bbe\u7f6e\u5df2\u4fdd\u5b58\uff0c\u4f46\u7cfb\u7edf\u540c\u6b65\u5931\u8d25', 'error', 2400);
        } finally {
            this.shell.state.settings = this.toSettingsState(this.readSettings());
            this.shell.render();
        }
    }

    async addMusicFolder(): Promise<void> {
        const folders = await musicFolderSettingsController.addMusicFolder();
        if (folders) {
            this.patchSettingsState({musicFolders: folders});
            await this.loadLibrarySnapshot();
        }
    }

    async removeMusicFolder(folderPath: string): Promise<void> {
        const folders = await musicFolderSettingsController.removeMusicFolder(folderPath);
        if (folders) {
            this.patchSettingsState({musicFolders: folders});
        }
    }

    async toggleAutoScan(enabled: boolean): Promise<void> {
        const result = await musicFolderSettingsController.toggleAutoScan(enabled);
        this.patchSettingsState({autoScanEnabled: result.checked});
    }

    async updateScanFrequency(frequency: string): Promise<void> {
        await musicFolderSettingsController.updateScanFrequency(frequency);
        this.patchSettingsState({scanFrequency: frequency});
    }

    async chooseLyricsDirectory(): Promise<void> {
        const selectedPath = await mediaDirectorySettingsService.selectDirectory();
        if (!selectedPath) {
            return;
        }
        await this.updateSetting('lyricsDirectory', selectedPath);
    }

    async chooseCoverCacheDirectory(): Promise<void> {
        const selectedPath = await mediaDirectorySettingsService.selectDirectory();
        if (!selectedPath) {
            return;
        }
        await this.updateSetting('coverCacheDirectory', selectedPath);
    }

    async showCacheStatistics(): Promise<void> {
        this.patchSettingsState({cacheBusy: 'stats'});
        try {
            const display = await cacheSettingsService.getStatisticsDisplay();
            if (display.success) {
                this.patchSettingsState({cacheDescription: display.description || ''});
                showToast(display.toastMessage || '缓存统计已更新', 'info');
                return;
            }
            showToast(display.error || '获取缓存统计失败', 'error');
        } finally {
            this.patchSettingsState({cacheBusy: ''});
        }
    }

    async validateCache(): Promise<void> {
        this.patchSettingsState({cacheBusy: 'validate'});
        try {
            const result = await cacheSettingsService.validateCache();
            showToast(result.message, result.success ? 'success' : 'error');
        } finally {
            this.patchSettingsState({cacheBusy: ''});
        }
    }

    async clearCache(): Promise<void> {
        const confirmed = this.shell.confirm
            ? await this.shell.confirm({
                title: '清空缓存',
                message: '确定清空全部音乐缓存？下次启动时需要重新扫描。',
                confirmText: '清空',
                cancelText: '取消',
                danger: true
            })
            : window.confirm('Clear all music cache?');
        if (!confirmed) {
            return;
        }

        this.patchSettingsState({cacheBusy: 'clear'});
        try {
            const result = await cacheSettingsService.clearCache();
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.description) {
                this.patchSettingsState({cacheDescription: result.description});
            }
        } finally {
            this.patchSettingsState({cacheBusy: ''});
        }
    }

    async testEmbeddedLyrics(): Promise<void> {
        try {
            const diagnostics = await embeddedLyricsDiagnosticsService.chooseFileAndBuildReport();
            if (!diagnostics.selected) {
                showToast('未选择文件', 'info');
                return;
            }
            showToast(diagnostics.foundLyrics ? '检测到内嵌歌词' : '未检测到内嵌歌词', diagnostics.foundLyrics ? 'success' : 'info');
            console.log('[ui-next] embedded lyrics diagnostics', diagnostics.report || diagnostics.error || '');
        } catch (error) {
            console.error('[ui-next] testEmbeddedLyrics failed', error);
            showToast('内嵌歌词诊断失败', 'error');
        }
    }

    async toggleHardwareAcceleration(enabled: boolean): Promise<void> {
        const result = await hardwareAccelerationSettingsController.handleChange(enabled);
        this.patchSettingsState({hardwareAcceleration: result.checked});
    }

    async openUserDataFolder(): Promise<void> {
        await hardwareAccelerationSettingsController.openUserDataFolder();
    }

    async openDevTools(): Promise<void> {
        await hardwareAccelerationSettingsController.openDevTools();
    }

    async checkUpdates(): Promise<void> {
        showToast('正在检查更新...', 'info', 1600);
        try {
            await appInfoSettingsService.updateVersionInfo();
            const result = await updateService.checkForUpdates({fallbackCurrentVersion: true});
            if (result.hasUpdate) {
                const versionText = result.latestVersion ? ` v${result.latestVersion}` : '';
                showToast(`发现新版本${versionText}，正在打开发布页`, 'success', 2600);
                const openResult = await updateService.openReleasePage(result.releaseInfo?.html_url || updateService.getFallbackReleaseUrl());
                if (!openResult.success) {
                    showToast(openResult.error || '打开发布页失败', 'error', 2200);
                }
                return;
            }
            const currentVersion = result.currentVersion || result.latestVersion || 'unknown';
            showToast(`当前已是最新版本 v${currentVersion}`, 'success', 2200);
        } catch (error) {
            console.error('[ui-next] checkUpdates failed', error);
            const message = error instanceof Error && error.message
                ? error.message
                : '检查更新失败';
            showToast(message, 'error', 3200);
        }
    }

    async openRepository(): Promise<void> {
        const result = await appInfoSettingsService.openRepository();
        if (!result.success) {
            showToast(result.error || '项目地址暂未配置', 'info', 2200);
        }
    }

    async addMusicFiles(): Promise<void> {
        try {
            await appFileImportActionService.addMusicFiles();
            await this.loadLibrarySnapshot();
        } catch (error) {
            console.error('[ui-next] addMusicFiles failed', error);
            showToast('添加音乐失败', 'error', 2200);
        }
    }

    openNetworkDrive(): void {
        const opened = appModalService.showNetworkDriveModal();
        if (!opened) {
            showToast('网络磁盘窗口未初始化', 'error', 2200);
        }
    }

    async openPluginManager(): Promise<void> {
        try {
            const opened = await appModalService.showPluginManager();
            if (!opened) {
                showToast('插件管理器未初始化', 'error', 2200);
            }
        } catch (error) {
            console.error('[ui-next] openPluginManager failed', error);
            showToast('插件管理器打开失败', 'error', 2200);
        }
    }

    openHomeView(_fromHistory = false): void {
        this.shell.state.view = 'home';
        this.shell.state.activePlaylistId = null;
        this.shell.state.viewTracks = [];
        this.shell.render();
    }

    openLibraryView(_fromHistory = false): void {
        this.shell.state.view = 'library';
        this.shell.state.activePlaylistId = null;
        this.shell.state.viewTracks = this.shell.mock.tracks;
        this.shell.render();
    }

    openRecentView(_fromHistory = false): void {
        this.shell.state.view = 'recent';
        this.shell.state.activePlaylistId = null;
        const recentTracks = recentPlaybackHistoryService.loadHistory(80);
        this.shell.state.viewTracks = recentTracks
            .map((track) => this.toUINextTrack(track, this.resolveSource(track)));
        this.shell.render();
    }

    async openFavoritesView(_fromHistory = false): Promise<void> {
        try {
            this.shell.state.view = 'favorites';
            this.shell.state.activePlaylistId = null;
            const tracks = await libraryDataService.getFavoriteTracks();
            this.shell.state.viewTracks = this.filterFavoriteVisibleTracks(tracks)
                .map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.shell.render();
        } catch (error) {
            console.error('[ui-next] openFavoritesView failed', error);
            showToast('加载收藏失败', 'error', 2200);
        }
    }

    async playTracks(tracks: UINextTrack[], shuffle = false): Promise<void> {
        const originalTracks = tracks
            .map((track) => this.resolvePlaybackTrack(track))
            .filter((track) => Boolean(track?.filePath));

        if (originalTracks.length === 0) {
            return;
        }

        const queue = shuffle
            ? originalTracks.slice().sort(() => Math.random() - 0.5)
            : originalTracks;
        const firstTrack = queue[0];

        await this.playPreparedTrack(firstTrack, queue, 0, 'playTracks');
    }

    minimizeWindow(): void {
        void windowGateway.minimize();
    }

    async toggleMaximizeWindow(): Promise<void> {
        if (await windowGateway.isMaximized()) {
            await windowGateway.unmaximize();
        } else {
            await windowGateway.maximize();
        }
    }

    closeWindow(): void {
        void windowGateway.close();
    }

    async openPlaylist(playlistId: string, _fromHistory = false): Promise<void> {
        if (playlistId.startsWith('netease-recommend-')) {
            await this.openNetEaseRecommendedPlaylist(playlistId);
            return;
        }

        this.shell.state.view = 'playlist';
        this.shell.state.activePlaylistId = playlistId;
        this.shell.state.syncing = true;
        this.shell.render();

        await libraryController.getPlaylistDetail(playlistId).then((result) => {
            if (!result.success || !result.playlist) {
                return;
            }

            const tracks = result.tracks?.length
                ? result.tracks
                : this.resolvePlaylistTracks(result.playlist as {tracks?: Track[]; trackIds?: string[]});
            const playlist = result.playlist;
            const playlistCoverSourceUrl = this.resolvePlaylistCover(playlist);
            const existingIndex = this.shell.mock.playlists.findIndex((item) => item.id === playlistId);
            const nextPlaylist: UINextPlaylist = {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                cover: playlistCoverSourceUrl,
                coverSourceUrl: playlistCoverSourceUrl,
                trackCount: playlist.trackCount || tracks.length,
                source: this.resolvePlaylistSource({...playlist, tracks}),
                externalId: this.getPlaylistExternalId(playlist),
                externalType: this.getPlaylistExternalType(playlist),
                updatedAt: playlist.modifiedAt ? new Date(playlist.modifiedAt).toLocaleDateString() : undefined,
                trackIds: tracks.map((track) => this.trackId(track))
            };
            const cachedPlaylistCover = playlistCoverManifest.resolveCachedPlaylistCover(nextPlaylist);
            if (cachedPlaylistCover) {
                nextPlaylist.cover = cachedPlaylistCover;
            } else if (this.isRemoteCoverUrl(nextPlaylist.cover)) {
                nextPlaylist.cover = undefined;
            }

            if (existingIndex >= 0) {
                this.shell.mock.playlists[existingIndex] = nextPlaylist;
            } else {
                this.shell.mock.playlists.push(nextPlaylist);
            }
            void playlistCoverManifest.resolveCachedPlaylistCoverAsync(nextPlaylist).then((cover) => {
                if (!cover) return;
                nextPlaylist.cover = cover;
                this.shell.render();
            });

            const uiTracks = tracks.map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.playlistTrackCache.set(playlistId, uiTracks);
            this.shell.mock.tracksForPlaylist = (id: string) => {
                if (id === playlistId) {
                    return uiTracks;
                }
                return this.playlistTrackCache.get(id) || [];
            };

        }).catch((error) => {
            console.error('[ui-next] openPlaylist failed', error);
        }).finally(() => {
            this.shell.state.syncing = false;
            this.shell.render();
        });
    }

    async openCloudNetEasePlaylist(playlist: UINextPlaylist, externalId: number): Promise<void> {
        const playlistId = playlist.id;
        this.ensureRuntimePlaylist(playlist);
        this.shell.state.view = 'playlist';
        this.shell.state.activePlaylistId = playlistId;
        this.shell.state.syncing = true;
        this.shell.setPlaylistOpenState?.({
            playlistId,
            status: 'loading',
            message: '\u6b63\u5728\u4ece\u7f51\u6613\u4e91\u52a0\u8f7d\u6b4c\u5355\u66f2\u76ee\uff0c\u4e0d\u4f1a\u81ea\u52a8\u5bfc\u5165\u672c\u5730\u3002'
        });
        this.shell.render();

        try {
            const tracks = await netEaseRecommendationService.getPlaylistTracks(externalId);
            const uiTracks = tracks.map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.applyRemotePlaylistTracks(playlistId, uiTracks);

            const existingIndex = this.shell.mock.playlists.findIndex((item) => item.id === playlistId);
            const nextPlaylist: UINextPlaylist = {
                ...playlist,
                trackCount: playlist.trackCount || uiTracks.length,
                trackIds: uiTracks.map((track) => track.id)
            };
            this.ensureRuntimePlaylist(nextPlaylist, existingIndex);
            this.shell.setPlaylistOpenState?.({
                playlistId,
                status: 'ready',
                message: ''
            });
        } catch (error) {
            console.warn('[ui-next] openCloudNetEasePlaylist failed', error);
            this.shell.setPlaylistOpenState?.({
                playlistId,
                status: 'error',
                message: '\u7f51\u6613\u4e91\u6b4c\u5355\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5 API \u6216\u7f51\u7edc\u540e\u91cd\u8bd5\u3002'
            });
            showToast('网易云歌单加载失败', 'error', 2400);
        } finally {
            this.shell.state.syncing = false;
            this.shell.render();
        }
    }

    private async openNetEaseRecommendedPlaylist(playlistId: string): Promise<void> {
        const playlist = this.shell.mock.playlistById?.(playlistId)
            || this.shell.state.homeNetEase?.find((item) => item.id === playlistId)
            || null;
        const externalId = Number(playlist?.externalId || playlistId.replace('netease-recommend-', ''));
        if (!playlist || !Number.isFinite(externalId) || externalId <= 0) {
            return;
        }

        this.ensureRuntimePlaylist(playlist);
        this.shell.state.view = 'playlist';
        this.shell.state.activePlaylistId = playlistId;

        const cachedTracks = netEaseRecommendationService.getCachedPlaylistTracks(externalId);
        if (cachedTracks.length > 0) {
            this.applyNetEaseRecommendedPlaylistTracks(playlist, playlistId, cachedTracks);
            this.shell.setPlaylistOpenState?.({
                playlistId,
                status: 'ready',
                message: ''
            });
            this.shell.state.syncing = false;
            this.shell.render();
            void this.refreshNetEaseRecommendedPlaylistInBackground(playlist, playlistId, externalId);
            return;
        }

        this.shell.state.syncing = true;
        this.shell.setPlaylistOpenState?.({
            playlistId,
            status: 'loading',
            message: '\u6b63\u5728\u4ece\u7f51\u6613\u4e91\u52a0\u8f7d\u63a8\u8350\u6b4c\u5355\uff0c\u53ea\u4f5c\u4e3a\u8fdc\u7a0b\u64ad\u653e\u4e0d\u4f1a\u5bfc\u5165\u672c\u5730\u3002'
        });
        this.shell.render();
        await this.refreshNetEaseRecommendedPlaylist(playlist, playlistId, externalId, {
            showError: true,
            manageSyncing: true
        });
    }

    private async refreshNetEaseRecommendedPlaylistInBackground(
        playlist: UINextPlaylist,
        playlistId: string,
        externalId: number
    ): Promise<void> {
        await this.refreshNetEaseRecommendedPlaylist(playlist, playlistId, externalId, {
            showError: false,
            manageSyncing: false
        });
    }

    private async refreshNetEaseRecommendedPlaylist(
        playlist: UINextPlaylist,
        playlistId: string,
        externalId: number,
        options: {showError: boolean; manageSyncing: boolean}
    ): Promise<void> {
        try {
            const tracks = await netEaseRecommendationService.getPlaylistTracks(externalId);
            this.applyNetEaseRecommendedPlaylistTracks(playlist, playlistId, tracks);
            this.shell.setPlaylistOpenState?.({
                playlistId,
                status: 'ready',
                message: ''
            });
        } catch (error) {
            console.warn('[ui-next] refreshNetEaseRecommendedPlaylist failed', error);
            if (options.showError) {
                this.shell.setPlaylistOpenState?.({
                    playlistId,
                    status: 'error',
                    message: '\u7f51\u6613\u4e91\u63a8\u8350\u6b4c\u5355\u52a0\u8f7d\u5931\u8d25\uff0c\u53ef\u91cd\u8bd5\u6216\u8fd4\u56de\u9996\u9875\u3002'
                });
            }
        } finally {
            if (options.manageSyncing) {
                this.shell.state.syncing = false;
            }
            this.shell.render();
        }
    }

    private applyNetEaseRecommendedPlaylistTracks(
        playlist: UINextPlaylist,
        playlistId: string,
        tracks: Track[]
    ): UINextTrack[] {
        const uiTracks = tracks.map((track) => this.toUINextTrack(track, this.resolveSource(track)));
        this.applyRemotePlaylistTracks(playlistId, uiTracks);
        const existingIndex = this.shell.mock.playlists.findIndex((item) => item.id === playlistId);
        const nextPlaylist = {
            ...playlist,
            trackCount: playlist.trackCount || uiTracks.length,
            trackIds: uiTracks.map((track) => track.id)
        };
        this.ensureRuntimePlaylist(nextPlaylist, existingIndex);
        return uiTracks;
    }

    private applyRemotePlaylistTracks(playlistId: string, uiTracks: UINextTrack[]): void {
        this.playlistTrackCache.set(playlistId, uiTracks);
        this.shell.mock.tracksForPlaylist = (id: string) => {
            if (id === playlistId) {
                return uiTracks;
            }
            return this.playlistTrackCache.get(id) || [];
        };
    }

    private ensureRuntimePlaylist(playlist: UINextPlaylist, knownIndex?: number): void {
        const index = typeof knownIndex === 'number' && knownIndex >= 0
            ? knownIndex
            : this.shell.mock.playlists.findIndex((item) => item.id === playlist.id);
        if (index >= 0) {
            this.shell.mock.playlists[index] = playlist;
            return;
        }
        this.shell.mock.playlists.push(playlist);
    }

    importNeteasePlaylist(): void {
        if (window.__newShellNetEase?.openImportModal) {
            window.__newShellNetEase.openImportModal();
            return;
        }

        const modal = document.getElementById('netease-import-modal') as HTMLElement | null;
        if (!modal) {
            showToast('网易云歌单导入窗口未初始化', 'error', 2200);
            return;
        }

        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
        const input = document.getElementById('netease-playlist-id') as HTMLInputElement | null;
        input?.focus();
    }

    async migrateAllNetEaseAssets(): Promise<void> {
        if (this.netEaseAssetMigrationInFlight) {
            showToast('迁移正在进行，请等待当前任务完成', 'info', 2200);
            return;
        }

        this.netEaseAssetMigrationInFlight = true;
        this.setNetEaseAssetMigrationRunning(true);
        if (window.__newShellNetEase?.startAssetMigrationFromAccountMenu) {
            try {
                await window.__newShellNetEase.startAssetMigrationFromAccountMenu();
                await this.refreshLibrarySnapshotAfterNetEaseMigration();
                this.refreshMigrationDashboardState();
                this.refreshNetEaseAccountCenterState();
                this.shell.completeMigrationOnboarding?.('account-menu-migration');
                this.openMigrationDashboard();
            } finally {
                this.netEaseAssetMigrationInFlight = false;
                this.setNetEaseAssetMigrationRunning(false);
            }
            return;
        }

        this.importNeteasePlaylist();
        this.netEaseAssetMigrationInFlight = false;
        this.setNetEaseAssetMigrationRunning(false);
        showToast('正在打开网易云资产迁移入口', 'info', 2400);
    }

    showActiveNetEaseMigration(): void {
        if (window.__newShellNetEase?.showAssetMigrationProgressModal) {
            window.__newShellNetEase.showAssetMigrationProgressModal();
            return;
        }

        showToast('网易云资产迁移正在后台进行，请稍后查看迁移状态', 'info', 2600);
    }

    createPlaylist(): void {
        if (window.__newShellCreatePlaylistDialog) {
            window.__newShellCreatePlaylistDialog.show();
            return;
        }

        const name = window.prompt('歌单名称');
        if (!name?.trim()) {
            return;
        }

        void libraryController.createPlaylist(name.trim(), '').then((result) => {
            if (!result.success) {
                showToast(result.error || '创建歌单失败', 'error', 2200);
                return;
            }

            showToast('歌单已创建', 'success');
            this.applyCreatedPlaylistOptimistically(result.playlist);
            this.notifyLibraryChanged();
        }).catch((error) => {
            console.error('[ui-next] createPlaylist failed', error);
            showToast('创建歌单失败', 'error', 2200);
        });
    }

    async deletePlaylist(playlistId: string): Promise<void> {
        const playlist = this.shell.mock.playlists.find((item) => item.id === playlistId);
        if (!playlist) {
            return;
        }

        const isNetEasePlaylist = playlist.source === 'netease';
        const confirmed = this.shell.confirm
            ? await this.shell.confirm({
                title: isNetEasePlaylist ? '删除网易云歌单' : '删除歌单',
                message: isNetEasePlaylist
                    ? `确定删除「${playlist.name}」吗？只会从 Auralux 删除这个已导入的歌单，不会删除网易云云端歌单，也不会删除歌曲文件。`
                    : `确定删除「${playlist.name}」吗？此操作不会删除歌曲文件。`,
                confirmText: isNetEasePlaylist ? '从 Auralux 删除' : '删除',
                cancelText: '取消',
                danger: true
            })
            : window.confirm(isNetEasePlaylist
                ? `从 Auralux 移除已导入的网易云歌单「${playlist.name}」吗？`
                : `删除歌单「${playlist.name}」吗？`);

        if (!confirmed) {
            return;
        }

        void libraryController.deletePlaylist(playlistId).then((result) => {
            if (!result.success) {
                showToast(result.error || '删除歌单失败', 'error', 2200);
                return;
            }

            showToast(isNetEasePlaylist ? '已从 Auralux 删除网易云歌单' : '歌单已删除', 'success');
            this.applyDeletedPlaylistOptimistically(playlistId);
            this.notifyLibraryChanged();
        }).catch((error) => {
            console.error('[ui-next] deletePlaylist failed', error);
            showToast('删除歌单失败', 'error', 2200);
        });
    }

    async renamePlaylist(playlistId: string): Promise<void> {
        const playlist = this.shell.mock.playlists.find((item) => item.id === playlistId);
        if (!playlist || playlist.source === 'netease') {
            showToast('只能重命名本地歌单', 'info', 2200);
            return;
        }

        const nextName = window.prompt('新的歌单名称', playlist.name);
        const normalizedName = nextName?.trim();
        if (!normalizedName || normalizedName === playlist.name) {
            return;
        }

        try {
            const result = await libraryController.renamePlaylist(playlistId, normalizedName);
            if (!result.success) {
                showToast(result.error || '重命名歌单失败', 'error', 2200);
                return;
            }

            showToast('歌单已重命名', 'success');
            this.applyRenamedPlaylistOptimistically(playlistId, normalizedName);
            this.notifyLibraryChanged();
        } catch (error) {
            console.error('[ui-next] renamePlaylist failed', error);
            showToast('重命名歌单失败', 'error', 2200);
        }
    }

    async refreshPlaylist(playlistId: string): Promise<void> {
        const playlist = this.shell.mock.playlists.find((item) => item.id === playlistId);
        if (playlist?.source !== 'netease' || !playlist.externalId) {
            this.openPlaylist(playlistId);
            return;
        }

        this.shell.state.syncing = true;
        this.shell.render();

        try {
            let result = await netEaseSyncStateService.syncPlaylistWithState(playlistId, playlist.externalId);
            const syncState = netEaseSyncStateService.getPlaylistSyncState(playlistId);
            if (!result.success && syncState?.status === 'conflict') {
                const confirmed = this.shell.confirm
                    ? await this.shell.confirm({
                        title: '\u7f51\u6613\u4e91\u540c\u6b65\u51b2\u7a81',
                        message: `${syncState.failureReason || '\u672c\u5730\u6b4c\u5355\u6709\u672a\u540c\u6b65\u5185\u5bb9'}\u3002\u7ee7\u7eed\u540c\u6b65\u4f1a\u4fdd\u7559\u672c\u5730\u6b4c\u66f2\uff0c\u4f46\u9700\u8981\u4f60\u786e\u8ba4\u8fd9\u6b21\u51b2\u7a81\u3002`,
                        confirmText: '\u7ee7\u7eed\u540c\u6b65',
                        cancelText: '\u53d6\u6d88',
                        danger: true
                    })
                    : window.confirm(syncState.failureReason || '网易云同步检测到冲突，是否在保护本地歌曲的前提下继续？');
                if (!confirmed) {
                    showToast('\u5df2\u4fdd\u62a4\u672c\u5730\u6b4c\u5355\uff0c\u672a\u7ee7\u7eed\u540c\u6b65', 'info', 2200);
                    return;
                }
                result = await netEaseSyncStateService.syncPlaylistWithState(playlistId, playlist.externalId, {
                    allowConflict: true
                });
            }
            const lastSuccessfulSyncAt = netEaseSyncStateService.getPlaylistSyncState(playlistId)?.lastSuccessfulSyncAt;
            if (!result.success) {
                showToast(result.error || '网易云歌单同步失败', 'error', 2200);
                return;
            }

            const syncedAtText = lastSuccessfulSyncAt
                ? `，${new Date(lastSuccessfulSyncAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}`
                : '';
            showToast(`同步完成，新增 ${result.addedCount} 首${syncedAtText}`, 'success');
            this.notifyLibraryChanged();
            this.refreshMigrationDashboardState();
            this.openPlaylist(playlistId);
        } catch (error) {
            console.error('[ui-next] refreshPlaylist failed', error);
            showToast('网易云歌单同步失败', 'error', 2200);
        } finally {
            this.shell.state.syncing = false;
            this.shell.render();
        }
    }

    addToPlaylist(track: UINextTrack): void {
        const original = this.resolveOriginalTrack(track);
        if (window.__newShellAddToPlaylistDialog) {
            void window.__newShellAddToPlaylistDialog.show(original);
            return;
        }

        showToast('添加到歌单窗口未初始化', 'error', 2200);
    }

    toggleLike(track: UINextTrack): void {
        const original = this.resolveOriginalTrack(track);
        const liked = !track.liked;
        void libraryController.updateTrackMetadata({
            filePath: original.filePath,
            favorite: liked
        }).then(() => {
            showToast(liked ? '已收藏' : '已取消收藏', 'info');
            this.applyLikedState(track, liked);
        }).catch((error) => {
            console.error('[ui-next] toggleLike failed', error);
            showToast('收藏操作失败', 'error', 2200);
        });
    }

    async deleteTrackFile(track: UINextTrack): Promise<void> {
        if (!this.canDeleteTrackFile(track)) {
            showToast('\u53ea\u6709\u672c\u5730\u6587\u4ef6\u53ef\u4ee5\u4ece\u78c1\u76d8\u5220\u9664', 'error', 2200);
            return;
        }

        const original = this.resolveOriginalTrack(track);
        const trackFileId = original.fileId || original.id || track.id;
        if (!trackFileId) {
            showToast('\u65e0\u6cd5\u5b9a\u4f4d\u8981\u5220\u9664\u7684\u6b4c\u66f2', 'error', 2200);
            return;
        }

        const confirmed = this.shell.confirm
            ? await this.shell.confirm({
                title: '\u4ece\u78c1\u76d8\u5220\u9664\u6b4c\u66f2',
                message: `\u786e\u5b9a\u5220\u9664\u300c${track.title}\u300d\u5417\uff1f\u8fd9\u4f1a\u5220\u9664\u672c\u5730\u6587\u4ef6\uff0c\u65e0\u6cd5\u4ece Auralux \u64a4\u9500\u3002`,
                confirmText: '\u5220\u9664\u6587\u4ef6',
                cancelText: '\u53d6\u6d88',
                danger: true
            })
            : window.confirm(`Delete local file "${track.title}" from disk?`);

        if (!confirmed) {
            return;
        }

        try {
            const result = await libraryController.deleteTrackFile(trackFileId);
            if (!result.success) {
                showToast(result.error || '\u4ece\u78c1\u76d8\u5220\u9664\u6b4c\u66f2\u5931\u8d25', 'error', 2600);
                return;
            }

            showToast('\u5df2\u4ece\u78c1\u76d8\u5220\u9664\u6b4c\u66f2', 'success');
            this.removeTrackFromShellState(track);
            this.notifyLibraryChanged();
        } catch (error) {
            console.error('[ui-next] deleteTrackFile failed', error);
            showToast('\u4ece\u78c1\u76d8\u5220\u9664\u6b4c\u66f2\u5931\u8d25', 'error', 2600);
        }
    }

    async refreshLibrarySnapshot(): Promise<void> {
        await this.requestLibrarySnapshotRefresh();
    }

    async waitForInitialShellReady(timeoutMs = 10000): Promise<boolean> {
        if (!this.initialShellReadyPromise) {
            return true;
        }

        return await Promise.race([
            this.initialShellReadyPromise.then(() => true).catch(() => false),
            new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), timeoutMs))
        ]);
    }

    private async refreshInitialNetEaseStateInBackground(): Promise<void> {
        await this.waitForNetEaseApiReadyForInitialShell();
        await Promise.allSettled([
            this.refreshNetEaseRecommendations({force: true}),
            this.syncNetEaseStatus(0, {force: true})
        ]);
    }

    private waitForNetEaseApiReadyForInitialShell(timeoutMs = 6500): Promise<boolean> {
        const neteaseApi = window.electronAPI?.netease;
        if (!neteaseApi) {
            return Promise.resolve(false);
        }

        const snapshot = neteaseApi.getApiStatus?.();
        if (snapshot?.state === 'ready') {
            netEaseApiClient.setApiEndpoint(snapshot.data.endpoint);
            return Promise.resolve(true);
        }
        if (snapshot?.state === 'unavailable') {
            netEaseApiClient.setApiEndpoint(snapshot.data.endpoint);
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            let settled = false;
            let readyUnsubscribe: (() => void) | undefined;
            let unavailableUnsubscribe: (() => void) | undefined;
            const finish = (ready: boolean, endpoint?: string): void => {
                if (settled) {
                    return;
                }
                settled = true;
                if (endpoint) {
                    netEaseApiClient.setApiEndpoint(endpoint);
                }
                window.clearTimeout(timer);
                readyUnsubscribe?.();
                unavailableUnsubscribe?.();
                resolve(ready);
            };
            const timer = window.setTimeout(() => finish(false), timeoutMs);
            readyUnsubscribe = neteaseApi.onApiReady((data) => finish(true, data.endpoint));
            unavailableUnsubscribe = neteaseApi.onApiUnavailable((data) => finish(false, data.endpoint));
        });
    }

    toggleOfflinePlayableFilter(): void {
        this.shell.state.offlineFilter = !this.shell.state.offlineFilter;
        this.shell.render();
    }

    async onCorrectLocalMatch(track: UINextTrack): Promise<void> {
        if (track.source !== 'netease') {
            showToast('只有网易云曲目需要纠正本地匹配', 'info', 2200);
            return;
        }

        try {
            const result = await window.electronAPI?.dialog?.showOpenDialog({
                title: '选择本地音乐文件',
                properties: ['openFile'],
                filters: [{name: 'Music', extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg']}]
            }) as {canceled?: boolean; filePaths?: string[]} | undefined;

            if (!result || result.canceled || !result.filePaths?.length) {
                return;
            }

            const localTrack = this.findLocalTrackByPath(result.filePaths[0]);
            if (!localTrack) {
                showToast('请先把这个本地文件加入曲库，再纠正匹配', 'error', 3200);
                return;
            }

            netEaseLocalMatchService.saveCorrection(track.originalTrack, localTrack);
            this.refreshCurrentTrackSurfaces();
            showToast(`本地匹配已更新：${localTrack.title || localTrack.fileName || '本地歌曲'}`, 'success', 2400);
        } catch (error) {
            console.error('[ui-next] onCorrectLocalMatch failed', error);
            showToast('本地匹配更新失败', 'error', 2400);
        }
    }

    private async loadLibrarySnapshot(): Promise<void> {
        try {
            const [tracks, playlists] = await Promise.all([
                libraryController.getTracks(),
                libraryController.getPlaylists()
            ]);

            this.libraryTracks = tracks;
            const libraryTracks = this.filterLibraryVisibleTracks(tracks);
            const uiTracks = libraryTracks.map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.libraryTrackById.clear();
            tracks.forEach((track) => {
                this.libraryTrackById.set(this.trackId(track), track);
            });

            this.shell.mock.tracks = uiTracks;
            this.shell.state.libraryCount = uiTracks.length;
            const uiPlaylists = playlists.map((playlist) => ({
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                cover: this.resolvePlaylistCover(playlist),
                coverSourceUrl: this.resolvePlaylistCover(playlist),
                trackCount: playlist.trackCount || playlist.trackIds?.length || playlist.tracks?.length || 0,
                source: this.resolvePlaylistSource(playlist),
                externalId: this.getPlaylistExternalId(playlist),
                externalType: this.getPlaylistExternalType(playlist),
                updatedAt: playlist.modifiedAt ? new Date(playlist.modifiedAt).toLocaleDateString() : undefined,
                trackIds: playlist.trackIds || (playlist.tracks || []).map((track) => this.trackId(track))
            })).map((playlist) => {
                const cachedPlaylistCover = playlistCoverManifest.resolveCachedPlaylistCover(playlist);
                return {
                    ...playlist,
                    cover: cachedPlaylistCover || (this.isRemoteCoverUrl(playlist.cover) ? undefined : playlist.cover)
                };
            });
            this.shell.mock.playlists = uiPlaylists;
            void playlistCoverManifest.preloadStableCoverMetadata(uiPlaylists);
            this.shell.mock.byId = (trackId: string) => {
                return this.shell.mock.tracks.find((track) => track.id === trackId) || null;
            };
            this.shell.mock.playlistById = (playlistId: string) => {
                return this.shell.mock.playlists.find((playlist) => playlist.id === playlistId) || null;
            };
            this.playlistTrackCache.clear();
            playlists.forEach((playlist) => {
                const playlistTracks = this.resolvePlaylistTracks(playlist);
                this.playlistTrackCache.set(
                    playlist.id,
                    playlistTracks.map((track) => this.toUINextTrack(track, this.resolveSource(track)))
                );
            });
            this.shell.mock.tracksForPlaylist = (playlistId: string) => {
                return this.playlistTrackCache.get(playlistId) || [];
            };

            const history = recentPlaybackHistoryService.loadHistory(20)
                .map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.shell.state.homeRecent = history.slice(0, 6);
            this.shell.state.homeRecommended = this.shell.mock.playlists.filter((playlist) => playlist.source === 'local');
            this.shell.state.homeNetEase = this.buildNetEaseRecommendedPlaylists();
            this.shell.state.homeFavorites = this.filterFavoriteVisibleTracks(tracks)
                .map((track) => this.toUINextTrack(track, this.resolveSource(track)));
            this.shell.state.homeDailyDesktop = this.buildDailyMusicDesktop(uiTracks, history, this.shell.state.homeFavorites, this.neteaseRecommendedSongs);
            this.refreshMigrationDashboardState();
            this.refreshNetEaseAccountCenterState();
            if (history.length > 0) {
                this.shell.mock.queue.tracks = history;
                this.shell.mock.queue.currentIndex = 0;
            }

            this.shell.render();
        } catch (error) {
            console.error('[ui-next] failed to load library snapshot', error);
        }
    }

    private requestLibrarySnapshotRefresh(): Promise<void> {
        if (this.librarySnapshotPromise) {
            return this.librarySnapshotPromise;
        }

        this.librarySnapshotPromise = this.loadLibrarySnapshot().finally(() => {
            this.librarySnapshotPromise = null;
        });
        return this.librarySnapshotPromise;
    }

    private notifyLibraryChanged(): void {
        libraryController.emitLibraryUpdated([]);
        this.scheduleLibrarySnapshotReconcile();
    }

    private scheduleLibrarySnapshotReconcile(): void {
        if (this.librarySnapshotReconcileTimer) {
            window.clearTimeout(this.librarySnapshotReconcileTimer);
        }

        this.librarySnapshotReconcileTimer = window.setTimeout(() => {
            this.librarySnapshotReconcileTimer = 0;
            void this.requestLibrarySnapshotRefresh();
        }, 180);
    }

    private applyCreatedPlaylistOptimistically(playlist: unknown): void {
        const value = playlist as {
            id?: string;
            name?: string;
            description?: string;
            trackCount?: number;
            trackIds?: string[];
            tracks?: Track[];
            modifiedAt?: number;
            source?: string;
        };
        if (!value?.id || !value.name) {
            return;
        }

        const nextPlaylist: UINextPlaylist = {
            id: value.id,
            name: value.name,
            description: value.description,
            cover: this.resolvePlaylistCover(value),
            trackCount: value.trackCount || value.trackIds?.length || value.tracks?.length || 0,
            source: this.resolvePlaylistSource(value),
            externalId: this.getPlaylistExternalId(value),
            externalType: this.getPlaylistExternalType(value),
            updatedAt: value.modifiedAt ? new Date(value.modifiedAt).toLocaleDateString() : undefined,
            trackIds: value.trackIds || (value.tracks || []).map((track) => this.trackId(track))
        };
        const existingIndex = this.shell.mock.playlists.findIndex((item) => item.id === nextPlaylist.id);
        if (existingIndex >= 0) {
            this.shell.mock.playlists[existingIndex] = nextPlaylist;
        } else {
            this.shell.mock.playlists.push(nextPlaylist);
        }
        this.playlistTrackCache.set(nextPlaylist.id, []);
        this.refreshPlaylistDerivedSurfaces();
        this.shell.render();
    }

    private applyDeletedPlaylistOptimistically(playlistId: string): void {
        this.shell.mock.playlists = this.shell.mock.playlists.filter((playlist) => playlist.id !== playlistId);
        this.playlistTrackCache.delete(playlistId);
        if (this.shell.state.activePlaylistId === playlistId) {
            this.shell.state.view = 'home';
            this.shell.state.activePlaylistId = null;
            this.shell.state.viewTracks = [];
        }
        this.refreshPlaylistDerivedSurfaces();
        this.shell.render();
    }

    private applyRenamedPlaylistOptimistically(playlistId: string, nextName: string): void {
        const playlist = this.shell.mock.playlists.find((item) => item.id === playlistId);
        if (!playlist) {
            return;
        }
        playlist.name = nextName;
        playlist.updatedAt = new Date().toLocaleDateString();
        this.refreshPlaylistDerivedSurfaces();
        this.shell.render();
    }

    private refreshPlaylistDerivedSurfaces(): void {
        this.shell.state.homeRecommended = this.shell.mock.playlists.filter((playlist) => playlist.source === 'local');
        this.shell.state.homeNetEase = this.buildNetEaseRecommendedPlaylists();
        this.scheduleNetEaseRecommendationCoverHydration(this.shell.state.homeNetEase);
        this.refreshMigrationDashboardState();
        this.refreshNetEaseAccountCenterState();
    }

    private async refreshNetEaseRecommendations(options: {force?: boolean} = {}): Promise<void> {
        if (this.neteaseRecommendationRefreshPromise && !options.force) {
            return this.neteaseRecommendationRefreshPromise;
        }

        this.neteaseRecommendationRefreshPromise = (async () => {
            try {
                const [dailySongsResult, recommendedPlaylistsResult] = await Promise.allSettled([
                    netEaseRecommendationService.getDailySongs(options),
                    netEaseRecommendationService.getRecommendedPlaylists(12, options)
                ]);
                const dailySongs = dailySongsResult.status === 'fulfilled' ? dailySongsResult.value : [];
                const recommendedPlaylists = recommendedPlaylistsResult.status === 'fulfilled' ? recommendedPlaylistsResult.value : [];

                if (dailySongsResult.status === 'rejected') {
                    console.warn('[ui-next] refreshNetEaseRecommendations daily songs failed', dailySongsResult.reason);
                }
                if (recommendedPlaylistsResult.status === 'rejected') {
                    console.warn('[ui-next] refreshNetEaseRecommendations playlists failed', recommendedPlaylistsResult.reason);
                }

                if (dailySongs.length > 0) {
                    this.neteaseRecommendedSongs = dailySongs
                        .map((track) => this.toUINextTrack(track, this.resolveSource(track)))
                        .slice(0, 30);
                }
                if (recommendedPlaylists.length > 0) {
                    this.neteaseRecommendedPlaylists = recommendedPlaylists;
                }

                const history = this.shell.state.homeRecent || [];
                const favorites = this.shell.state.homeFavorites || [];
                const libraryTracks = this.shell.mock.tracks || [];
                this.shell.state.homeNetEase = this.buildNetEaseRecommendedPlaylists();
                this.scheduleNetEaseRecommendationCoverHydration(this.shell.state.homeNetEase);
                this.shell.state.homeDailyDesktop = this.buildDailyMusicDesktop(
                    libraryTracks,
                    history,
                    favorites,
                    this.neteaseRecommendedSongs
                );
                this.shell.render();
            } catch (error) {
                console.warn('[ui-next] refreshNetEaseRecommendations failed', error);
            }
        })().finally(() => {
            this.neteaseRecommendationRefreshPromise = null;
        });

        return this.neteaseRecommendationRefreshPromise;
    }

    private buildNetEaseRecommendedPlaylists(): UINextPlaylist[] {
        const apiPlaylists = this.neteaseRecommendedPlaylists.map((playlist) => {
            const coverSourceUrl = playlist.cover;
            const uiPlaylist = {
                id: `netease-recommend-${playlist.id}`,
                name: playlist.name,
                description: playlist.description,
                cover: coverSourceUrl,
                coverSourceUrl,
                trackCount: playlist.trackCount,
                playCount: playlist.playCount,
                source: 'netease' as UINextSource,
                externalId: String(playlist.id),
                externalType: 'recommendation',
                trackIds: []
            };
            const cachedPlaylistCover = playlistCoverManifest.resolveCachedPlaylistCover(uiPlaylist);
            return {
                ...uiPlaylist,
                cover: cachedPlaylistCover || (this.isRemoteCoverUrl(uiPlaylist.cover) ? undefined : uiPlaylist.cover)
            };
        });

        const seen = new Set<string>();
        return apiPlaylists.filter((playlist) => {
            const key = playlist.externalId || playlist.id;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private scheduleNetEaseRecommendationCoverHydration(playlists: UINextPlaylist[]): void {
        const candidates = playlists.filter((playlist) => Boolean(playlist.coverSourceUrl));
        if (candidates.length === 0) {
            return;
        }

        void playlistCoverManifest.preloadStableCoverMetadata(candidates);
        for (const playlist of candidates) {
            const key = `${playlist.externalId || playlist.id}:${playlist.coverSourceUrl}`;
            if (this.neteaseRecommendationCoverHydrationKeys.has(key)) {
                continue;
            }
            this.neteaseRecommendationCoverHydrationKeys.add(key);
            void playlistCoverManifest.ensurePlaylistCover(playlist).then(() => {
                const cover = playlistCoverManifest.resolveCachedPlaylistCover(playlist);
                if (!cover) {
                    return;
                }
                const current = this.shell.state.homeNetEase || [];
                const index = current.findIndex((item) => item.id === playlist.id);
                if (index < 0) {
                    return;
                }
                current[index] = {
                    ...current[index],
                    cover,
                    coverSourceUrl: playlist.coverSourceUrl
                };
                this.shell.render();
            }).finally(() => {
                this.neteaseRecommendationCoverHydrationKeys.delete(key);
            });
        }
    }

    private refreshMigrationDashboardState(): void {
        this.shell.state.migrationDashboard = this.buildMigrationDashboardState();
    }

    private refreshNetEaseAccountCenterState(): void {
        this.shell.state.neteaseAccountCenter = this.buildNetEaseAccountCenterState();
    }

    private async refreshLibrarySnapshotAfterNetEaseMigration(): Promise<void> {
        await this.loadLibrarySnapshot();
        this.refreshPlaylistDerivedSurfaces();
        this.shell.render();
    }

    private setNetEaseAssetMigrationRunning(running: boolean): void {
        if (this.shell.state.neteaseAssetMigrationRunning === running) {
            return;
        }

        this.shell.state.neteaseAssetMigrationRunning = running;
        if (typeof this.shell.renderNetEaseAccountStatus === 'function') {
            this.shell.renderNetEaseAccountStatus();
            return;
        }

        this.shell.render();
    }

    private buildNetEaseAccountCenterState(): UINextNetEaseAccountCenterState {
        const dashboard = this.shell.state.migrationDashboard || this.buildMigrationDashboardState();
        const reports = dashboard.reports || [];
        const syncStates = dashboard.syncStates || [];
        const neteasePlaylists = this.shell.mock.playlists.filter((playlist) => playlist.source === 'netease');
        const playlistType = (playlist: UINextPlaylist) => String(playlist.externalType || '').toLowerCase();
        const reportText = (report: NetEaseMigrationReport & {kindLabel?: string}) => [
            report.playlistName,
            report.kind,
            report.kindLabel
        ].join(' ').toLowerCase();

        return {
            status: this.shell.state.neteaseStatus || 'signed-out',
            nickname: this.shell.state.neteaseNickname || '',
            avatarUrl: this.shell.state.neteaseAvatarUrl || '',
            lastSyncText: this.shell.state.neteaseLastSyncText || '尚未同步',
            syncStatus: this.shell.state.neteaseSyncStatus || '未登录',
            likedPlaylistCount: neteasePlaylists.filter((playlist) => {
                const type = playlistType(playlist);
                return type.includes('liked') || type.includes('favorite-song') || playlist.name.includes('我喜欢');
            }).length || reports.filter((report) => reportText(report).includes('我喜欢')).length,
            createdPlaylistCount: neteasePlaylists.filter((playlist) => playlistType(playlist).includes('created')).length,
            favoritePlaylistCount: neteasePlaylists.filter((playlist) => {
                const type = playlistType(playlist);
                return type.includes('subscribed') || type.includes('favorite-playlist');
            }).length,
            recentPlaybackCount: neteasePlaylists.filter((playlist) => {
                const type = playlistType(playlist);
                return type.includes('recent') || playlist.name.includes('最近播放');
            }).length || reports.filter((report) => reportText(report).includes('最近播放')).length,
            migratedTrackCount: reports.reduce((total, report) => total + (report.added || 0) + (report.existing || 0), 0),
            failureCount: (dashboard.summary?.failed || 0) + syncStates.filter((state) => state.status === 'failed' || state.status === 'conflict').length,
            retryableCount: dashboard.syncSummary?.retryable || syncStates.filter((state) => state.retryable).length
        };
    }

    private buildMigrationDashboardState(): UINextMigrationDashboardState {
        const reports = netEaseMigrationReportService.getRecentReports();
        const syncStates = Object.values(netEaseSyncStateService.getAllPlaylistSyncStates());
        const playlistNameById = new Map(this.shell.mock.playlists.map((playlist) => [playlist.id, playlist.name]));
        const lastReportAt = reports.reduce((latest, report) => Math.max(latest, report.createdAt || 0), 0);
        const lastSyncAt = syncStates.reduce((latest, state) => {
            return Math.max(latest, state.lastSuccessfulSyncAt || state.lastAttemptAt || 0);
        }, 0);

        return {
            summary: {
                reportCount: reports.length,
                completedCount: reports.filter((report) => report.status === 'completed' || report.status === 'synced').length,
                partialCount: reports.filter((report) => report.status === 'partial').length,
                failedCount: reports.filter((report) => report.status === 'failed').length,
                undoneCount: reports.filter((report) => report.status === 'undone').length,
                cancelledCount: reports.filter((report) => report.status === 'cancelled').length,
                added: reports.reduce((total, report) => total + (report.added || 0), 0),
                existing: reports.reduce((total, report) => total + (report.existing || 0), 0),
                skipped: reports.reduce((total, report) => total + (report.skipped || 0), 0),
                failed: reports.reduce((total, report) => total + (report.failed || 0), 0),
                duplicates: reports.reduce((total, report) => total + (report.duplicates || 0), 0),
                lastActivityText: this.formatMigrationTime(Math.max(lastReportAt, lastSyncAt))
            },
            habitSummary: this.buildMigrationHabitSummary(reports, syncStates),
            syncSummary: {
                total: syncStates.length,
                success: syncStates.filter((state) => state.status === 'success').length,
                failed: syncStates.filter((state) => state.status === 'failed').length,
                conflict: syncStates.filter((state) => state.status === 'conflict').length,
                retryable: syncStates.filter((state) => state.retryable).length
            },
            syncStates: syncStates
                .map((state) => ({
                    ...state,
                    playlistName: playlistNameById.get(state.playlistId),
                    lastActivityText: this.formatMigrationTime(state.lastSuccessfulSyncAt || state.lastAttemptAt || 0)
                }))
                .sort((a, b) => (b.lastAttemptAt || b.lastSuccessfulSyncAt || 0) - (a.lastAttemptAt || a.lastSuccessfulSyncAt || 0)),
            reports: reports.map((report) => ({
                ...report,
                createdAtText: this.formatMigrationTime(report.createdAt),
                statusLabel: this.formatMigrationReportStatus(report.status),
                kindLabel: report.kind === 'playlist-sync' ? '同步' : '导入'
            })),
            expandedReportIds: this.shell.state.migrationDashboard?.expandedReportIds || [],
            diagnostics: this.buildMigrationDiagnosticsState(reports, syncStates)
        };
    }

    private buildMigrationHabitSummary(
        reports: NetEaseMigrationReport[],
        syncStates: NetEasePlaylistSyncState[]
    ): UINextMigrationHabitSummary {
        const neteasePlaylists = this.shell.mock.playlists.filter((playlist) => playlist.source === 'netease');
        const playlistType = (playlist: UINextPlaylist) => String(playlist.externalType || '').toLowerCase();
        const reportText = (report: NetEaseMigrationReport & {kindLabel?: string}) => [
            report.playlistName,
            report.kind,
            report.kindLabel
        ].join(' ').toLowerCase();
        const likedPlaylistCount = neteasePlaylists.filter((playlist) => {
            const type = playlistType(playlist);
            return type.includes('liked') || type.includes('favorite-song') || playlist.name.includes('我喜欢');
        }).length || reports.filter((report) => reportText(report).includes('我喜欢')).length;
        const createdPlaylistCount = neteasePlaylists.filter((playlist) => playlistType(playlist).includes('created')).length;
        const favoritePlaylistCount = neteasePlaylists.filter((playlist) => {
            const type = playlistType(playlist);
            return type.includes('subscribed') || type.includes('favorite-playlist');
        }).length;
        const recentPlaybackCount = neteasePlaylists.filter((playlist) => {
            const type = playlistType(playlist);
            return type.includes('recent') || playlist.name.includes('最近播放');
        }).length || reports.filter((report) => reportText(report).includes('最近播放')).length;
        const migratedTrackCount = reports.reduce((total, report) => total + (report.added || 0) + (report.existing || 0), 0);
        const failureCount = reports.reduce((total, report) => total + (report.failed || 0), 0)
            + syncStates.filter((state) => state.status === 'failed' || state.status === 'conflict').length;
        const retryableCount = syncStates.filter((state) => state.retryable).length;

        return {
            likedPlaylistCount,
            createdPlaylistCount,
            favoritePlaylistCount,
            recentPlaybackCount,
            migratedTrackCount,
            failureCount,
            retryableCount,
            confidenceLabel: migratedTrackCount > 0 || likedPlaylistCount > 0 || recentPlaybackCount > 0
                ? '已建立网易云听歌画像'
                : '等待导入网易云习惯',
            actions: this.buildMigrationHabitActions({
                likedPlaylistCount,
                createdPlaylistCount,
                favoritePlaylistCount,
                recentPlaybackCount,
                migratedTrackCount,
                failureCount,
                retryableCount
            })
        };
    }

    private buildMigrationHabitActions(summary: {
        likedPlaylistCount: number;
        createdPlaylistCount: number;
        favoritePlaylistCount: number;
        recentPlaybackCount: number;
        migratedTrackCount: number;
        failureCount: number;
        retryableCount: number;
    }): UINextMigrationHabitSummary['actions'] {
        const actions: UINextMigrationHabitSummary['actions'] = [];
        if (summary.likedPlaylistCount === 0) {
            actions.push({
                label: '补全红心偏好',
                detail: '迁移完成后，今日推荐会更贴近你的网易云习惯。',
                tone: 'warning'
            });
        }
        if (summary.recentPlaybackCount === 0) {
            actions.push({
                label: '导入最近播放',
                detail: '最近播放会决定继续听和最近沉迷内容。',
                tone: 'info'
            });
        }
        if (summary.retryableCount > 0 || summary.failureCount > 0) {
            actions.push({
                label: '处理失败和重试',
                detail: `还有 ${summary.retryableCount} 个可重试同步，${summary.failureCount} 个失败风险。`,
                tone: 'danger'
            });
        }
        if (!actions.length) {
            actions.push({
                label: '习惯迁移可用',
                detail: `已迁移 ${summary.migratedTrackCount} 首线索，可以进入今日音乐桌面。`,
                tone: 'success'
            });
        }
        return actions.slice(0, 3);
    }

    private buildMigrationDiagnosticsState(
        reports: NetEaseMigrationReport[],
        syncStates: NetEasePlaylistSyncState[]
    ): UINextMigrationDiagnosticsState {
        const failedReportCount = reports.filter((report) => report.status === 'failed' || report.failed > 0).length;
        const cancelledReportCount = reports.filter((report) => report.status === 'cancelled').length;
        const retryableSyncCount = syncStates.filter((state) => state.retryable).length;
        const failedSyncCount = syncStates.filter((state) => state.status === 'failed').length;
        const conflictSyncCount = syncStates.filter((state) => state.status === 'conflict').length;
        const apiStatus = this.shell.state.neteaseStatus === 'offline' ? '不可用' : '可连接';
        const loginStatus = this.shell.state.neteaseSyncStatus || (netEaseAuthService.isAuthenticated ? '登录状态待确认' : '未登录');
        const generatedAtText = new Date().toLocaleString('zh-CN');
        const reportSummary = `报告 ${reports.length} 个，失败报告 ${failedReportCount} 个，取消报告 ${cancelledReportCount} 个`;
        const syncSummary = `同步状态 ${syncStates.length} 个，可重试同步 ${retryableSyncCount} 个，失败 ${failedSyncCount} 个，冲突 ${conflictSyncCount} 个`;
        const lines = [
            'Auralux 网易云迁移诊断',
            `生成时间: ${generatedAtText}`,
            '敏感信息: 已脱敏，不包含 Cookie 或账号令牌',
            `NetEase API: ${apiStatus} (${netEaseApiClient.apiEndpoint})`,
            `登录状态: ${loginStatus}`,
            `迁移报告: ${reportSummary}`,
            `同步状态: ${syncSummary}`,
            `最后活动: ${this.shell.state.migrationDashboard?.summary?.lastActivityText || '暂无记录'}`,
            '最近失败:',
            ...reports
                .filter((report) => report.status === 'failed' || report.failed > 0)
                .slice(0, 5)
                .map((report) => `- ${report.playlistName}: ${report.failures?.[0]?.reason || report.status}`),
            '可重试同步:',
            ...syncStates
                .filter((state) => state.retryable)
                .slice(0, 5)
                .map((state) => `- ${state.playlistId}: ${state.failureReason || state.status}`)
        ];

        return {
            generatedAtText,
            apiStatus,
            loginStatus,
            reportSummary,
            syncSummary,
            failedReportCount,
            retryableSyncCount,
            redactionNotice: '已脱敏，不包含 Cookie、二维码 key 或账号令牌。',
            copyText: lines.join('\n')
        };
    }

    private formatMigrationTime(value: number): string {
        if (!value) {
            return '暂无记录';
        }
        return new Date(value).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    private formatMigrationReportStatus(status: NetEaseMigrationReport['status']): string {
        if (status === 'completed') return '已完成';
        if (status === 'synced') return '已同步';
        if (status === 'partial') return '部分完成';
        if (status === 'failed') return '失败';
        if (status === 'undone') return '已撤销';
        if (status === 'cancelled') return '已取消';
        return status;
    }

    private loadSettingsSnapshot(): void {
        this.shell.state.settings = this.toSettingsState(this.readSettings());
        this.loadImmersiveSettingsSnapshot();
        void this.loadSettingsDetails();
    }

    private readSettings(): MusicBoxSettings {
        return (cacheManager.getLocalCache('musicbox-settings') || {}) as MusicBoxSettings;
    }

    private toSettingsState(settings: MusicBoxSettings): UINextSettingsState {
        const exclusiveModeSettings = audioEngineSettingsController.getExclusiveModeSettings(settings);
        const desktopLyricsSettings = displayModeSettingsController.getDesktopLyricsSettings(settings);
        const miniModeSettings = displayModeSettingsController.getMiniModeSettings(settings);
        const lyricsAppearanceSettings = lyricsAppearanceSettingsService.getSettings(settings);
        const previous = this.shell.state.settings;

        return {
            autoplay: typeof settings.autoplay === 'boolean' ? settings.autoplay : false,
            rememberPosition: typeof settings.rememberPosition === 'boolean' ? settings.rememberPosition : false,
            playerTheme: settings.playerTheme === 'sonic-topography' ? 'sonic-topography' : 'default',
            regionTone: this.normalizeRegionTone(settings.regionTone),
            desktopLyrics: typeof settings.desktopLyrics === 'boolean' ? settings.desktopLyrics : true,
            showTrackCovers: typeof settings.showTrackCovers === 'boolean' ? settings.showTrackCovers : true,
            gaplessPlayback: typeof settings.gaplessPlayback === 'boolean' ? settings.gaplessPlayback : false,
            exclusiveMode: exclusiveModeSettings.enabled,
            wasapiShareMode: exclusiveModeSettings.shareMode,
            wasapiAvailable: exclusiveModeSettings.available,
            networkDriveEnabled: typeof settings.networkDriveEnabled === 'boolean' ? settings.networkDriveEnabled : false,
            musicFolders: previous?.musicFolders || [],
            autoScanEnabled: previous?.autoScanEnabled || false,
            scanFrequency: previous?.scanFrequency || 'on_startup',
            lyricsDirectory: typeof settings.lyricsDirectory === 'string' ? settings.lyricsDirectory : '',
            coverCacheDirectory: typeof settings.coverCacheDirectory === 'string' ? settings.coverCacheDirectory : (previous?.coverCacheDirectory || ''),
            cacheDescription: previous?.cacheDescription || '',
            cacheBusy: previous?.cacheBusy || '',
            lyricsHighlightOpacity: lyricsAppearanceSettings.highlightOpacity,
            lyricsHighlightColor: lyricsAppearanceSettings.highlightColor,
            desktopLyricsDisplayMode: desktopLyricsSettings.displayMode,
            desktopLyricsLayoutMode: desktopLyricsSettings.layoutMode,
            desktopLyricsThemeColor: desktopLyricsSettings.themeColor,
            desktopLyricsFontColor: desktopLyricsSettings.fontColor,
            desktopLyricsOpacity: desktopLyricsSettings.opacity,
            desktopLyricsFontSize: desktopLyricsSettings.fontSize,
            desktopLyricsSettings,
            miniModeFontColor: miniModeSettings.fontColor,
            miniModeHighlightColor: miniModeSettings.highlightColor,
            miniModeFontSize: miniModeSettings.fontSize,
            hardwareAcceleration: previous?.hardwareAcceleration ?? true,
            systemTray: typeof settings.systemTray === 'boolean' ? settings.systemTray : true,
            trayCloseBehavior: typeof settings.trayCloseBehavior === 'string' ? settings.trayCloseBehavior : 'exit',
            trayStartMinimized: typeof settings.trayStartMinimized === 'boolean' ? settings.trayStartMinimized : false
        };
    }

    private async loadSettingsDetails(): Promise<void> {
        const settings = this.readSettings();
        try {
            const [musicFolders, autoScanSettings, hardwareAcceleration, coverCacheDirectory] = await Promise.all([
                musicFolderSettingsService.getMusicFolders().catch(() => []),
                musicFolderSettingsService.getAutoScanSettings().catch(() => ({enabled: false, frequency: 'on_startup'})),
                hardwareAccelerationSettingsController.getInitialEnabled().catch(() => true),
                mediaDirectorySettingsService.resolveCoverCacheDirectory(
                    typeof settings.coverCacheDirectory === 'string' ? settings.coverCacheDirectory : null
                ).catch(() => ({directory: null, shouldPersist: false}))
            ]);

            if (coverCacheDirectory.directory && coverCacheDirectory.shouldPersist) {
                const nextSettings = this.applySettingValue(this.readSettings(), 'coverCacheDirectory', coverCacheDirectory.directory);
                cacheManager.setLocalCache('musicbox-settings', nextSettings);
                mediaDirectorySettingsService.applyCoverDirectory(coverCacheDirectory.directory);
            } else if (coverCacheDirectory.directory) {
                mediaDirectorySettingsService.applyCoverDirectory(coverCacheDirectory.directory);
            }

            const lyricsDirectory = typeof settings.lyricsDirectory === 'string' ? settings.lyricsDirectory : '';
            if (lyricsDirectory) {
                mediaDirectorySettingsService.applyLyricsDirectory(lyricsDirectory);
            }

            this.patchSettingsState({
                musicFolders,
                autoScanEnabled: autoScanSettings.enabled,
                scanFrequency: autoScanSettings.frequency,
                hardwareAcceleration,
                coverCacheDirectory: coverCacheDirectory.directory || ''
            });
        } catch (error) {
            console.error('[ui-next] load settings details failed', error);
        }
    }

    private patchSettingsState(partial: Partial<UINextSettingsState>): void {
        this.shell.state.settings = {
            ...this.toSettingsState(this.readSettings()),
            ...(this.shell.state.settings || {}),
            ...partial
        };
        this.shell.render();
    }

    private applySettingValue(settings: MusicBoxSettings, key: UINextSettingsKey, value: boolean | string | number): MusicBoxSettings {
        if (key.startsWith('desktopLyrics') && key !== 'desktopLyrics') {
            const desktopKey = key.replace(/^desktopLyrics/, '');
            const normalizedKey = desktopKey ? desktopKey.charAt(0).toLowerCase() + desktopKey.slice(1) : key;
            return {
                ...settings,
                desktopLyricsSettings: {
                    ...((settings.desktopLyricsSettings || {}) as Record<string, unknown>),
                    [normalizedKey]: value
                }
            };
        }

        if (key.startsWith('miniMode')) {
            const miniKey = key.replace(/^miniMode/, '');
            const normalizedKey = miniKey ? miniKey.charAt(0).toLowerCase() + miniKey.slice(1) : key;
            return {
                ...settings,
                miniModeSettings: {
                    ...((settings.miniModeSettings || {}) as Record<string, unknown>),
                    [normalizedKey]: value
                }
            };
        }

        return {
            ...settings,
            [key]: key === 'regionTone' ? this.normalizeRegionTone(value) : value
        };
    }

    private normalizeRegionTone(value: unknown): string {
        switch (value) {
            case 'default':
            case 'peach-blush':
            case 'lilac-sun':
            case 'candy-violet':
            case 'apricot-sky':
            case 'aqua-dream':
            case 'lime-mint':
                return value;
            default:
                return 'default';
        }
    }

    private loadImmersiveSettingsSnapshot(): void {
        const settings = this.readImmersiveSettings();
        this.shell.state.immersiveLyricsMode = settings.lyricsMode;
        this.shell.state.immersiveVisualizerStyle = settings.visualizerStyle;
        this.shell.state.immersiveBackground = {
            type: settings.backgroundType,
            src: this.resolveImmersiveBackgroundSrc(settings),
            originalSrc: settings.backgroundOriginalSrc || '',
            status: settings.backgroundType === 'video' && (settings.backgroundOptimizedSrc || settings.backgroundQuality === 'original') ? 'optimized' : 'idle',
            statusText: settings.backgroundType === 'video'
                ? (settings.backgroundQuality === 'original' ? '\u539f\u7247\u76f4\u51fa' : (settings.backgroundOptimizedSrc ? '\u6b63\u5728\u4f7f\u7528\u7f13\u5b58' : ''))
                : '',
            quality: settings.backgroundQuality
        };
    }

    private readImmersiveSettings(): UINextImmersiveSettings {
        const settings = this.readSettings();
        const value = settings.uiNextImmersivePlayer as Partial<UINextImmersiveSettings> | undefined;
        const lyricsMode = value?.lyricsMode === 'wrap'
            || value?.lyricsMode === 'fragments'
            || value?.lyricsMode === 'rail'
            || value?.lyricsMode === 'standard'
            ? value.lyricsMode
            : 'standard';
        const backgroundType = value?.backgroundType === 'image'
            || value?.backgroundType === 'video'
            || value?.backgroundType === 'sonic-topography'
            ? value.backgroundType
            : 'cover';
        const visualizerStyle = value?.visualizerStyle === 'energy'
            || value?.visualizerStyle === 'pulse'
            || value?.visualizerStyle === 'orbit'
            || value?.visualizerStyle === 'classic'
            ? value.visualizerStyle
            : 'classic';

        const backgroundQuality = value?.backgroundQuality === 'smooth'
            || value?.backgroundQuality === 'quality'
            || value?.backgroundQuality === 'original'
            ? value.backgroundQuality
            : 'quality';

        return {
            lyricsMode,
            visualizerStyle,
            backgroundType,
            backgroundSrc: typeof value?.backgroundSrc === 'string' ? value.backgroundSrc : '',
            backgroundOriginalSrc: typeof value?.backgroundOriginalSrc === 'string' ? value.backgroundOriginalSrc : '',
            backgroundOptimizedSrc: typeof value?.backgroundOptimizedSrc === 'string' ? value.backgroundOptimizedSrc : '',
            backgroundOptimizedPreset: typeof value?.backgroundOptimizedPreset === 'string' ? value.backgroundOptimizedPreset : '',
            backgroundQuality
        };
    }

    private resolveImmersiveBackgroundSrc(settings: UINextImmersiveSettings): string {
        if (settings.backgroundType === 'video') {
            if (settings.backgroundQuality === 'original') {
                return settings.backgroundOriginalSrc || settings.backgroundSrc || '';
            }
            return settings.backgroundOptimizedSrc || settings.backgroundSrc || settings.backgroundOriginalSrc || '';
        }
        return settings.backgroundSrc || '';
    }

    private updateImmersiveSettings(partial: Partial<UINextImmersiveSettings>): void {
        const settings = this.readSettings();
        const current = this.readImmersiveSettings();
        const nextImmersive: UINextImmersiveSettings = {
            ...current,
            ...partial
        };
        const nextSettings: MusicBoxSettings = {
            ...settings,
            uiNextImmersivePlayer: nextImmersive
        };

        cacheManager.setLocalCache('musicbox-settings', nextSettings);
        const previousBackground = this.shell.state.immersiveBackground;
        this.shell.state.immersiveLyricsMode = nextImmersive.lyricsMode;
        this.shell.state.immersiveVisualizerStyle = nextImmersive.visualizerStyle;
        this.shell.state.immersiveBackground = {
            type: nextImmersive.backgroundType,
            src: this.resolveImmersiveBackgroundSrc(nextImmersive),
            originalSrc: nextImmersive.backgroundOriginalSrc || '',
            status: previousBackground?.status || 'idle',
            statusText: previousBackground?.statusText || '',
            quality: nextImmersive.backgroundQuality
        };
        this.shell.render();
    }

    getFrequencySpectrum(binCount = 64): number[] {
        return playbackController.getFrequencySpectrum(binCount);
    }

    retryCurrentLyrics(): void {
        void this.reloadCurrentLyrics();
    }

    private async reloadCurrentLyrics(): Promise<void> {
        await this.loadCurrentLyrics({forceRefresh: true});
    }

    private async loadCurrentLyrics(options: {forceRefresh?: boolean} = {}): Promise<void> {
        const track = this.shell.state.currentTrack;
        const session = ++this.immersiveLyricsSession;
        if (!track) {
            this.shell.state.immersiveLyrics = [];
            this.shell.state.immersiveLyricsLoading = false;
            this.shell.state.immersiveLyricsStatus = 'idle';
            this.shell.state.immersiveLyricsError = '';
            this.shell.render();
            return;
        }

        const original = this.resolveOriginalTrack(track);
        this.shell.state.immersiveLyricsLoading = true;
        this.shell.state.immersiveLyricsStatus = 'loading';
        this.shell.state.immersiveLyricsError = '';
        this.shell.render();

        try {
            const result = options.forceRefresh === true
                ? await lyricsContentService.loadTrackLyrics(original, {forceRefresh: true})
                : await lyricsContentService.loadTrackLyrics(original);
            if (session !== this.immersiveLyricsSession) {
                return;
            }
            this.shell.state.immersiveLyrics = result.success ? result.lyrics : [];
            if (result.success) {
                this.shell.state.immersiveLyricsStatus = 'ready';
                this.shell.state.immersiveLyricsError = '';
            } else if (result.error) {
                this.shell.state.immersiveLyricsStatus = 'error';
                this.shell.state.immersiveLyricsError = result.error;
            } else {
                this.shell.state.immersiveLyricsStatus = 'missing';
                this.shell.state.immersiveLyricsError = '暂无可用歌词';
            }
        } catch (error) {
            console.error('[ui-next] load immersive lyrics failed', error);
            if (session === this.immersiveLyricsSession) {
                this.shell.state.immersiveLyrics = [];
                this.shell.state.immersiveLyricsStatus = 'error';
                this.shell.state.immersiveLyricsError = error instanceof Error ? error.message : String(error);
            }
        } finally {
            if (session === this.immersiveLyricsSession) {
                this.shell.state.immersiveLyricsLoading = false;
                this.shell.render();
            }
        }
    }

    private async syncNetEaseStatus(attempt = 0, options: {force?: boolean} = {}): Promise<void> {
        if (attempt === 0) {
            if (this.netEaseStatusRefreshPromise) {
                return this.netEaseStatusRefreshPromise;
            }
            this.netEaseStatusRefreshPromise = this.runNetEaseStatusRefresh(attempt, options)
                .finally(() => {
                    this.netEaseStatusRefreshPromise = null;
                });
            return this.netEaseStatusRefreshPromise;
        }

        return await this.runNetEaseStatusRefresh(attempt, options);
    }

    private async runNetEaseStatusRefresh(attempt = 0, options: {force?: boolean} = {}): Promise<void> {
        const session = ++this.netEaseStatusRefreshSession;
        if (this.netEaseUnavailableRecoveryTimer) {
            window.clearTimeout(this.netEaseUnavailableRecoveryTimer);
            this.netEaseUnavailableRecoveryTimer = 0;
        }
        if (!options.force && attempt === 0 && this.shell.state.neteaseStatus === 'online') {
            return;
        }

        this.updateNetEaseAccountState({
            syncStatus: attempt === 0 ? '同步中' : '重试连接中'
        });

        try {
            const available = this.isNetEaseApiKnownReady() || await netEaseApiClient.checkAvailability();
            if (session !== this.netEaseStatusRefreshSession) {
                return;
            }
            if (!available) {
                this.updateNetEaseAccountState({
                    status: 'offline',
                    avatarUrl: '',
                    nickname: '',
                    syncStatus: '连接失败',
                    lastSyncText: this.formatNetEaseSyncTime(this.lastNetEaseSyncAt)
                });
                if (attempt < 40) {
                    window.setTimeout(() => {
                        void this.syncNetEaseStatus(attempt + 1);
                    }, 1500);
                }
                return;
            }

            const account = await netEaseAuthService.getAccountProfile();
            if (session !== this.netEaseStatusRefreshSession) {
                return;
            }
            this.lastNetEaseSyncAt = Date.now();
            this.updateNetEaseAccountState({
                status: account ? 'online' : 'signed-out',
                avatarUrl: account?.avatarUrl || '',
                nickname: account?.nickname || '',
                syncStatus: account ? '同步正常' : (netEaseApiClient.isAuthenticated ? '登录已过期，请重新登录' : '未登录'),
                lastSyncText: this.formatNetEaseSyncTime(this.lastNetEaseSyncAt)
            });
        } catch {
            if (session !== this.netEaseStatusRefreshSession) {
                return;
            }
            this.updateNetEaseAccountState({
                status: 'offline',
                avatarUrl: '',
                nickname: '',
                syncStatus: '同步失败',
                lastSyncText: this.formatNetEaseSyncTime(this.lastNetEaseSyncAt)
            });
        }
    }

    private isNetEaseApiKnownReady(): boolean {
        const status = window.electronAPI?.netease?.getApiStatus?.();
        if (status?.state !== 'ready') {
            return false;
        }
        netEaseApiClient.setApiEndpoint(status.data.endpoint);
        return true;
    }

    private handleNetEaseApiUnavailable(): void {
        this.updateNetEaseAccountState({
            status: 'offline',
            avatarUrl: '',
            nickname: '',
            syncStatus: '连接失败',
            lastSyncText: this.formatNetEaseSyncTime(this.lastNetEaseSyncAt)
        });
        this.scheduleNetEaseUnavailableRecovery();
    }

    private scheduleNetEaseUnavailableRecovery(): void {
        if (this.netEaseUnavailableRecoveryTimer) {
            window.clearTimeout(this.netEaseUnavailableRecoveryTimer);
        }

        this.netEaseUnavailableRecoveryTimer = window.setTimeout(() => {
            this.netEaseUnavailableRecoveryTimer = 0;
            void this.syncNetEaseStatus(0, {force: true});
        }, 2500);
    }

    private updateNetEaseAccountState(next: {
        status?: string;
        avatarUrl?: string;
        nickname?: string;
        syncStatus?: string;
        lastSyncText?: string;
    }): void {
        if (next.status !== undefined) {
            this.shell.state.neteaseStatus = next.status;
        }
        if (next.avatarUrl !== undefined) {
            this.shell.state.neteaseAvatarUrl = next.avatarUrl;
        }
        if (next.nickname !== undefined) {
            this.shell.state.neteaseNickname = next.nickname;
        }
        if (next.syncStatus !== undefined) {
            this.shell.state.neteaseSyncStatus = next.syncStatus;
        }
        if (next.lastSyncText !== undefined) {
            this.shell.state.neteaseLastSyncText = next.lastSyncText;
        }
        this.refreshNetEaseAccountCenterState();
        this.shell.render();
    }

    private formatNetEaseSyncTime(value: number): string {
        if (!value) {
            return '尚未同步';
        }
        return `同步于 ${new Date(value).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    private async restorePlaybackMemory(): Promise<void> {
        try {
            const settings = this.readSettings();
            const playbackState = cacheManager.getLocalCache(PLAYBACK_STATE_CACHE_KEY) as PlaybackStateSnapshot | null;
            const queueMemory = cacheManager.getLocalCache(PLAYBACK_QUEUE_CACHE_KEY) as UINextPlaybackQueueMemory | null;
            const candidate = this.resolvePlaybackMemoryCandidate(settings, playbackState, queueMemory);

            if (!candidate) {
                return;
            }

            if (candidate.playMode) {
                playbackController.setPlayMode(candidate.playMode);
            }

            const {playlist, currentIndex, position} = candidate;
            await playbackController.setPlaylist(playlist, currentIndex);

            const trackToLoad = playlist[currentIndex];
            if (!trackToLoad) {
                this.syncPlaybackState();
                this.shell.render();
                return;
            }

            if (this.isTemporaryProbeTrack(trackToLoad)) {
                return;
            }

            const loaded = await playbackController.loadTrack(trackToLoad.filePath || trackToLoad.path || '');
            if (loaded && position > 0) {
                await playbackController.setPosition(position);
            }

            if (loaded && settings.autoplay) {
                window.setTimeout(() => {
                    void playbackController.play();
                }, 1000);
            }

            this.syncPlaybackState();
            void this.syncTrayPlaybackState();
            this.shell.render();
        } catch (error) {
            console.error('[ui-next] restorePlaybackMemory failed', error);
        }
    }

    private isTemporaryProbeTrack(track: Track): boolean {
        const filePath = String(track.filePath || track.path || '');
        return /(?:^|[\\/])AuraluxProbe[\\/]/.test(filePath)
            || /auralux-spectrum-probe/i.test(filePath);
    }

    private resolvePlaybackMemoryCandidate(
        settings: MusicBoxSettings,
        playbackState: PlaybackStateSnapshot | null,
        queueMemory: UINextPlaybackQueueMemory | null
    ): UINextPlaybackMemoryCandidate | null {
        if (settings.rememberPosition && playbackState) {
            const statePlaylist = this.normalizePlaybackMemoryPlaylist(playbackState.playlist);
            const playlist = statePlaylist.length > 0
                ? statePlaylist
                : this.normalizePlaybackMemoryPlaylist(playbackState.currentTrack ? [playbackState.currentTrack] : []);
            const currentIndex = this.normalizePlaybackMemoryIndex(playbackState.currentIndex, playlist);

            if (playlist.length > 0 && currentIndex >= 0) {
                return {
                    playlist,
                    currentIndex,
                    position: Math.max(0, Number(playbackState.position) || 0),
                    playMode: playbackState.playMode
                };
            }
        }

        const queuePlaylist = this.normalizePlaybackMemoryPlaylist(queueMemory?.playlist);
        const queueIndex = this.normalizePlaybackMemoryIndex(queueMemory?.currentIndex, queuePlaylist);
        if (queuePlaylist.length > 0 && queueIndex >= 0) {
            return {
                playlist: queuePlaylist,
                currentIndex: queueIndex,
                position: 0,
                playMode: queueMemory?.playMode
            };
        }

        return null;
    }

    private normalizePlaybackMemoryPlaylist(playlist: Track[] | null | undefined): Track[] {
        return (playlist || []).filter((track): track is Track => Boolean(track?.filePath || track?.path));
    }

    private normalizePlaybackMemoryIndex(index: number | null | undefined, playlist: Track[]): number {
        if (playlist.length === 0) {
            return -1;
        }

        return typeof index === 'number' && index >= 0 && index < playlist.length ? index : 0;
    }

    private syncPlaybackState(): void {
        const state = playbackController.getState();
        const queue = state.playlist.map((track) => this.toUINextTrack(track, this.resolveSource(track)));
        const displayTrack = this.resolvePlaybackDisplayTrack(state.currentTrack, state.playlist, state.currentIndex);
        const currentTrack = displayTrack
            ? this.toUINextTrack(displayTrack, this.resolveSource(displayTrack))
            : null;

        if (state.volume > 0) {
            this.lastNonZeroVolume = state.volume;
        }

        this.shell.state.currentTrack = currentTrack;
        this.updateCurrentPlaybackBadges();
        this.shell.state.isPlaying = state.isPlaying;
        this.shell.state.position = state.position || 0;
        this.shell.state.duration = state.duration || currentTrack?.duration || 0;
        this.shell.state.volume = state.volume;
        this.shell.state.muted = state.volume === 0;
        this.shell.state.playMode = this.toUINextPlayMode(state.playMode);
        this.shell.state.queue = {
            tracks: queue,
            currentIndex: state.currentIndex
        };
        this.schedulePlaybackTrackCoverRefresh(displayTrack);
    }

    private resolvePlaybackDisplayTrack(currentTrack: Track, playlist: Track[], currentIndex: number): Track;
    private resolvePlaybackDisplayTrack(currentTrack: Track | null, playlist: Track[], currentIndex: number): Track | null;
    private resolvePlaybackDisplayTrack(currentTrack: Track | null, playlist: Track[], currentIndex: number): Track | null {
        if (!currentTrack) {
            return null;
        }

        const queueTrack = this.findPlaybackQueueTrack(currentTrack, playlist, currentIndex);
        if (!queueTrack) {
            return currentTrack;
        }

        if (!this.hasPlaceholderPlaybackText(currentTrack)) {
            return {
                ...queueTrack,
                ...currentTrack,
                title: currentTrack.title || queueTrack.title,
                artist: currentTrack.artist || queueTrack.artist,
                album: currentTrack.album || queueTrack.album,
                cover: (currentTrack as Track & {cover?: unknown}).cover || (queueTrack as Track & {cover?: unknown}).cover,
                duration: currentTrack.duration || queueTrack.duration
            };
        }

        return {
            ...currentTrack,
            ...queueTrack,
            filePath: currentTrack.filePath || queueTrack.filePath,
            path: currentTrack.path || queueTrack.path,
            duration: currentTrack.duration || queueTrack.duration
        };
    }

    private findPlaybackQueueTrack(currentTrack: Track, playlist: Track[], currentIndex: number): Track | null {
        const indexedTrack = currentIndex >= 0 && currentIndex < playlist.length
            ? playlist[currentIndex]
            : null;
        if (indexedTrack && this.isSamePlaybackTrack(currentTrack, indexedTrack)) {
            return indexedTrack;
        }

        return playlist.find((track) => this.isSamePlaybackTrack(currentTrack, track)) || indexedTrack || null;
    }

    private isSamePlaybackTrack(left: Track, right: Track): boolean {
        const leftPath = left.filePath || left.path || '';
        const rightPath = right.filePath || right.path || '';
        if (leftPath && rightPath && leftPath === rightPath) {
            return true;
        }

        return Boolean(this.trackId(left) && this.trackId(left) === this.trackId(right));
    }

    private hasPlaceholderPlaybackText(track: Track): boolean {
        const title = (track.title || '').trim();
        const artist = (track.artist || '').trim();
        const placeholderTexts = new Set([
            '',
            '未知歌曲',
            '未知标题',
            '未知歌手',
            '未知艺术家',
            'unknown',
            'unknown title',
            'unknown artist'
        ]);

        return placeholderTexts.has(title.toLowerCase()) || placeholderTexts.has(artist.toLowerCase());
    }

    private async syncTrayPlaybackState(): Promise<void> {
        const track = this.shell.state.currentTrack;
        await window.electronAPI?.tray?.updatePlaybackState?.({
            title: track?.title || '',
            artist: track?.artist || '',
            isPlaying: Boolean(this.shell.state.isPlaying),
            liked: Boolean(track?.liked),
            playMode: playbackController.getPlayMode()
        });
    }

    private applyLightweightPlaybackUpdate(change: PlaybackStoreChange): boolean {
        if (change.type === 'positionChanged') {
            this.shell.state.position = change.payload;
            this.shell._updateProgressOnly?.();
            if (typeof this.shell._scheduleImmersiveProgressUpdate === 'function') {
                this.shell._scheduleImmersiveProgressUpdate();
            } else {
                this.shell._updateImmersiveProgressOnly?.();
            }
            void this.syncDesktopLyricsForChange(change);
            return true;
        }

        if (change.type === 'volumeChanged') {
            this.shell.state.volume = change.payload;
            this.shell.state.muted = change.payload === 0;
            this.shell._updateVolumeOnly?.();
            return true;
        }

        return false;
    }

    private async syncDesktopLyricsForChange(change: PlaybackStoreChange): Promise<void> {
        if (change.type === 'positionChanged') {
            const now = Date.now();
            if (now - this.lastDesktopLyricsPositionSync < 450) {
                return;
            }
            this.lastDesktopLyricsPositionSync = now;
        }

        const visible = await desktopLyricsService.isVisible();
        if (!visible) {
            return;
        }

        if (change.type === 'trackChanged') {
            const track = change.payload;
            this.lastDesktopLyricsTrackPath = track?.filePath || null;
            await desktopLyricsService.syncTrack(track);
            return;
        }

        if (change.type === 'playbackStateChanged') {
            const snapshot = playbackController.getPlaybackSnapshot();
            await desktopLyricsService.syncPlaybackState({
                isPlaying: snapshot.isPlaying,
                position: snapshot.position
            });
            return;
        }

        if (change.type === 'positionChanged') {
            await desktopLyricsService.syncPosition(change.payload);
            return;
        }

        const currentTrack = playbackController.getCurrentTrackSnapshot();
        if (currentTrack && currentTrack.filePath !== this.lastDesktopLyricsTrackPath) {
            this.lastDesktopLyricsTrackPath = currentTrack.filePath || null;
            await desktopLyricsService.syncTrack(currentTrack);
        }
    }

    private async playPreparedTrack(track: Track, queue: Track[], startIndex: number, source: string): Promise<boolean> {
        const requestSeq = ++this.playbackRequestSeq;
        const rollbackSnapshot = await this.capturePlaybackRollbackSnapshot();
        this.applyPendingTrack(track, queue, startIndex);

        try {
            await playbackController.setPlaylist(queue, startIndex);
            const loaded = await playbackController.loadTrack(track.filePath);
            const played = loaded ? await playbackController.play() : false;
            if (!this.isPlaybackRequestCurrent(requestSeq)) {
                return false;
            }
            if (played) {
                this.syncPlaybackState();
                return true;
            }
            if (!this.isPlaybackRequestCurrent(requestSeq)) {
                return false;
            }

            showToast('播放失败，已恢复当前播放状态', 'error', 2200);
            await this.restorePlaybackSnapshot(rollbackSnapshot, requestSeq);
            return false;
        } catch (error) {
            if (!this.isPlaybackRequestCurrent(requestSeq)) {
                return false;
            }
            console.error(`[ui-next] ${source} failed`, error);
            showToast('播放失败，已恢复当前播放状态', 'error', 2200);
            await this.restorePlaybackSnapshot(rollbackSnapshot, requestSeq);
            return false;
        }
    }

    private isPlaybackRequestCurrent(requestSeq: number): boolean {
        return requestSeq === this.playbackRequestSeq;
    }

    private async restorePlaybackSnapshot(snapshot: UINextPlaybackRollbackSnapshot, requestSeq?: number): Promise<void> {
        try {
            if (requestSeq != null && !this.isPlaybackRequestCurrent(requestSeq)) {
                return;
            }
            await playbackController.setPlaylist(snapshot.playlist, snapshot.currentIndex);
            if (requestSeq != null && !this.isPlaybackRequestCurrent(requestSeq)) {
                return;
            }
            if (snapshot.currentTrack?.filePath) {
                const loaded = await playbackController.loadTrack(snapshot.currentTrack.filePath);
                if (requestSeq != null && !this.isPlaybackRequestCurrent(requestSeq)) {
                    return;
                }
                if (loaded && snapshot.position > 0) {
                    await playbackController.seek(snapshot.position);
                    if (requestSeq != null && !this.isPlaybackRequestCurrent(requestSeq)) {
                        return;
                    }
                }
                if (snapshot.isPlaying) {
                    if (loaded) {
                        await playbackController.play();
                    }
                } else {
                    await playbackController.pause();
                }
            } else {
                await playbackController.pause();
            }
        } catch (error) {
            console.error('[ui-next] restorePlaybackSnapshot failed', error);
        } finally {
            if (requestSeq == null || this.isPlaybackRequestCurrent(requestSeq)) {
                this.syncPlaybackState();
            }
        }
    }

    private async loadPreparedTrack(track: Track, queue: Track[], startIndex: number, source: string): Promise<boolean> {
        const requestSeq = ++this.playbackRequestSeq;
        const rollbackSnapshot = await this.capturePlaybackRollbackSnapshot();
        this.applyPendingTrack(track, queue, startIndex);

        try {
            await playbackController.setPlaylist(queue, startIndex);
            const loaded = await playbackController.loadTrack(track.filePath);
            if (!this.isPlaybackRequestCurrent(requestSeq)) {
                return false;
            }
            if (loaded) {
                await playbackController.pause();
                this.syncPlaybackState();
                return true;
            }

            showToast('Load failed, restored previous playback state', 'error', 2200);
            await this.restorePlaybackSnapshot(rollbackSnapshot, requestSeq);
            return false;
        } catch (error) {
            if (!this.isPlaybackRequestCurrent(requestSeq)) {
                return false;
            }
            console.error(`[ui-next] ${source} failed`, error);
            showToast('Load failed, restored previous playback state', 'error', 2200);
            await this.restorePlaybackSnapshot(rollbackSnapshot, requestSeq);
            return false;
        }
    }

    private async capturePlaybackRollbackSnapshot(): Promise<UINextPlaybackRollbackSnapshot> {
        const state = playbackController.getState();
        return {
            playlist: (state.playlist || []).slice(),
            currentIndex: state.currentIndex,
            currentTrack: state.currentTrack || null,
            position: await playbackController.getPosition(),
            isPlaying: Boolean(state.isPlaying)
        };
    }

    private applyPendingTrack(track: Track, queue: Track[], startIndex: number): void {
        this.shell.state.currentTrack = this.toUINextTrack(track, this.resolveSource(track));
        this.updateCurrentPlaybackBadges();
        this.shell.state.isPlaying = false;
        this.shell.state.position = 0;
        this.shell.state.duration = track.duration || 0;
        this.shell.state.queue = {
            tracks: queue.map((item) => this.toUINextTrack(item, this.resolveSource(item))),
            currentIndex: startIndex
        };
        this.shell.state.searchFocused = false;
        this.shell.render();
    }

    private resolveQueueForTrack(track: Track): Track[] {
        const state = playbackController.getState();
        const existing = state.playlist || [];
        if (existing.some((item) => item.filePath === track.filePath)) {
            return existing;
        }
        return [track];
    }

    private resolveOriginalTrack(track: UINextTrack): Track {
        return track.originalTrack || this.trackMap.get(track.id) || {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            cover: track.cover,
            filePath: track.filePath
        };
    }

    private resolvePlaybackTrack(track: UINextTrack): Track {
        return this.safeResolvedTrack(track, () => {
            const original = this.resolveOriginalTrack(track);
            const localMatch = this.resolveTrustedLocalPlaybackMatch(original, track);
            if (!localMatch) {
                return original;
            }
            return {
                ...localMatch,
                originalNeteaseTrack: original,
                matchedLocalPlayback: true,
                source: 'local',
                sourceStatusLabel: '匹配本地'
            };
        });
    }

    private safeResolvedTrack(track: UINextTrack, resolver: () => Track): Track {
        try {
            const resolved = resolver();
            return resolved?.filePath ? resolved : this.resolveOriginalTrack(track);
        } catch (error) {
            console.warn('[ui-next] matched local playback fallback', error);
            return this.resolveOriginalTrack(track);
        }
    }

    private resolveTrustedLocalPlaybackMatch(original: Track, displayTrack?: UINextTrack): Track | undefined {
        const source = displayTrack?.source || this.resolveSource(original);
        if (source !== 'netease') {
            return undefined;
        }

        const match = this.resolveLocalMatch(original, 'netease');
        if (match.status !== 'matched' || !match.matchedTrack?.filePath) {
            return undefined;
        }
        if (match.matchedTrack.filePath.startsWith('netease://')) {
            return undefined;
        }
        if ((match.matchedTrack as Track & {source?: string}).source === 'netease') {
            return undefined;
        }
        if (match.corrected === true) {
            return match.matchedTrack;
        }
        if (match.reason === 'metadata-match' && match.confidence >= MATCHED_LOCAL_PLAYBACK_CONFIDENCE) {
            return match.matchedTrack;
        }
        return undefined;
    }

    private updateCurrentPlaybackBadges(): void {
        const track = this.shell.state.currentTrack;
        if (!track) {
            this.shell.state.playbackCacheState = undefined;
            return;
        }

        const sourceStatusLabel = track.source === 'netease' ? '网易云' : '本地';
        const cacheStatusLabel = this.resolvePlaybackCacheStatus(track);
        track.sourceStatusLabel = sourceStatusLabel;
        track.cacheStatusLabel = cacheStatusLabel;
        this.shell.state.playbackCacheState = {
            sourceStatusLabel,
            cacheStatusLabel
        };
    }

    private resolvePlaybackCacheStatus(track: UINextTrack): string {
        if (track.matchedLocalPlayback) {
            return '匹配本地播放';
        }

        if (track.source === 'local') {
            return '本地可播';
        }

        const original = this.resolveOriginalTrack(track);
        if (original.filePath && !original.filePath.startsWith('netease://')) {
            return '已缓存';
        }

        if (original.cover || track.cover || original.lyrics || original.lrcText || original.lyricsContent) {
            return '缓存可用';
        }

        return '云端播放';
    }

    private recordSearchHistory(query: string): void {
        if (typeof this.shell.recordSearchHistory === 'function') {
            this.shell.recordSearchHistory(query);
            return;
        }

        const normalized = query.trim();
        if (normalized.length < 2) {
            return;
        }

        const current = Array.isArray(this.shell.state.searchHistory) ? this.shell.state.searchHistory : [];
        this.shell.state.searchHistory = [
            normalized,
            ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())
        ].slice(0, 10);
    }

    private buildSearchSuggestions(query: string, tracks: UINextTrack[]): string[] {
        const normalized = query.trim().toLowerCase();
        const values = [
            ...(Array.isArray(this.shell.state.searchHistory) ? this.shell.state.searchHistory : []),
            ...tracks.map((track) => track.title),
            ...tracks.map((track) => track.artist),
            ...tracks.map((track) => track.album || ''),
            ...this.shell.mock.playlists.map((playlist) => playlist.name)
        ];
        return this.uniqueSearchValues(values)
            .filter((value) => !normalized || value.toLowerCase().includes(normalized))
            .filter((value) => value.toLowerCase() !== normalized)
            .slice(0, 8);
    }

    private buildSearchEntities(query: string, tracks: UINextTrack[]): {artists: UINextSearchEntity[]; albums: UINextSearchEntity[]; playlists: UINextSearchEntity[]} {
        const normalized = query.trim().toLowerCase();
        const artists = new Map<string, UINextSearchEntity>();
        const albums = new Map<string, UINextSearchEntity>();

        tracks.forEach((track) => {
            if (track.artist && this.matchesSearchValue(track.artist, normalized)) {
                const key = `${track.source}:artist:${track.artist.toLowerCase()}`;
                if (!artists.has(key)) {
                    artists.set(key, {
                        id: key,
                        type: 'artist',
                        title: track.artist,
                        subtitle: track.source === 'netease' ? '网易云歌手' : '本地歌手',
                        source: track.source,
                        cover: track.cover
                    });
                }
            }

            if (track.album && this.matchesSearchValue(track.album, normalized)) {
                const key = `${track.source}:album:${track.album.toLowerCase()}`;
                if (!albums.has(key)) {
                    albums.set(key, {
                        id: key,
                        type: 'album',
                        title: track.album,
                        subtitle: track.artist || '',
                        source: track.source,
                        cover: track.cover
                    });
                }
            }
        });

        const playlists = this.shell.mock.playlists
            .filter((playlist) => this.matchesSearchValue(playlist.name, normalized))
            .slice(0, 8)
            .map((playlist) => ({
                id: `playlist:${playlist.id}`,
                type: 'playlist' as const,
                title: playlist.name,
                subtitle: `${playlist.trackCount || playlist.trackIds.length} 首歌曲`,
                source: playlist.source,
                cover: playlist.cover,
                playlistId: playlist.id
            }));

        return {
            artists: Array.from(artists.values()).slice(0, 8),
            albums: Array.from(albums.values()).slice(0, 8),
            playlists
        };
    }

    private uniqueSearchValues(values: string[]): string[] {
        const seen = new Set<string>();
        return values
            .map((value) => (value || '').trim())
            .filter(Boolean)
            .filter((value) => {
                const key = value.toLowerCase();
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
    }

    private matchesSearchValue(value: string | undefined, normalizedQuery: string): boolean {
        if (!normalizedQuery) {
            return false;
        }
        return (value || '').toLowerCase().includes(normalizedQuery);
    }

    private canDeleteTrackFile(track: UINextTrack): boolean {
        const original = this.resolveOriginalTrack(track);
        const filePath = original.filePath || track.filePath;
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }
        if (track.source === 'netease' || this.resolveSource(original) === 'netease') {
            return false;
        }
        if ((original as Track & {isVirtual?: boolean}).isVirtual === true) {
            return false;
        }
        return !filePath.startsWith('netease://');
    }

    private removeTrackFromShellState(track: UINextTrack): void {
        const sameTrack = (item: UINextTrack) => item.id === track.id || item.filePath === track.filePath;
        this.shell.mock.tracks = this.shell.mock.tracks.filter((item) => !sameTrack(item));
        this.shell.state.viewTracks = (this.shell.state.viewTracks || []).filter((item) => !sameTrack(item));
        this.shell.state.homeRecent = (this.shell.state.homeRecent || []).filter((item) => !sameTrack(item));
        this.shell.state.homeFavorites = (this.shell.state.homeFavorites || []).filter((item) => !sameTrack(item));
        this.shell.state.queue.tracks = this.shell.state.queue.tracks.filter((item) => !sameTrack(item));
        this.shell.mock.queue.tracks = this.shell.mock.queue.tracks.filter((item) => !sameTrack(item));

        for (const [playlistId, tracks] of this.playlistTrackCache.entries()) {
            this.playlistTrackCache.set(playlistId, tracks.filter((item) => !sameTrack(item)));
        }

        if (this.shell.state.currentTrack && sameTrack(this.shell.state.currentTrack)) {
            this.shell.state.currentTrack = null;
            this.shell.state.isPlaying = false;
            this.shell.state.position = 0;
            this.shell.state.duration = 0;
            void playbackController.stop();
        }

        this.shell.render();
    }

    private filterLibraryVisibleTracks(tracks: Track[]): Track[] {
        return tracks.filter((track) => {
            if ((track as Track & {libraryVisible?: boolean}).libraryVisible === false) {
                return false;
            }
            return this.resolveSource(track) !== 'netease';
        });
    }

    private filterFavoriteVisibleTracks(tracks: Track[]): Track[] {
        return tracks.filter((track) => Boolean(track.favorite || track.liked));
    }

    private toUINextTrack(track: Track, source: UINextSource): UINextTrack {
        const id = this.trackId(track);
        this.trackMap.set(id, track);
        const offlineStatus = this.resolveOfflineStatus(track, source);
        const coverCacheStatus = this.resolveCoverCacheStatus(track);
        const lyricsCacheStatus = this.resolveLyricsCacheStatus(track);
        const localMatch = this.resolveLocalMatch(track, source);

        return {
            id,
            title: track.title || track.fileName || '未知歌曲',
            artist: track.artist || '未知歌手',
            album: track.album,
            duration: track.duration || 0,
            cover: this.resolveTrackCover(track),
            source,
            liked: Boolean(track.favorite || track.liked),
            offlinePlayable: offlineStatus.playable,
            offlineStatusLabel: offlineStatus.label,
            coverCacheStatus,
            lyricsCacheStatus,
            localMatchStatus: localMatch.status,
            matchConfidence: localMatch.confidence,
            localMatchLabel: this.formatLocalMatchLabel(localMatch),
            filePath: track.filePath,
            originalTrack: track
        };
    }

    private buildDailyMusicDesktop(
        uiTracks: UINextTrack[],
        history: UINextTrack[],
        favorites: UINextTrack[],
        neteaseRecommendedSongs: UINextTrack[] = []
    ): UINextDailyMusicDesktopState {
        const fallbackContinueTrack = this.shell.state.currentTrack || uiTracks[0] || null;
        const dailyRecommendations = this.pickDailyRecommendations(uiTracks, history, favorites, neteaseRecommendedSongs);
        const recentlyObsessed = this.pickRecentlyObsessed(history, favorites);
        const syncSummary = this.buildDailySyncSummary();

        return {
            continueTrack: history[0] || fallbackContinueTrack,
            dailyRecommendations,
            recentlyObsessed,
            syncSummary,
            insights: [
                {label: '曲库', value: `${uiTracks.length} 首`},
                {label: '我的收藏', value: `${favorites.length} 首`},
                {label: '网易云', value: this.shell.state.neteaseSyncStatus || '未登录'}
            ]
        };
    }

    private pickDailyRecommendations(
        uiTracks: UINextTrack[],
        history: UINextTrack[],
        favorites: UINextTrack[],
        neteaseRecommendedSongs: UINextTrack[] = []
    ): UINextTrack[] {
        return this.uniqueDailyTracks([
            ...neteaseRecommendedSongs,
            ...favorites,
            ...history.filter((track) => track.source === 'netease'),
            ...uiTracks.filter((track) => track.source === 'netease'),
            ...uiTracks.filter((track) => track.liked),
            ...uiTracks
        ]).slice(0, 12);
    }

    private pickRecentlyObsessed(history: UINextTrack[], favorites: UINextTrack[]): UINextTrack[] {
        const counts = new Map<string, {track: UINextTrack; count: number}>();
        history.forEach((track) => {
            const key = track.id || track.filePath;
            const existing = counts.get(key);
            counts.set(key, {
                track,
                count: (existing?.count || 0) + 1 + (track.liked ? 1 : 0)
            });
        });

        const ranked = Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .map((item) => item.track);
        return this.uniqueDailyTracks([...ranked, ...favorites]).slice(0, 8);
    }

    private buildDailySyncSummary(): UINextDailyMusicDesktopState['syncSummary'] {
        const dashboard = this.shell.state.migrationDashboard;
        const sync = dashboard?.syncSummary;
        const failed = Number(sync?.failed || 0);
        const conflict = Number(sync?.conflict || 0);
        const retryable = Number(sync?.retryable || 0);
        const apiUnavailable = this.shell.state.neteaseStatus === 'offline';
        const warningCount = failed + conflict + retryable + (apiUnavailable ? 1 : 0);
        const statusText = apiUnavailable
            ? '网易云连接需要处理'
            : warningCount > 0
            ? `有 ${warningCount} 项需要处理`
            : (this.shell.state.neteaseSyncStatus || '等待同步');
        const lastActivity = dashboard?.summary?.lastActivityText || this.shell.state.neteaseLastSyncText || '尚未同步';

        return {
            statusText,
            detailText: `网易云 ${this.shell.state.neteaseStatus || 'signed-out'} · ${lastActivity}`,
            actionText: apiUnavailable ? '打开诊断信息' : (warningCount > 0 ? '查看迁移状态' : '同步状态正常'),
            warningCount
        };
    }

    private uniqueDailyTracks(tracks: UINextTrack[]): UINextTrack[] {
        const seen = new Set<string>();
        const result: UINextTrack[] = [];
        tracks.forEach((track) => {
            const key = track.id || track.filePath;
            if (!key || seen.has(key)) {
                return;
            }
            seen.add(key);
            result.push(track);
        });
        return result;
    }

    private resolveTrackCover(track: Track, source: UINextSource = this.resolveSource(track)): string | null {
        const runtimeCover = (track as Track & {cachedCover?: unknown}).cachedCover;
        if (typeof runtimeCover === 'string' && runtimeCover.length > 0 && !this.isRemoteCoverUrl(runtimeCover)) {
            return runtimeCover;
        }

        const coverSourceUrl = this.resolveTrackCoverSource(track);
        if (!coverSourceUrl) {
            return null;
        }

        if (!this.isRemoteCoverUrl(coverSourceUrl)) {
            return coverSourceUrl;
        }

        const cachedCover = playlistCoverManifest.resolveCachedPlaylistCover(
            this.toTrackCoverCacheIdentity(track, source, coverSourceUrl)
        );
        return cachedCover || null;
    }

    private resolveTrackCoverSource(track: Track): string | null {
        const value = track as Track & {coverImagePath?: unknown; coverSourceUrl?: unknown; cachedCover?: unknown};
        const coverSourceUrl = value.coverSourceUrl;
        if (typeof coverSourceUrl === 'string' && coverSourceUrl.length > 0) {
            return coverSourceUrl;
        }

        const cover = value.cover;
        if (typeof cover === 'string' && cover.length > 0 && cover !== value.cachedCover) {
            return cover;
        }

        const coverImagePath = value.coverImagePath;
        return typeof coverImagePath === 'string' && coverImagePath.length > 0 ? coverImagePath : null;
    }

    private toTrackCoverCacheIdentity(track: Track, source: UINextSource, coverSourceUrl: string): UINextPlaylistLike {
        return {
            id: this.trackId(track),
            source: `track:${source}`,
            externalId: String(track.id || track.fileId || track.filePath || this.trackId(track)),
            cover: coverSourceUrl,
            coverSourceUrl
        };
    }

    private schedulePlaybackTrackCoverRefresh(track: Track | null): void {
        if (!track) return;

        const source = this.resolveSource(track);
        const coverSourceUrl = this.resolveTrackCoverSource(track);
        if (!coverSourceUrl || !this.isRemoteCoverUrl(coverSourceUrl)) {
            return;
        }

        const identity = this.toTrackCoverCacheIdentity(track, source, coverSourceUrl);
        const refreshKey = `${identity.source}:${identity.externalId || identity.id}:${coverSourceUrl}`;
        if (this.lastPlaybackCoverRefreshKey === refreshKey) {
            return;
        }
        this.lastPlaybackCoverRefreshKey = refreshKey;

        void playlistCoverManifest.refreshPlaylistCover(identity).then(() => {
            const cachedCover = playlistCoverManifest.resolveCachedPlaylistCover(identity);
            if (!cachedCover) {
                return;
            }
            (track as Track & {cachedCover?: string}).cachedCover = cachedCover;
            this.refreshCurrentTrackSurfaces();
            this.syncPlaybackState();
            this.shell.render();
        }).catch((error) => {
            console.info('[ui-next] playback cover refresh skipped', {
                trackId: identity.id,
                error: error instanceof Error ? error.message : String(error)
            });
        });
    }

    private resolveOfflineStatus(track: Track, source: UINextSource): {playable: boolean; label: string} {
        if (source === 'local' && !track.filePath?.startsWith('netease://')) {
            return {playable: true, label: '离线可播'};
        }

        const localMatch = this.resolveLocalMatch(track, source);
        if (localMatch.status === 'matched') {
            return {playable: true, label: '已匹配本地'};
        }
        if (localMatch.status === 'conflict') {
            return {playable: false, label: '需确认匹配'};
        }
        return {playable: false, label: '仅云端'};
    }

    private resolveCoverCacheStatus(track: Track): string {
        const value = track as Track & {cachedCover?: unknown; coverImagePath?: unknown};
        if (typeof value.cachedCover === 'string' && value.cachedCover.length > 0 && !this.isRemoteCoverUrl(value.cachedCover)) {
            return '封面已缓存';
        }
        if (typeof value.coverImagePath === 'string' && value.coverImagePath.length > 0) {
            return '封面已缓存';
        }
        if (this.resolveTrackCover(track)) {
            return '封面已缓存';
        }
        const coverSourceUrl = this.resolveTrackCoverSource(track);
        if (coverSourceUrl && this.isRemoteCoverUrl(coverSourceUrl)) {
            return '封面待缓存';
        }
        return '封面待缓存';
    }

    private resolveLyricsCacheStatus(track: Track): string {
        if (track.lyrics || track.lrcText || track.lyricsContent) return '歌词已缓存';
        const cached = cacheManager.getLyricsCache(track.title || '', track.artist || '', track.album || '');
        return cached ? '歌词已缓存' : '歌词待缓存';
    }

    private resolveLocalMatch(track: Track, source: UINextSource): NetEaseLocalMatch {
        if (source !== 'netease') {
            return {status: 'matched', confidence: 1, matchedTrack: track, reason: 'local-file'};
        }
        return netEaseLocalMatchService.matchTrack(track, this.libraryTracks);
    }

    private findLocalTrackByPath(filePath: string): Track | undefined {
        return this.libraryTracks.find((track) => {
            if (track.filePath !== filePath) return false;
            return !track.filePath?.startsWith('netease://') && (track as Track & {source?: string}).source !== 'netease';
        });
    }

    private refreshCurrentTrackSurfaces(): void {
        this.shell.mock.tracks = this.shell.mock.tracks.map((track) => this.toUINextTrack(track.originalTrack, this.resolveSource(track.originalTrack)));
        this.shell.mock.queue.tracks = this.shell.mock.queue.tracks.map((track) => this.toUINextTrack(track.originalTrack, this.resolveSource(track.originalTrack)));
        this.shell.state.viewTracks = this.shell.state.viewTracks?.map((track) => this.toUINextTrack(track.originalTrack, this.resolveSource(track.originalTrack)));
        this.shell.state.homeRecent = this.shell.state.homeRecent?.map((track) => this.toUINextTrack(track.originalTrack, this.resolveSource(track.originalTrack)));
        this.shell.state.homeRecommended = this.shell.state.homeRecommended;
        this.shell.state.homeNetEase = this.shell.state.homeNetEase;
        this.shell.state.homeFavorites = this.shell.state.homeFavorites?.map((track) => this.toUINextTrack(track.originalTrack, this.resolveSource(track.originalTrack)));
        this.playlistTrackCache.clear();
        this.shell.render();
    }

    private applyLikedState(track: UINextTrack, liked: boolean): void {
        this.shell._applyLiked?.(track.id, liked);

        const sameTrack = (item: UINextTrack) => item.id === track.id || item.filePath === track.filePath;
        const apply = (items?: UINextTrack[]) => items?.map((item) => sameTrack(item) ? {...item, liked} : item);
        const likedTrack = {...track, liked};
        if (track.originalTrack) {
            track.originalTrack.favorite = liked;
            track.originalTrack.liked = liked;
        }

        this.shell.state.viewTracks = this.shell.state.view === 'favorites' && !liked
            ? (this.shell.state.viewTracks || []).filter((item) => !sameTrack(item))
            : apply(this.shell.state.viewTracks);
        this.shell.state.homeRecent = apply(this.shell.state.homeRecent);
        this.shell.state.queue.tracks = apply(this.shell.state.queue.tracks) || this.shell.state.queue.tracks;
        this.shell.mock.tracks = apply(this.shell.mock.tracks) || this.shell.mock.tracks;
        this.shell.mock.queue.tracks = apply(this.shell.mock.queue.tracks) || this.shell.mock.queue.tracks;
        this.shell.state.homeFavorites = liked
            ? this.upsertTrackListItem(this.shell.state.homeFavorites || [], likedTrack, sameTrack)
            : (this.shell.state.homeFavorites || []).filter((item) => !sameTrack(item));

        if (this.shell.state.currentTrack && sameTrack(this.shell.state.currentTrack)) {
            this.shell.state.currentTrack = {...this.shell.state.currentTrack, liked};
            void this.syncTrayPlaybackState();
        }

        this.playlistTrackCache.forEach((items, playlistId) => {
            this.playlistTrackCache.set(playlistId, apply(items) || items);
        });
        const patched = this.shell.renderTrackLikeState?.(track.id, liked) === true;
        if (!patched) {
            this.shell.render();
        }
    }

    private upsertTrackListItem(items: UINextTrack[], track: UINextTrack, sameTrack: (item: UINextTrack) => boolean): UINextTrack[] {
        if (items.some(sameTrack)) {
            return items.map((item) => sameTrack(item) ? track : item);
        }
        return [track, ...items];
    }

    private formatLocalMatchLabel(match: NetEaseLocalMatch): string {
        if (match.status === 'matched') return `匹配 ${Math.round(match.confidence * 100)}%`;
        if (match.status === 'conflict') return `冲突 ${Math.round(match.confidence * 100)}%`;
        if (match.status === 'missing') return '本地缺失';
        return '未匹配';
    }

    private trackId(track: Track): string {
        return track.fileId || track.id || track.filePath;
    }

    private resolveSource(track: Track): UINextSource {
        if ((track as Track & {source?: string}).source === 'netease' || track.filePath?.startsWith('netease://')) {
            return 'netease';
        }
        return 'local';
    }

    private resolvePlaylistSource(playlist: {source?: string; tracks?: Track[]}): UINextSource {
        if (playlist.source === 'netease') {
            return 'netease';
        }
        if (playlist.tracks?.some((track) => this.resolveSource(track) === 'netease')) {
            return 'netease';
        }
        return 'local';
    }

    private resolvePlaylistTracks(playlist: {tracks?: Track[]; trackIds?: string[]}): Track[] {
        if (playlist.tracks?.length) {
            return playlist.tracks;
        }

        if (!playlist.trackIds?.length) {
            return [];
        }

        return playlist.trackIds
            .map((trackId) => this.libraryTrackById.get(trackId))
            .filter((track): track is Track => Boolean(track));
    }

    private resolvePlaylistCover(playlist: unknown): string | undefined {
        const value = (playlist as {cover?: unknown; coverImage?: unknown; coverImagePath?: unknown});
        const cover = value.cover ?? value.coverImage ?? value.coverImagePath;
        return typeof cover === 'string' && cover.length > 0 ? cover : undefined;
    }

    private isRemoteCoverUrl(cover: string | undefined): boolean {
        return typeof cover === 'string' && (cover.startsWith('http://') || cover.startsWith('https://'));
    }

    private getPlaylistExternalId(playlist: unknown): string | undefined {
        const value = (playlist as {externalId?: unknown})?.externalId;
        return typeof value === 'string' ? value : undefined;
    }

    private getPlaylistExternalType(playlist: unknown): string | undefined {
        const value = (playlist as {externalType?: unknown})?.externalType;
        return typeof value === 'string' ? value : undefined;
    }

    private toUINextPlayMode(playMode: string): string {
        if (playMode === 'repeat') {
            return 'repeat-one';
        }
        if (playMode === 'shuffle') {
            return 'shuffle';
        }
        return 'sequence';
    }
}
