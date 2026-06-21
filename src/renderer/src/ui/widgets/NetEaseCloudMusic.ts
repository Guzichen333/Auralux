import {debounce} from "@utils/index.js";
import {Component} from "@ui/base/Component";
import {appNotificationService} from "@/features/appShell/service/AppNotificationService";
import {netEaseApiClient} from "@/features/netease/service/NetEaseApiClient";
import {netEaseAssetMigrationService} from "@/features/netease/service/NetEaseAssetMigrationService";
import {netEaseAuthService} from "@/features/netease/service/NetEaseAuthService";
import {netEasePlaylistImportService} from "@/features/netease/service/NetEasePlaylistImportService";
import {netEaseSyncStateService} from "@/features/netease/service/NetEaseSyncStateService";
import {
    netEaseMigrationReportService,
    type NetEaseMigrationFailure,
    type NetEaseMigrationReport,
    type NetEaseMigrationSnapshot
} from "@/features/netease/service/NetEaseMigrationReportService";
import {libraryController} from "@/features/library/LibraryController";
import {libraryDataService} from "@/features/library/service/LibraryDataService";
import type {NetEaseMigrationPreview, NetEasePlaylist} from "@/features/netease/types";
import type {Track} from "@api/types/library";

class NetEaseCloudMusic extends Component {
    private importModal: HTMLElement | null = null;
    private loginModal: HTMLElement | null = null;
    private playlistIdInput: HTMLInputElement | null = null;
    private importPreview: HTMLElement | null = null;
    private importStatus: HTMLElement | null = null;
    private importConfirmBtn: HTMLButtonElement | null = null;
    private importUndoBtn: HTMLButtonElement | null = null;
    private importAssetsBtn: HTMLButtonElement | null = null;
    private importAssetsCancelBtn: HTMLButtonElement | null = null;
    private assetMigrationProgress: HTMLElement | null = null;
    private currentPlaylist: NetEasePlaylist | null = null;
    private isLoggedIn: boolean = false;
    private isAvailable: boolean = false;
    private importLookupSession = 0;
    private debouncedLookup: ((query: string) => void) | null = null;
    private qrDiagnosticsActions: HTMLElement | null = null;
    private copyQRDiagnosticsBtn: HTMLButtonElement | null = null;
    private lastQRLoginDiagnosticsText = '';
    private pendingAssetMigrationPreview: NetEaseMigrationPreview | null = null;
    private isAssetMigrationRunning = false;
    private assetMigrationCancelRequested = false;
    private lastAssetMigrationProgressRenderAt = 0;
    private pendingAssetMigrationProgressMessage = '';
    private pendingAssetMigrationProgressStatusText = '';
    private assetMigrationProgressFlushTimer: number | null = null;
    private readonly assetMigrationProgressMinIntervalMs = 250;

    constructor() {
        super(null, false);
        this.setupModals();
        this.setupEventListeners();
        this.setupApiStatusEvents();
        this.updateStatusIndicator();
        this.initLoginStatus();
    }

    private async initLoginStatus(attempt = 0): Promise<void> {
        const maxAttempts = 8;
        this.isAvailable = await netEaseApiClient.checkAvailability();
        if (!this.isAvailable) {
            this.isLoggedIn = false;
            this.updateStatusIndicator();

            if (attempt < maxAttempts - 1) {
                window.setTimeout(() => {
                    void this.initLoginStatus(attempt + 1);
                }, 1500);
            }
            return;
        }

        this.isLoggedIn = await netEaseAuthService.checkLoginStatus();
        this.updateStatusIndicator();
    }

    private setupApiStatusEvents(): void {
        window.electronAPI?.netease?.onApiReady(() => {
            void this.initLoginStatus();
        });
        window.electronAPI?.netease?.onApiUnavailable(() => {
            this.isAvailable = false;
            this.isLoggedIn = false;
            this.updateStatusIndicator();
        });
    }

    private setupModals(): void {
        this.importModal = document.getElementById('netease-import-modal');
        this.loginModal = document.getElementById('netease-login-modal');
        this.playlistIdInput = document.getElementById('netease-playlist-id') as HTMLInputElement;
        this.importPreview = document.getElementById('netease-import-preview');
        this.importStatus = document.getElementById('netease-import-status');
        this.importConfirmBtn = document.getElementById('netease-import-confirm-btn') as HTMLButtonElement;
        this.importUndoBtn = this.ensureImportUndoButton();
        this.importAssetsBtn = this.ensureImportAssetsButton();
        this.importAssetsCancelBtn = this.ensureAssetMigrationCancelButton();
        this.assetMigrationProgress = this.ensureAssetMigrationProgress();
        this.qrDiagnosticsActions = this.ensureQRLoginDiagnosticsActions();
    }

