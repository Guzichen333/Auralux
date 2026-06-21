import {UINextMusicBoxAdapter} from './UINextMusicBoxAdapter';
import {NetEaseCloudMusic} from '@ui/widgets/NetEaseCloudMusic';
import {AddToPlaylistDialog} from '@ui/dialogs/AddToPlaylistDialog';
import {CreatePlaylistDialog} from '@ui/dialogs/CreatePlaylistDialog';
import {NetworkDiskModal} from '@ui/modals/NetworkDiskModal';
import {PluginManagerModal} from '@ui/modals/PluginManagerModal';
import {appShellRuntimeHost} from '@/features/appShell/service';
import {mediaFileDialogService} from '@/features/media/service';
import {libraryDataService} from '@/features/library/service/LibraryDataService';
import {libraryController} from '@/features/library/LibraryController';
import {showToast} from '@utils/index.js';
import {
    MAX_STARTUP_WAIT_MS,
    runStartupWarmup,
    waitForStartupGate,
    type StartupWarmupTaskState
} from './startupWarmup';
import '../../ui-next-static/util';
import '../../ui-next-static/types';
import '../../ui-next-static/mockData';
import '../../ui-next-static/icons';
import '../../ui-next-static/ImmersivePerfProbe';
import '../../ui-next-static/components/TrackRow';
import '../../ui-next-static/components/Sidebar';
import '../../ui-next-static/components/TopSearch';
import '../../ui-next-static/components/HomeView';
import '../../ui-next-static/components/PlaylistView';
import '../../ui-next-static/components/SearchResultsView';
import '../../ui-next-static/components/QueuePanel';
import '../../ui-next-static/components/PlayerBar';
import '../../ui-next-static/components/ImmersivePlayerView';
import '../../ui-next-static/sonicTopographyScene';
import '../../ui-next-static/NewMusicShell';

const STARTUP_SHELL_WAIT_MS = 1200;
const STARTUP_EXIT_GRACE_MS = 500;
let startupLocalModeRequested = false;

declare global {
    interface Window {
        NewMusicShell?: new (options: { el: string; mockData?: unknown }) => unknown;
        MusicBoxMock?: unknown;
        __newShell?: {
            confirm?(options: {
                title: string;
                message: string;
                confirmText?: string;
                cancelText?: string;
                danger?: boolean;
            }): Promise<boolean>;
        };
        __newShellNetEase?: NetEaseCloudMusic;
        __newShellNetworkDiskModal?: NetworkDiskModal;
        __newShellPluginManagerModal?: PluginManagerModal;
        __newShellAddToPlaylistDialog?: {
            show(track: Parameters<AddToPlaylistDialog['show']>[0]): Promise<void>;
        };
        __newShellCreatePlaylistDialog?: CreatePlaylistDialog;
    }
}

function assetUrl(path: string): string {
    return new URL(`./ui-next/${path}`, window.location.href).toString();
}

function loadStylesheet(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[data-ui-next][href="${href}"]`)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.uiNext = 'true';
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load ui-next stylesheet: ${href}`));
        document.head.appendChild(link);
    });
}

function shouldEnableUINext(): boolean {
    return true;
}

function hideLegacyApp(): void {
    document.body.classList.add('ui-next-app');

    const legacyApp = document.getElementById('app');
    if (legacyApp) {
        legacyApp.style.display = 'none';
    }

    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function liftSharedModals(): void {
    [
        'netease-import-modal',
        'netease-login-modal',
        'network-drive-modal',
        'plugin-manager-modal',
        'input-dialog-overlay',
        'add-to-playlist-dialog',
        'create-playlist-dialog'
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (element && element.parentElement !== document.body) {
            document.body.appendChild(element);
        }
    });
}

function ensureRoot(): HTMLElement {
    let root = document.getElementById('ui-next-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'ui-next-root';
        root.className = 'ui-next-root';
        document.body.appendChild(root);
    }
    return root;
}