    private setupEventListeners(): void {
        const statusIndicator = document.getElementById('netease-status-indicator');
        if (statusIndicator) {
            statusIndicator.style.cursor = 'pointer';
            statusIndicator.addEventListener('click', () => this.showLoginModal());
        }

        const importBtn = document.getElementById('import-netease-playlist-btn');
        if (importBtn) importBtn.addEventListener('click', () => this.showImportModal());

        const importClose = document.getElementById('netease-import-modal-close');
        const importPreviewBtn = document.getElementById('netease-import-preview-btn');
        if (importClose) importClose.addEventListener('click', () => this.hideModal(this.importModal));
        if (importPreviewBtn) importPreviewBtn.addEventListener('click', () => this.lookupPlaylist());
        if (this.importConfirmBtn) this.importConfirmBtn.addEventListener('click', () => this.doImportPlaylist());
        if (this.importUndoBtn) this.importUndoBtn.addEventListener('click', () => this.undoLatestImport());
        if (this.importAssetsBtn) this.importAssetsBtn.addEventListener('click', () => this.openAssetMigration());
        if (this.importAssetsCancelBtn) this.importAssetsCancelBtn.addEventListener('click', () => this.cancelAssetMigration());

        this.debouncedLookup = debounce(async (_query: string) => {
            await this.lookupPlaylist();
        }, 400) as (query: string) => void;

        if (this.playlistIdInput) {
            this.playlistIdInput.addEventListener('input', () => {
                const value = this.playlistIdInput!.value;
                this.currentPlaylist = null;
                this.importLookupSession++;
                if (this.importPreview) this.importPreview.style.display = 'none';
                if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
                this.setImportUndoVisible(false);
                if (!value.trim()) {
                    if (this.importStatus) this.importStatus.style.display = 'none';
                }
                if (this.debouncedLookup) this.debouncedLookup(value);
            });
        }

        const loginClose = document.getElementById('netease-login-modal-close');
        const loginConfirm = document.getElementById('netease-login-confirm');
        const loginTabQr = document.getElementById('netease-login-tab-qr');
        const loginTabPhone = document.getElementById('netease-login-tab-phone');
        const getQrBtn = document.getElementById('netease-get-qr-btn');
        if (loginClose) loginClose.addEventListener('click', () => {
            netEaseAuthService.stopQRCheck();
            this.hideModal(this.loginModal);
        });
        if (loginConfirm) loginConfirm.addEventListener('click', () => this.doPhoneLogin());
        if (loginTabQr) loginTabQr.addEventListener('click', () => this.switchLoginTab('qr'));
        if (loginTabPhone) loginTabPhone.addEventListener('click', () => this.switchLoginTab('phone'));
        if (getQrBtn) getQrBtn.addEventListener('click', () => this.startQRLogin());
        if (this.copyQRDiagnosticsBtn) this.copyQRDiagnosticsBtn.addEventListener('click', () => this.copyQRLoginDiagnostics());

        [this.importModal, this.loginModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.hideModal(modal);
                });
            }
        });
    }

    private showModal(modal: HTMLElement | null): void {
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('show'));
    }

    private hideModal(modal: HTMLElement | null): void {
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
    }

    private showImportModal(): void {
        this.showModal(this.importModal);
        this.importLookupSession++;
        this.currentPlaylist = null;
        if (this.playlistIdInput) {
            this.playlistIdInput.value = '';
            this.playlistIdInput.focus();
        }
        if (this.importPreview) this.importPreview.style.display = 'none';
        if (this.importStatus) this.importStatus.style.display = 'none';
        if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
        this.setImportUndoVisible(false);
        this.renderAssetMigrationProgress('');
    }

    openImportModal(): void {
        this.showImportModal();
    }

    showAssetMigrationProgressModal(): void {
        this.showModal(this.importModal);
        if (this.isAssetMigrationRunning) {
            this.renderAssetMigrationProgress('网易云资产迁移正在后台进行，可在这里查看进度或取消。', {force: true});
            this.setAssetMigrationCancelVisible(true);
            this.importAssetsCancelBtn?.focus();
            return;
        }

        this.renderAssetMigrationProgress('当前没有正在进行的网易云资产迁移。', {force: true});
    }

    private ensureImportUndoButton(): HTMLButtonElement | null {
        const existing = document.getElementById('netease-import-undo-btn') as HTMLButtonElement | null;
        if (existing) return existing;

        const footer = this.importModal?.querySelector('.modal-footer');
        if (!footer) return null;

        const button = document.createElement('button');
        button.id = 'netease-import-undo-btn';
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.style.display = 'none';
        button.textContent = '撤销最近导入';
        footer.insertBefore(button, footer.firstChild);
        return button;
    }

    private ensureImportAssetsButton(): HTMLButtonElement | null {
        const existing = document.getElementById('netease-import-assets-btn') as HTMLButtonElement | null;
        if (existing) return existing;

        const footer = this.importModal?.querySelector('.modal-footer');
        if (!footer) return null;

        const button = document.createElement('button');
        button.id = 'netease-import-assets-btn';
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.textContent = '迁移全部资产';
        footer.insertBefore(button, this.importConfirmBtn || null);
        return button;
    }

    private ensureAssetMigrationCancelButton(): HTMLButtonElement | null {
        const existing = document.getElementById('netease-import-assets-cancel-btn') as HTMLButtonElement | null;
        if (existing) return existing;

        const footer = this.importModal?.querySelector('.modal-footer');
        if (!footer) return null;

        const button = document.createElement('button');
        button.id = 'netease-import-assets-cancel-btn';
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.style.display = 'none';
        button.textContent = '取消迁移';
        footer.insertBefore(button, this.importAssetsBtn?.nextSibling || this.importConfirmBtn || null);
        return button;
    }

    private setAssetMigrationCancelVisible(visible: boolean): void {
        if (!this.importAssetsCancelBtn) return;
        this.importAssetsCancelBtn.style.display = visible ? 'inline-flex' : 'none';
        this.importAssetsCancelBtn.disabled = !visible;
    }

    private cancelAssetMigration(): void {
        if (!this.isAssetMigrationRunning) return;
        this.assetMigrationCancelRequested = true;
        if (this.importAssetsCancelBtn) this.importAssetsCancelBtn.disabled = true;
        this.renderAssetMigrationProgress('正在取消网易云资产迁移，当前批量写入完成后停止...', {force: true});
        appNotificationService.showInfo('正在取消网易云资产迁移');
    }

    private ensureAssetMigrationProgress(): HTMLElement | null {
        const existing = document.getElementById('netease-asset-migration-progress');
        if (existing) return existing;

        const body = this.importModal?.querySelector('.modal-body');
        if (!body) return null;

        const progress = document.createElement('div');
        progress.id = 'netease-asset-migration-progress';
        progress.className = 'netease-import-description';
        progress.style.display = 'none';
        body.appendChild(progress);
        return progress;
    }

    private ensureQRLoginDiagnosticsActions(): HTMLElement | null {
        const existing = document.getElementById('netease-qr-diagnostics-actions');
        if (existing) {
            this.copyQRDiagnosticsBtn = document.getElementById('netease-copy-qr-diagnostics-btn') as HTMLButtonElement | null;
            return existing;
        }

        const getQrBtn = document.getElementById('netease-get-qr-btn');
        const actionHost = getQrBtn?.parentElement;
        if (!actionHost) return null;

        const actions = document.createElement('div');
        actions.id = 'netease-qr-diagnostics-actions';
        actions.style.display = 'none';
        actions.style.justifyContent = 'center';
        actions.style.marginTop = '8px';

        const copyButton = document.createElement('button');
        copyButton.id = 'netease-copy-qr-diagnostics-btn';
        copyButton.type = 'button';
        copyButton.className = 'btn btn-secondary';
        copyButton.textContent = '\u590d\u5236\u8bca\u65ad';
        actions.appendChild(copyButton);

        actionHost.appendChild(actions);
        this.copyQRDiagnosticsBtn = copyButton;
        return actions;
    }

    private setQRDiagnosticsActionsVisible(visible: boolean): void {
        if (!this.qrDiagnosticsActions) return;
        this.qrDiagnosticsActions.style.display = visible ? 'flex' : 'none';
        if (this.copyQRDiagnosticsBtn) {
            this.copyQRDiagnosticsBtn.disabled = !visible || !this.lastQRLoginDiagnosticsText;
        }
    }

    private clearQRLoginDiagnostics(): void {
        this.lastQRLoginDiagnosticsText = '';
        this.setQRDiagnosticsActionsVisible(false);
        this.setQRRetryLabel(false);
    }

    private setQRRetryLabel(isRetry: boolean): void {
        const getQrBtn = document.getElementById('netease-get-qr-btn');
        if (getQrBtn) {
            getQrBtn.textContent = isRetry ? '\u91cd\u65b0\u83b7\u53d6\u4e8c\u7ef4\u7801' : '\u83b7\u53d6\u4e8c\u7ef4\u7801';
        }
    }

    private buildQRLoginDiagnosticsText(diagnostics: {
        cookieAdopted: boolean;
        attempts: number;
        lastAccountCheck: string;
    }, visibleMessage: string): string {
        return [
            'NetEase QR Login Diagnostics',
            `time: ${new Date().toISOString()}`,
            `endpoint: ${netEaseApiClient.apiEndpoint}`,
            `cookieAdopted: ${diagnostics.cookieAdopted}`,
            `attempts: ${diagnostics.attempts}`,
            `lastAccountCheck: ${diagnostics.lastAccountCheck}`,
            `visibleMessage: ${visibleMessage}`
        ].join('\n');
    }

    private async copyQRLoginDiagnostics(): Promise<void> {
        if (!this.lastQRLoginDiagnosticsText) {
            appNotificationService.showError('\u6682\u65e0\u53ef\u590d\u5236\u7684\u767b\u5f55\u8bca\u65ad');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.lastQRLoginDiagnosticsText);
            appNotificationService.showSuccess('\u767b\u5f55\u8bca\u65ad\u5df2\u590d\u5236');
        } catch (error) {
            console.warn('[NetEaseCloudMusic] Failed to copy QR login diagnostics', error);
            appNotificationService.showError('\u590d\u5236\u8bca\u65ad\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u63a7\u5236\u53f0\u65e5\u5fd7');
        }
    }

    private setImportUndoVisible(visible: boolean): void {
        if (!this.importUndoBtn) return;
        this.importUndoBtn.style.display = visible ? 'inline-flex' : 'none';
        this.importUndoBtn.disabled = !visible;
    }

    private renderImportReport(report: NetEaseMigrationReport): void {
        if (!this.importStatus) return;

        this.importStatus.style.display = 'block';
        const undoHint = report.canUndo ? '，可撤销本次新建歌单' : '';
        const failedHint = report.failed > 0 ? `，失败 ${report.failed} 首` : '';
        const existingHint = report.existing > 0 ? `，已存在 ${report.existing} 首` : '';
        const skippedHint = report.skipped > 0 ? `，跳过 ${report.skipped} 首` : '';
        this.importStatus.textContent = `迁移结果：新增 ${report.added}/${report.total} 首${existingHint}${skippedHint}${failedHint}${undoHint}`;
        this.setImportUndoVisible(report.canUndo);
    }

    private async undoLatestImport(): Promise<void> {
        if (this.importUndoBtn) this.importUndoBtn.disabled = true;
        const result = await netEaseMigrationReportService.undoLatestCreatedImport();
        if (!result.success) {
            const message = result.error || '撤销最近导入失败';
            if (this.importStatus) {
                this.importStatus.style.display = 'block';
                this.importStatus.textContent = message;
            }
            appNotificationService.showError(message);
            if (this.importUndoBtn) this.importUndoBtn.disabled = false;
            return;
        }

        this.setImportUndoVisible(false);
        if (this.importStatus) {
            this.importStatus.style.display = 'block';
            this.importStatus.textContent = '已撤销最近一次网易云歌单导入';
        }
        appNotificationService.showSuccess('已撤销最近一次网易云歌单导入');
        libraryController.emitLibraryUpdated([]);
    }

    private renderAssetMigrationProgress(message: string, options: {force?: boolean; statusText?: string} = {}): void {
        const now = Date.now();
        if (!options.force && message && now - this.lastAssetMigrationProgressRenderAt < this.assetMigrationProgressMinIntervalMs) {
            this.pendingAssetMigrationProgressMessage = message;
            this.pendingAssetMigrationProgressStatusText = options.statusText || '';
            if (this.assetMigrationProgressFlushTimer === null) {
                const delay = Math.max(0, this.assetMigrationProgressMinIntervalMs - (now - this.lastAssetMigrationProgressRenderAt));
                this.assetMigrationProgressFlushTimer = window.setTimeout(() => this.flushAssetMigrationProgress(), delay);
            }
            return;
        }

        this.lastAssetMigrationProgressRenderAt = now;
        this.pendingAssetMigrationProgressMessage = '';
        this.pendingAssetMigrationProgressStatusText = '';
        if (this.assetMigrationProgressFlushTimer !== null) {
            window.clearTimeout(this.assetMigrationProgressFlushTimer);
            this.assetMigrationProgressFlushTimer = null;
        }

        if (!this.assetMigrationProgress) return;
        this.assetMigrationProgress.style.display = message ? 'block' : 'none';
        this.assetMigrationProgress.textContent = message;
        if (this.importStatus && options.statusText) {
            this.importStatus.style.display = 'block';
            this.importStatus.textContent = options.statusText;
        }
    }

    private flushAssetMigrationProgress(): void {
        this.assetMigrationProgressFlushTimer = null;
        const message = this.pendingAssetMigrationProgressMessage;
        const statusText = this.pendingAssetMigrationProgressStatusText;
        if (!message && !statusText) return;
        this.renderAssetMigrationProgress(message, {force: true, statusText});
    }

    private async prepareAssetMigrationPreflight(): Promise<boolean> {
        this.pendingAssetMigrationPreview = null;
        this.renderAssetMigrationProgress('\u6b63\u5728\u9884\u68c0\u7f51\u6613\u4e91\u8d44\u4ea7...', {force: true});

        const preflight = await netEaseAssetMigrationService.prepareMigrationPreflight();
        this.pendingAssetMigrationPreview = preflight.preview;
        if (this.assetMigrationCancelRequested) {
            await this.recordAssetMigrationCancelledReport(preflight.totalTracks);
            this.renderAssetMigrationProgress('资产迁移已取消：预检完成前已收到取消请求', {force: true});
            return false;
        }

        this.renderAssetMigrationPreflight(preflight);

        return window.confirm(`\u51c6\u5907\u8fc1\u79fb ${preflight.estimatedPlaylists} \u4e2a\u6b4c\u5355\uff0c\u7ea6 ${preflight.totalTracks} \u9996\u6b4c\u66f2\u3002\u662f\u5426\u5f00\u59cb\uff1f`);
    }

    private async recordAssetMigrationCancelledReport(totalTracks = 0): Promise<void> {
        const snapshot = await netEaseMigrationReportService.createSnapshot();
        netEaseMigrationReportService.recordPlaylistImport({
            externalId: 'asset-migration-cancelled',
            playlistName: '[网易云] 资产迁移',
            snapshot,
            total: totalTracks,
            added: 0,
            existing: 0,
            skipped: 0,
            duplicates: 0,
            failures: [{
                songId: 'asset-migration-cancelled',
                title: '网易云资产迁移',
                reason: 'cancelled'
            }],
            status: 'cancelled'
        });
    }

    private renderAssetMigrationPreflight(preflight: {
        totalTracks: number;
        estimatedPlaylists: number;
        groups: Array<{label: string; count: number}>;
    }): void {
        const groups = preflight.groups
            .map(group => `${group.label} ${group.count}`)
            .join('\uff0c');
        this.renderAssetMigrationProgress(`\u9884\u68c0\u5b8c\u6210\uff1a${preflight.estimatedPlaylists} \u4e2a\u6b4c\u5355\uff0c\u7ea6 ${preflight.totalTracks} \u9996\u6b4c\u66f2\u3002${groups}`, {force: true});
    }

    private async openAssetMigration(): Promise<void> {
        if (this.isAssetMigrationRunning) {
            this.renderAssetMigrationProgress('\u7f51\u6613\u4e91\u8d44\u4ea7\u8fc1\u79fb\u6b63\u5728\u8fdb\u884c\u4e2d\uff0c\u8bf7\u7b49\u5f85\u5f53\u524d\u4efb\u52a1\u5b8c\u6210', {force: true});
            appNotificationService.showInfo('\u7f51\u6613\u4e91\u8d44\u4ea7\u8fc1\u79fb\u6b63\u5728\u8fdb\u884c\u4e2d');
            return;
        }

        this.isAssetMigrationRunning = true;
        this.assetMigrationCancelRequested = false;
        if (this.importAssetsBtn) this.importAssetsBtn.disabled = true;
        if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
        this.setAssetMigrationCancelVisible(true);
        this.setImportUndoVisible(false);
        this.renderAssetMigrationProgress('正在准备网易云资产迁移...', {force: true});

        try {
            const confirmed = await this.prepareAssetMigrationPreflight();
            if (!confirmed || !this.pendingAssetMigrationPreview) {
                if (this.assetMigrationCancelRequested) {
                    await this.recordAssetMigrationCancelledReport();
                }
                this.renderAssetMigrationProgress('\u5df2\u53d6\u6d88\u7f51\u6613\u4e91\u8d44\u4ea7\u8fc1\u79fb', {force: true});
                return;
            }

            const summary = await netEaseAssetMigrationService.migratePreview(this.pendingAssetMigrationPreview, (assetMigrationProgress) => {
                this.renderAssetMigrationProgress(assetMigrationProgress.message, {
                    statusText: `${assetMigrationProgress.label} ${assetMigrationProgress.current}/${assetMigrationProgress.total}`
                });
            }, {
                isCancelled: () => this.assetMigrationCancelRequested
            });

            if (summary.cancelled) {
                const message = `资产迁移已取消：已导入歌单 ${summary.importedPlaylists} 个，新增 ${summary.importedTracks} 首，已存在 ${summary.existingTracks} 首，跳过 ${summary.skippedTracks} 首`;
                if (this.importStatus) {
                    this.importStatus.style.display = 'block';
                    this.importStatus.textContent = message;
                }
                this.renderAssetMigrationProgress(message, {force: true});
                appNotificationService.showInfo(message);
                libraryController.emitLibraryUpdated([]);
                this.emit('playlistImported', {assetMigration: true, cancelled: true});
                return;
            }

            if (!summary.success && summary.error) {
                if (this.importStatus) {
                    this.importStatus.style.display = 'block';
                    this.importStatus.textContent = `资产迁移失败：${summary.error}`;
                }
                appNotificationService.showError(summary.error);
                return;
            }

            const failText = summary.failures.length > 0 ? `，失败 ${summary.failures.length} 项` : '';
            const message = `资产迁移完成：歌单 ${summary.importedPlaylists} 个，新增 ${summary.importedTracks} 首，已存在 ${summary.existingTracks} 首，跳过 ${summary.skippedTracks} 首${failText}`;
            if (this.importStatus) {
                this.importStatus.style.display = 'block';
                this.importStatus.textContent = message;
            }
            this.renderAssetMigrationProgress(message, {force: true});
            appNotificationService.showSuccess(message);
            libraryController.emitLibraryUpdated([]);
            this.emit('playlistImported', {assetMigration: true});
        } catch (error) {
            const message = error instanceof Error ? error.message : '网易云资产迁移失败';
            if (this.importStatus) {
                this.importStatus.style.display = 'block';
                this.importStatus.textContent = `资产迁移异常：${message}`;
            }
            this.renderAssetMigrationProgress(`\u8d44\u4ea7\u8fc1\u79fb\u5f02\u5e38\uff1a${message}`, {force: true});
            appNotificationService.showError(message);
        } finally {
            if (this.assetMigrationProgressFlushTimer !== null) {
                window.clearTimeout(this.assetMigrationProgressFlushTimer);
                this.assetMigrationProgressFlushTimer = null;
            }
            this.pendingAssetMigrationProgressMessage = '';
            this.pendingAssetMigrationProgressStatusText = '';
            this.isAssetMigrationRunning = false;
            this.assetMigrationCancelRequested = false;
            this.setAssetMigrationCancelVisible(false);
            if (this.importAssetsBtn) this.importAssetsBtn.disabled = false;
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = !this.currentPlaylist;
            this.pendingAssetMigrationPreview = null;
        }
    }

    async startAssetMigrationFromAccountMenu(): Promise<void> {
        this.showImportModal();
        await this.openAssetMigration();
    }

    private async lookupPlaylist(): Promise<void> {
        const session = ++this.importLookupSession;
        const input = this.playlistIdInput?.value?.trim() || '';

        if (!input) {
            this.currentPlaylist = null;
            if (this.importPreview) this.importPreview.style.display = 'none';
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
            if (this.importStatus) this.importStatus.style.display = 'none';
            return;
        }

        const playlistId = netEasePlaylistImportService.parsePlaylistId(input);
        if (!playlistId) {
            this.currentPlaylist = null;
            if (this.importPreview) this.importPreview.style.display = 'none';
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
            if (this.importStatus) {
                this.importStatus.style.display = 'block';
                this.importStatus.textContent = '请输入有效的网易云歌单链接或 ID';
            }
            return;
        }

        if (this.importStatus) {
            this.importStatus.style.display = 'block';
            this.importStatus.textContent = '正在识别歌单...';
        }

        const available = await netEaseApiClient.checkAvailability();
        this.isAvailable = available;
        if (!available) {
            this.isLoggedIn = false;
        }
        this.updateStatusIndicator();
        if (session !== this.importLookupSession) return;
        if (!available) {
            this.currentPlaylist = null;
            if (this.importPreview) this.importPreview.style.display = 'none';
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
            if (this.importStatus) this.importStatus.textContent = '网易云 API 服务未启动，请启动服务后点击识别歌单重试。';
            return;
        }

        const playlist = await netEasePlaylistImportService.getPlaylistDetail(playlistId);
        if (session !== this.importLookupSession) return;
        if (!playlist) {
            this.currentPlaylist = null;
            if (this.importPreview) this.importPreview.style.display = 'none';
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;
            if (this.importStatus) this.importStatus.textContent = '无法获取歌单信息';
            return;
        }

        this.currentPlaylist = playlist;
        if (this.importStatus) this.importStatus.style.display = 'none';
        if (this.importConfirmBtn) this.importConfirmBtn.disabled = false;
        this.renderImportPreview(playlist);
    }

    private renderImportPreview(playlist: NetEasePlaylist): void {
        if (!this.importPreview) return;

        this.importPreview.style.display = 'block';

        const coverEl = document.getElementById('netease-import-cover');
        if (coverEl) {
            coverEl.innerHTML = `<img src="${playlist.cover}?param=200y200" alt="">`;
        }

        const infoEl = document.getElementById('netease-import-info');
        if (infoEl) {
            infoEl.innerHTML = `
                <h4>${this.escapeHtml(playlist.name)}</h4>
                <p class="netease-import-meta">${playlist.trackCount} \u9996\u6b4c\u66f2</p>
                ${playlist.description ? `<p class="netease-import-description">${this.escapeHtml(playlist.description)}</p>` : ''}
            `;
        }

        const tracksEl = document.getElementById('netease-import-tracks');
        if (tracksEl) {
            const formatDuration = (seconds: number): string => {
                const min = Math.floor(seconds / 60);
                const sec = seconds % 60;
                return `${min}:${sec.toString().padStart(2, '0')}`;
            };

            tracksEl.innerHTML = playlist.tracks.slice(0, 50).map((track, i) => `
                <div class="netease-import-track">
                    <span class="netease-import-track-index">${i + 1}</span>
                    <span class="netease-import-track-title">${this.escapeHtml(track.title)}</span>
                    <span class="netease-import-track-artist">${this.escapeHtml(track.artist)}</span>
                    <span class="netease-import-track-duration">${formatDuration(track.duration)}</span>
                </div>
            `).join('') + (playlist.tracks.length > 50 ? `<div class="netease-import-more">\u8fd8\u6709 ${playlist.tracks.length - 50} \u9996\u672a\u663e\u793a</div>` : '');
        }
    }

    private async doImportPlaylist(): Promise<void> {
        if (!this.currentPlaylist) {
            await this.lookupPlaylist();
            if (!this.currentPlaylist) {
                appNotificationService.showError('\u8bf7\u5148\u8f93\u5165\u6709\u6548\u7684\u7f51\u6613\u4e91\u6b4c\u5355\u94fe\u63a5\u6216 ID');
                return;
            }
        }

        if (this.importStatus) {
            this.importStatus.style.display = 'block';
            this.importStatus.textContent = '\u6b63\u5728\u68c0\u67e5\u6b4c\u5355...';
        }
        if (this.importConfirmBtn) this.importConfirmBtn.disabled = true;

        let createdPlaylistId: string | null = null;

        try {
            const externalId = String(this.currentPlaylist.id);

            const existing = await libraryDataService.getPlaylistByExternalId(externalId, 'netease');
            if (existing && existing.success && (existing as any).playlist) {
                const existingPlaylist = (existing as any).playlist;
                if (this.importStatus) this.importStatus.textContent = '\u6b4c\u5355\u5df2\u5b58\u5728\uff0c\u6b63\u5728\u540c\u6b65...';

                const snapshot = await netEaseMigrationReportService.createSnapshot(existingPlaylist.id);
                let syncResult = await netEaseSyncStateService.syncPlaylistWithState(existingPlaylist.id, externalId);
                if (!syncResult.success && syncResult.state.status === 'conflict') {
                    syncResult = await netEaseSyncStateService.syncPlaylistWithState(existingPlaylist.id, externalId, {
                        allowConflict: true
                    });
                }
                const syncFailures: NetEaseMigrationFailure[] = syncResult.success ? [] : [{
                    songId: externalId,
                    title: this.currentPlaylist.name,
                    reason: syncResult.state.failureReason || syncResult.error || '同步失败'
                }];
                const syncReport = netEaseMigrationReportService.recordPlaylistSync({
                    externalId,
                    playlistId: existingPlaylist.id,
                    playlistName: existingPlaylist.name || this.currentPlaylist.name,
                    snapshot,
                    total: this.currentPlaylist.tracks.length,
                    added: syncResult.addedCount,
                    existing: syncResult.existingCount,
                    skipped: syncResult.skippedCount,
                    failures: syncFailures,
                    status: syncResult.success ? 'synced' : 'failed'
                });
                if (syncResult.success) {
                    let msg = `\u540c\u6b65\u5b8c\u6210\uff1a\u65b0\u589e ${syncResult.addedCount} \u9996`;
                    if (syncResult.removedRemoteCount > 0) {
                        msg += `\uff0c\u4e91\u7aef\u5df2\u79fb\u9664 ${syncResult.removedRemoteCount} \u9996\uff08\u672c\u5730\u6682\u4fdd\u7559\uff09`;
                    }
                    appNotificationService.showSuccess(msg);
                    libraryController.emitLibraryUpdated([]);
                    this.emit('playlistImported', {playlistId: existingPlaylist.id, externalId, sync: true});
                    this.renderImportReport(syncReport);
                } else {
                    if (this.importStatus) this.importStatus.textContent = `\u540c\u6b65\u5931\u8d25\uff1a${syncResult.error || '\u672a\u77e5\u9519\u8bef'}`;
                    appNotificationService.showError(syncResult.error || '\u540c\u6b65\u5931\u8d25');
                }
                return;
            }

            const available = await netEaseApiClient.checkAvailability();
            this.isAvailable = available;
            if (!available) {
                this.isLoggedIn = false;
            }
            this.updateStatusIndicator();
            if (!available) {
                const message = '\u7f51\u6613\u4e91 API \u670d\u52a1\u672a\u542f\u52a8\uff0c\u8bf7\u542f\u52a8\u670d\u52a1\u540e\u91cd\u8bd5\u3002';
                if (this.importStatus) this.importStatus.textContent = message;
                appNotificationService.showError(message);
                return;
            }

            const total = this.currentPlaylist.tracks.length;
            if (total === 0) {
                if (this.importStatus) this.importStatus.textContent = '\u5bfc\u5165\u5931\u8d25\uff1a\u6b4c\u5355\u4e3a\u7a7a';
                appNotificationService.showError('\u6b4c\u5355\u4e3a\u7a7a\uff0c\u6ca1\u6709\u53ef\u5bfc\u5165\u7684\u6b4c\u66f2');
                return;
            }

            const snapshot: NetEaseMigrationSnapshot = await netEaseMigrationReportService.createSnapshot();
            const playlists = await libraryDataService.getPlaylists();
            const playlistNames = new Set((playlists || []).map((playlist) => playlist.name));
            const baseName = `[\u7f51\u6613\u4e91] ${this.currentPlaylist.name}`;
            let playlistName = baseName;
            let suffix = 2;
            while (playlistNames.has(playlistName)) {
                playlistName = `${baseName} (${suffix})`;
                suffix++;
            }

            if (this.importStatus) this.importStatus.textContent = '\u6b63\u5728\u521b\u5efa\u6b4c\u5355...';
            const createResult = await libraryController.createPlaylist(
                playlistName,
                this.currentPlaylist.description || ''
            );

            if (!createResult || !createResult.success || !createResult.playlist) {
                const errMsg = (createResult as any)?.error || '\u672a\u77e5\u9519\u8bef';
                const report = netEaseMigrationReportService.recordPlaylistImport({
                    externalId,
                    playlistName,
                    snapshot,
                    total,
                    added: 0,
                    existing: 0,
                    skipped: total,
                    duplicates: 0,
                    failures: [{
                        songId: externalId,
                        title: this.currentPlaylist.name,
                        reason: `创建歌单失败：${errMsg}`
                    }],
                    status: 'failed'
                });
                this.renderImportReport(report);
                if (this.importStatus) this.importStatus.textContent = `\u521b\u5efa\u6b4c\u5355\u5931\u8d25\uff1a${errMsg}`;
                appNotificationService.showError(`\u521b\u5efa\u6b4c\u5355\u5931\u8d25\uff1a${errMsg}`);
                return;
            }

            const pid = createResult.playlist.id;
            createdPlaylistId = pid;

            const metadataResult = await libraryDataService.updatePlaylistMetadata(pid, {
                source: 'netease',
                externalId,
                externalType: 'playlist',
                syncEnabled: true,
                lastSyncedAt: Date.now(),
                coverImagePath: this.currentPlaylist.cover
            });
            if (!metadataResult || !metadataResult.success) {
                const metaErr = (metadataResult as any)?.error || '\u672a\u77e5\u9519\u8bef';
                await libraryController.deletePlaylist(pid);
                createdPlaylistId = null;
                const report = netEaseMigrationReportService.recordPlaylistImport({
                    externalId,
                    playlistId: pid,
                    playlistName,
                    snapshot,
                    total,
                    added: 0,
                    existing: 0,
                    skipped: total,
                    duplicates: 0,
                    failures: [{
                        songId: externalId,
                        title: this.currentPlaylist.name,
                        reason: `歌单元数据写入失败：${metaErr}`
                    }],
                    status: 'failed'
                });
                this.renderImportReport(report);
                if (this.importStatus) this.importStatus.textContent = `\u6b4c\u5355\u5143\u6570\u636e\u5199\u5165\u5931\u8d25\uff1a${metaErr}`;
                appNotificationService.showError(`\u6b4c\u5355\u5143\u6570\u636e\u5199\u5165\u5931\u8d25\uff1a${metaErr}`);
                return;
            }

            let addedCount = 0;
            let skippedCount = 0;
            let existingCount = 0;
            let duplicateCount = 0;
            const failures: NetEaseMigrationFailure[] = [];

            for (const song of this.currentPlaylist.tracks) {
                try {
                    const trackData: Partial<Track> = {
                        filePath: `netease://${song.id}`,
                        title: song.title,
                        artist: song.artist,
                        album: song.album,
                        duration: song.duration,
                        cover: song.cover
                    };

                    const trackResult = await libraryController.addTrackToLibrary(trackData);
                    const fileId = trackResult?.track?.fileId;
                    if (!trackResult?.success || !fileId) {
                        skippedCount++;
                        failures.push({
                            songId: song.id,
                            title: song.title,
                            reason: trackResult?.error || '添加到音乐库失败'
                        });
                        continue;
                    }

                    if (trackResult.isNew === false) {
                        existingCount++;
                        duplicateCount++;
                    }

                    const addResult = await libraryController.addToPlaylist(pid, fileId);
                    const addResults = (addResult as {results?: Array<{success?: boolean}>})?.results;
                    const addOk = !!addResult?.success && (!addResults || addResults.some((item) => item.success));
                    if (addOk) {
                        addedCount++;
                    } else {
                        skippedCount++;
                        failures.push({
                            songId: song.id,
                            title: song.title,
                            reason: (addResult as any)?.error || '添加到歌单失败'
                        });
                    }
                } catch (error) {
                    skippedCount++;
                    failures.push({
                        songId: song.id,
                        title: song.title,
                        reason: error instanceof Error ? error.message : '导入异常'
                    });
                }

                if (this.importStatus) {
                    this.importStatus.textContent = `\u6b63\u5728\u5bfc\u5165\u6b4c\u66f2... ${addedCount}/${total}`;
                }
            }

            if (addedCount === 0) {
                await libraryController.deletePlaylist(pid);
                createdPlaylistId = null;
                const report = netEaseMigrationReportService.recordPlaylistImport({
                    externalId,
                    playlistId: pid,
                    playlistName,
                    snapshot,
                    total,
                    added: addedCount,
                    existing: existingCount,
                    skipped: skippedCount,
                    duplicates: duplicateCount,
                    failures,
                    status: 'failed'
                });
                this.renderImportReport(report);
                if (this.importStatus) this.importStatus.textContent = '\u5bfc\u5165\u5931\u8d25\uff1a\u6ca1\u6709\u6b4c\u66f2\u6210\u529f\u52a0\u5165\u6b4c\u5355';
                appNotificationService.showError('\u6ca1\u6709\u6b4c\u66f2\u6210\u529f\u52a0\u5165\u6b4c\u5355\uff0c\u8bf7\u68c0\u67e5 NetEase API \u72b6\u6001\u3002');
                libraryController.emitLibraryUpdated([]);
                return;
            }

            await libraryDataService.updatePlaylistMetadata(pid, {lastSyncedAt: Date.now()});

            const skippedSuffix = skippedCount > 0 ? `\uff0c\u8df3\u8fc7 ${skippedCount} \u9996` : '';
            const report = netEaseMigrationReportService.recordPlaylistImport({
                externalId,
                playlistId: pid,
                playlistName,
                snapshot,
                total,
                added: addedCount,
                existing: existingCount,
                skipped: skippedCount,
                duplicates: duplicateCount,
                failures,
                createdPlaylistId: pid
            });
            appNotificationService.showSuccess(`\u6b4c\u5355\u5bfc\u5165\u5b8c\u6210\uff1a${addedCount}/${total} \u9996${skippedSuffix}`);
            libraryController.emitLibraryUpdated([]);
            this.emit('playlistImported', {playlistId: pid, externalId, sync: false});
            this.renderImportReport(report);
            createdPlaylistId = null;
        } catch (error) {
            if (createdPlaylistId) {
                await libraryController.deletePlaylist(createdPlaylistId).catch(() => undefined);
            }
            const msg = error instanceof Error ? error.message : '\u5bfc\u5165\u5931\u8d25';
            if (this.importStatus) this.importStatus.textContent = `\u5bfc\u5165\u5f02\u5e38\uff1a${msg}`;
            appNotificationService.showError(`\u5bfc\u5165\u5f02\u5e38\uff1a${msg}`);
        } finally {
            if (this.importConfirmBtn) this.importConfirmBtn.disabled = false;
        }
    }

    // ==================== Login ====================

    private async startQRLogin(): Promise<void> {
        const qrImage = document.getElementById('netease-qr-image');
        const qrStatus = document.getElementById('netease-qr-status');
        const getQrBtn = document.getElementById('netease-get-qr-btn') as HTMLButtonElement;

        this.clearQRLoginDiagnostics();
        if (qrStatus) {
            qrStatus.style.color = 'var(--text-secondary)';
            qrStatus.textContent = '正在获取二维码...';
        }
        if (getQrBtn) getQrBtn.disabled = true;

        const available = await netEaseApiClient.checkAvailability();
        this.isAvailable = available;
        if (!available) {
            this.isLoggedIn = false;
        }
        this.updateStatusIndicator();
        if (!available) {
            if (qrStatus) qrStatus.textContent = '网易云 API 服务未启动，请先启动本地 NetEase API 服务后重试。';
            if (getQrBtn) getQrBtn.disabled = false;
            return;
        }

        const qrResult = await netEaseAuthService.getQRCode();
        if (!qrResult) {
            if (qrStatus) qrStatus.textContent = '获取二维码失败，请重试';
            if (getQrBtn) getQrBtn.disabled = false;
            return;
        }

        if (qrImage && qrResult.qrimg) {
            qrImage.innerHTML = `<img src="${qrResult.qrimg}" style="width: 200px; height: 200px;">`;
        } else if (qrImage && qrResult.qrurl) {
            qrImage.innerHTML = `
                <div style="padding: 16px; background: var(--color-bg-secondary, #f5f5f5); border-radius: 8px;">
                    <p style="margin: 0 0 8px; font-size: 13px;">\u8bf7\u4f7f\u7528\u7f51\u6613\u4e91\u97f3\u4e50 APP \u626b\u63cf\uff1a</p>
                    <a href="${qrResult.qrurl}" target="_blank" style="font-size: 12px; word-break: break-all;">${qrResult.qrurl}</a>
                </div>
            `;
        }

        if (qrStatus) qrStatus.textContent = '请使用网易云音乐APP扫码登录';
        if (getQrBtn) getQrBtn.disabled = false;

        this.startQRCheckPoll();
    }

    private startQRCheckPoll(): void {
        netEaseAuthService.stopQRCheck();

        const qrStatus = document.getElementById('netease-qr-status');

        const timer = window.setInterval(async () => {
            const result = await netEaseAuthService.checkQRStatus();

            switch (result.status) {
                case 'waiting':
                    if (qrStatus) {
                        qrStatus.style.color = 'var(--text-secondary)';
                        qrStatus.textContent = '请使用网易云音乐APP扫码登录';
                    }
                    break;
                case 'scanned':
                    if (qrStatus) {
                        qrStatus.style.color = 'var(--text-secondary)';
                        qrStatus.textContent = '已扫码，请在手机上确认登录';
                    }
                    break;
                case 'confirmed':
                    netEaseAuthService.stopQRCheck();
                    if (qrStatus) {
                        qrStatus.style.color = 'var(--text-secondary)';
                        qrStatus.textContent = '手机已确认，正在同步账号状态...';
                    }
                    const confirmation = await netEaseAuthService.confirmQRLogin(result.cookie);
                    const accountProfile = confirmation.profile;
                    if (!accountProfile) {
                        this.isLoggedIn = false;
                        this.updateStatusIndicator();
                        const diagnosticsText = this.formatQRLoginDiagnostics(confirmation.diagnostics);
                        this.lastQRLoginDiagnosticsText = this.buildQRLoginDiagnosticsText(confirmation.diagnostics, diagnosticsText);
                        this.setQRDiagnosticsActionsVisible(true);
                        this.setQRRetryLabel(true);
                        console.warn('[NetEaseCloudMusic] QR login finalization failed', confirmation.diagnostics);
                        if (qrStatus) {
                            qrStatus.style.color = 'var(--error-color, #ff4444)';
                            qrStatus.textContent = `手机已确认，但账号状态同步失败，请重新获取二维码。${diagnosticsText}`;
                        }
                        appNotificationService.showError('网易云登录状态同步失败，请重新扫码');
                        window.dispatchEvent(new CustomEvent('netease-login-status-changed'));
                        break;
                    }
                    this.isLoggedIn = true;
                    this.updateStatusIndicator();
                    this.clearQRLoginDiagnostics();
                    if (qrStatus) {
                        qrStatus.style.color = 'var(--success-color, #4caf50)';
                        qrStatus.textContent = '登录成功！';
                    }
                    appNotificationService.showSuccess('网易云音乐登录成功');
                    if (qrStatus) {
                        qrStatus.textContent = `${qrStatus.textContent || ''} ${accountProfile.nickname || '\u7528\u6237'}`.trim();
                    }
                    window.dispatchEvent(new CustomEvent('netease-login-status-changed'));
                    setTimeout(() => this.hideModal(this.loginModal), 1500);
                    break;
                case 'expired':
                    netEaseAuthService.stopQRCheck();
                    this.setQRRetryLabel(true);
                    if (qrStatus) {
                        qrStatus.style.color = 'var(--error-color, #ff4444)';
                        qrStatus.textContent = '二维码已过期，请重新获取';
                    }
                    break;
            }
        }, 1500);

        (netEaseAuthService as any).qrCheckTimer = timer;
    }

    private formatQRLoginDiagnostics(diagnostics: {
        cookieAdopted: boolean;
        attempts: number;
        lastAccountCheck: string;
    }): string {
        const cookieText = diagnostics.cookieAdopted ? '已收到登录凭证' : '未收到登录凭证';
        const checkText: Record<string, string> = {
            'not-started': '尚未校验账号',
            'missing-cookie': '缺少账号 Cookie',
            'profile-found': '账号已确认',
            'profile-missing': '账号资料为空',
            'request-failed': '账号校验请求失败'
        };
        return `诊断：${cookieText}，校验 ${diagnostics.attempts} 次，${checkText[diagnostics.lastAccountCheck] || diagnostics.lastAccountCheck}`;
    }

    private async doPhoneLogin(): Promise<void> {
        const phoneInput = document.getElementById('netease-login-phone') as HTMLInputElement;
        const passwordInput = document.getElementById('netease-login-password') as HTMLInputElement;
        const statusEl = document.getElementById('netease-login-status');

        const phone = phoneInput?.value?.trim();
        const password = passwordInput?.value?.trim();

        if (!phone || !password) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.color = 'var(--error-color, #ff4444)';
                statusEl.textContent = '请输入手机号和密码';
            }
            return;
        }

        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = 'var(--text-secondary)';
            statusEl.textContent = '正在登录...';
        }

        const available = await netEaseApiClient.checkAvailability();
        this.isAvailable = available;
        if (!available) {
            this.isLoggedIn = false;
        }
        this.updateStatusIndicator();
        if (!available) {
            if (statusEl) {
                statusEl.style.color = 'var(--error-color, #ff4444)';
                statusEl.textContent = '网易云 API 服务未启动，请先启动本地 NetEase API 服务后重试。';
            }
            return;
        }

        const result = await netEaseAuthService.loginWithPhone(phone, password);

        if (result.success) {
            this.isLoggedIn = true;
            this.updateStatusIndicator();
            if (statusEl) {
                statusEl.style.color = 'var(--success-color, #4caf50)';
                statusEl.textContent = `登录成功: ${result.nickname || '用户'}`;
            }
            appNotificationService.showSuccess('网易云音乐登录成功');
            window.dispatchEvent(new CustomEvent('netease-login-status-changed'));
            setTimeout(() => this.hideModal(this.loginModal), 1500);
        } else {
            if (statusEl) {
                statusEl.style.color = 'var(--error-color, #ff4444)';
                statusEl.textContent = '登录失败: ' + (result.error || '请检查账号密码');
            }
        }
    }

    private showLoginModal(): void {
        this.showModal(this.loginModal);
        this.switchLoginTab('qr');
    }

    openLoginModal(): void {
        this.showLoginModal();
    }

    private switchLoginTab(tab: 'qr' | 'phone'): void {
        const qrTab = document.getElementById('netease-login-tab-qr');
        const phoneTab = document.getElementById('netease-login-tab-phone');
        const qrSection = document.getElementById('netease-qr-login-section');
        const phoneSection = document.getElementById('netease-phone-login-section');

        qrTab?.classList.toggle('btn-primary', tab === 'qr');
        qrTab?.classList.toggle('btn-secondary', tab !== 'qr');
        phoneTab?.classList.toggle('btn-primary', tab === 'phone');
        phoneTab?.classList.toggle('btn-secondary', tab !== 'phone');

        if (qrSection) qrSection.style.display = tab === 'qr' ? 'block' : 'none';
        if (phoneSection) phoneSection.style.display = tab === 'phone' ? 'block' : 'none';
    }

    private updateStatusIndicator(): void {
        const indicator = document.getElementById('netease-status-indicator');
        const dot = document.getElementById('netease-status-dot');
        const label = document.getElementById('netease-status-label');

        if (!indicator || !dot || !label) return;

        dot.classList.remove('netease-dot-online', 'netease-dot-offline');
        if (!this.isAvailable) {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            dot.classList.add('netease-dot-offline');
            label.textContent = '\u7f51\u6613\u4e91\u670d\u52a1\u672a\u542f\u52a8';
            return;
        }

        if (!this.isLoggedIn) {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            dot.classList.add('netease-dot-offline');
            label.textContent = '\u7f51\u6613\u4e91\u672a\u767b\u5f55';
            return;
        }

        indicator.classList.remove('offline');
        indicator.classList.add('online');
        dot.classList.add('netease-dot-online');
        label.textContent = '\u7f51\u6613\u4e91\u5728\u7ebf';
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export {NetEaseCloudMusic};