function renderStartupSplash(root: HTMLElement, tasks: StartupWarmupTaskState[] = []): HTMLElement {
    let splash = root.querySelector<HTMLElement>('[data-ui-next-startup]');
    if (!splash) {
        splash = document.createElement('section');
        splash.className = 'mb-startup';
        splash.dataset.uiNextStartup = 'true';
        root.appendChild(splash);
    }

    const taskItems = tasks.length ? tasks : [
        {id: 'boot', label: '准备启动', status: 'running', message: '正在连接 Auralux 服务'}
    ];
    const doneCount = taskItems.filter((task) => task.status === 'done' || task.status === 'degraded').length;
    const progress = Math.max(8, Math.round((doneCount / Math.max(1, taskItems.length)) * 100));

    splash.innerHTML = [
        '<div class="mb-startup__inner">',
        '<div class="mb-startup__brand">',
        '<div class="mb-startup__mark"><img class="mb-startup__logo" src="assets/images/favicon.svg" alt="Auralux"></div>',
        '<div>',
        '<div class="mb-startup__title">Auralux</div>',
        '<div class="mb-startup__subtitle">正在准备你的音乐空间</div>',
        '</div>',
        '</div>',
        '<div class="mb-startup__bar"><div class="mb-startup__bar-fill" style="width:',
        String(progress),
        '%"></div></div>',
        '<div class="mb-startup__tasks">',
        taskItems.map((task) => [
            '<div class="mb-startup__task is-',
            task.status,
            '">',
            '<span class="mb-startup__dot"></span>',
            '<span class="mb-startup__task-label">',
            escapeHtml(task.label),
            '</span>',
            '<span class="mb-startup__task-message">',
            escapeHtml(task.message),
            '</span>',
            '</div>'
        ].join('')).join(''),
        '</div>',
        '</div>'
    ].join('');

    return splash;
}

function removeStartupSplash(root: HTMLElement): void {
    const splash = root.querySelector<HTMLElement>('[data-ui-next-startup]');
    if (!splash) return;
    splash.classList.add('is-leaving');
    window.setTimeout(() => splash.remove(), 180);
}

function clearStartupSplash(root: HTMLElement): void {
    const splash = root.querySelector<HTMLElement>('[data-ui-next-startup]');
    if (splash) {
        splash.remove();
    }
}

function waitForStartupExit(startedAt: number, warmup: Promise<unknown>): Promise<void> {
    void MAX_STARTUP_WAIT_MS;
    void STARTUP_EXIT_GRACE_MS;
    return Promise.all([warmup, waitForStartupGate(startedAt)]).then(() => undefined);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function bindUINextRuntimeHost(modals: {
    networkDiskModal: NetworkDiskModal;
    pluginManagerModal: PluginManagerModal;
}): void {
    appShellRuntimeHost.bindApp({
        async confirm(options) {
            if (window.__newShell?.confirm) {
                return await window.__newShell.confirm({
                    title: options.title,
                    message: options.message,
                    confirmText: options.confirmText,
                    cancelText: options.cancelText,
                    danger: options.type === 'danger' || options.type === 'warning'
                });
            }

            return window.confirm(`${options.title}\n\n${options.message}`);
        },
        showInfo(message) {
            showToast(message, 'info');
        },
        showSuccess(message) {
            showToast(message, 'success');
        },
        showError(message) {
            showToast(message, 'error', 2200);
        },
        async handleViewChange() {},
        async addMusicFiles() {
            const filePaths = await mediaFileDialogService.openFiles();
            if (!filePaths.length) {
                return;
            }

            let successCount = 0;
            for (const filePath of filePaths) {
                const metadata = await libraryDataService.getTrackMetadata(filePath);
                if (!metadata) {
                    continue;
                }

                const result = await libraryDataService.addTrackToLibrary(metadata);
                if (result?.success) {
                    successCount += 1;
                }
            }

            if (successCount > 0) {
                showToast(`成功添加 ${successCount} 首音乐`, 'success');
                libraryController.emitLibraryUpdated([]);
            } else {
                showToast('添加音乐失败', 'error', 2200);
            }
        },
        showNetworkDriveModal() {
            modals.networkDiskModal.show();
            return true;
        },
        async showPluginManager() {
            await modals.pluginManagerModal.show();
            return true;
        }
    });
}

function bindDialogNotifications(dialog: AddToPlaylistDialog | CreatePlaylistDialog | NetworkDiskModal): void {
    dialog.on('notification', (data: {type?: string; message?: string}) => {
        if (!data?.message) return;
        const type = data.type === 'success' ? 'success' : data.type === 'error' ? 'error' : 'info';
        showToast(data.message, type);
    });
}

function setupPlaylistDialogs(adapter: UINextMusicBoxAdapter): void {
    const addDialog = new AddToPlaylistDialog();
    const createDialog = new CreatePlaylistDialog();

    addDialog.on('createNewPlaylist', (track) => {
        createDialog.show(track);
    });
    addDialog.on('trackAdded', () => {
        void adapter.refreshLibrarySnapshot();
    });
    createDialog.on('playlistCreated', () => {
        void adapter.refreshLibrarySnapshot();
    });

    bindDialogNotifications(addDialog);
    bindDialogNotifications(createDialog);

    window.__newShellAddToPlaylistDialog = addDialog;
    window.__newShellCreatePlaylistDialog = createDialog;
}

async function waitForNewMusicShell(timeoutMs = STARTUP_SHELL_WAIT_MS): Promise<boolean> {
    if (window.NewMusicShell) {
        return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    if (window.NewMusicShell) {
        return true;
    }

    return await new Promise((resolve) => {
        const startedAt = performance.now();
        const tick = () => {
            if (window.NewMusicShell) {
                resolve(true);
                return;
            }

            if (performance.now() - startedAt >= timeoutMs) {
                window.setTimeout(() => resolve(false), 0);
                return;
            }

            window.setTimeout(tick, 50);
        };

        tick();
    });
}

function describeUINextGlobals(): string {
    return [
        `MBUtil=${Boolean((window as {MBUtil?: unknown}).MBUtil)}`,
        `MusicBoxMock=${Boolean(window.MusicBoxMock)}`,
        `MBSidebar=${Boolean((window as {MBSidebar?: unknown}).MBSidebar)}`,
        `MBTopSearch=${Boolean((window as {MBTopSearch?: unknown}).MBTopSearch)}`,
        `NewMusicShell=${Boolean(window.NewMusicShell)}`
    ].join(', ');
}

function createNewMusicShellUnavailableError(): Error {
    return new Error(`NewMusicShell is not available after ui-next modules loaded (${describeUINextGlobals()}).`);
}

function renderStartupError(error: unknown, onEnterLocalMode: () => void): void {
    const root = ensureRoot();
    const message = error instanceof Error ? error.message : String(error);
    root.innerHTML = [
        '<div class="mb-startup-error">',
        '<button class="mb-startup-error__skip" type="button" data-startup-enter-local>进入本地模式</button>',
        '<div class="mb-startup-error__body">',
        '<div class="mb-startup-error__title">Auralux 启动受阻</div>',
        '<div class="mb-startup-error__message">',
        'Auralux 启动失败：',
        message,
        '</div>',
        '</div>',
        '</div>'
    ].join('');
    root.querySelector<HTMLButtonElement>('[data-startup-enter-local]')?.addEventListener('click', onEnterLocalMode);
}

async function mountUINext(options: {skipStartupWarmup?: boolean} = {}): Promise<void> {
    await loadStylesheet(assetUrl('styles.css'));
    const startupStartedAt = performance.now();

    liftSharedModals();
    const networkDiskModal = new NetworkDiskModal();
    const pluginManagerModal = new PluginManagerModal();
    window.__newShellNetworkDiskModal = networkDiskModal;
    window.__newShellPluginManagerModal = pluginManagerModal;
    bindUINextRuntimeHost({networkDiskModal, pluginManagerModal});
    bindDialogNotifications(networkDiskModal);

    hideLegacyApp();
    const root = ensureRoot();
    renderStartupSplash(root);
    const warmup = options.skipStartupWarmup
        ? Promise.resolve()
        : runStartupWarmup((tasks) => renderStartupSplash(root, tasks));
    const shellReady = await waitForNewMusicShell();
    await waitForStartupExit(startupStartedAt, warmup);
    // Startup splash should never block the app shell indefinitely.
    removeStartupSplash(root);
    if (!shellReady) {
        throw createNewMusicShellUnavailableError();
    }

    const NewMusicShell = window.NewMusicShell;
    if (!NewMusicShell) {
        throw new Error('NewMusicShell is unavailable after startup guard.');
    }

    clearStartupSplash(root);
    const shell = new NewMusicShell({
        el: '#ui-next-root',
        mockData: window.MusicBoxMock
    });

    const adapter = new UINextMusicBoxAdapter(shell as ConstructorParameters<typeof UINextMusicBoxAdapter>[0]);
    (shell as {adapter?: UINextMusicBoxAdapter}).adapter = adapter;
    window.__newShell = shell as {
        confirm?(options: {
            title: string;
            message: string;
            confirmText?: string;
            cancelText?: string;
            danger?: boolean;
        }): Promise<boolean>;
    };
    setupPlaylistDialogs(adapter);
    const netEase = new NetEaseCloudMusic();
    netEase.on('playlistImported', () => {
        void adapter.refreshLibrarySnapshot();
    });
    window.__newShellNetEase = netEase;
}

function enterLocalModeFromStartupError(): void {
    if (startupLocalModeRequested) {
        return;
    }
    startupLocalModeRequested = true;
    void mountUINext({skipStartupWarmup: true}).catch((error) => {
        console.error('[ui-next] local mode bootstrap failed', error);
        renderStartupError(error, enterLocalModeFromStartupError);
    });
}

if (shouldEnableUINext()) {
    mountUINext().catch((error) => {
        console.error('[ui-next] bootstrap failed', error);
        renderStartupError(error, enterLocalModeFromStartupError);
    });
}

export {};
