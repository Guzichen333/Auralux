// 系统托盘控制器

import * as fs from 'fs';
import * as path from 'path';
import {app, Tray, Menu, nativeImage} from 'electron';
import {BaseController, Controller, IpcHandle} from '../decorators/IpcHandler';
import {WindowManager} from '../core/WindowManager';

interface TraySettings {
    enabled: boolean;
    closeToTray: boolean;
    startMinimized: boolean;
}

type TrayPlayMode = 'sequence' | 'shuffle' | 'repeat-one';

interface TrayPlaybackState {
    title?: string;
    artist?: string;
    isPlaying?: boolean;
    liked?: boolean;
    playMode?: TrayPlayMode;
}

@Controller('tray')
export class TrayController extends BaseController {
    private tray: Tray | null = null;
    private settings: TraySettings = {enabled: true, closeToTray: false, startMinimized: false};
    private playbackState: TrayPlaybackState = {title: '', artist: '', isPlaying: false, liked: false, playMode: 'sequence'};
    private settingsFilePath: string;

    constructor(private windowManager: WindowManager) {
        super();
        this.settingsFilePath = path.join(app.getPath('userData'), 'tray-settings.json');
    }

    private async createTrayIcon(): Promise<Electron.NativeImage> {
        const appPath = app.getAppPath();
        const iconPaths = [
            path.join(__dirname, '../../../build/icons/icon.ico'),
            path.join(appPath, 'build/icons/icon.ico'),
            path.join(process.resourcesPath || '', 'build/icons/icon.ico'),
            path.join(__dirname, '../../../assets/brand/auralux-icon.png'),
            path.join(appPath, 'assets/brand/auralux-icon.png'),
            path.join(process.resourcesPath || '', 'assets/brand/auralux-icon.png'),
            path.join(__dirname, '../../../src/renderer/public/assets/images/favicon.ico'),
            path.join(appPath, 'src/renderer/public/favicon.ico'),
            path.join(appPath, 'src/renderer/src/assets/images/favicon.ico'),
            path.join(appPath, 'public/favicon.ico'),
            path.join(appPath, 'assets/favicon.ico')
        ];
        for (const iconPath of iconPaths) {
            try {
                await fs.promises.access(iconPath);
                const icon = nativeImage.createFromPath(iconPath);
                if (!icon.isEmpty()) return icon.resize({width: 16, height: 16});
            } catch {
            }
        }
        return nativeImage.createEmpty();
    }

    private updateTrayMenu(): void {
        if (!this.tray) return;
        const menu = Menu.buildFromTemplate([
            {label: this.getTrayTrackTitle(), enabled: false},
            {type: 'separator'},
            {label: '上一首', click: () => this.sendTrayAction('tray:previous')},
            {label: this.playbackState.isPlaying ? '暂停' : '播放/暂停', click: () => this.sendTrayAction('tray:play-pause')},
            {label: '下一首', click: () => this.sendTrayAction('tray:next')},
            {label: this.playbackState.liked ? '取消喜欢' : '喜欢', click: () => this.sendTrayAction('tray:favorite')},
            {type: 'separator'},
            {
                label: '列表循环',
                submenu: [
                    {
                        label: '顺序播放',
                        type: 'radio',
                        checked: this.playbackState.playMode === 'sequence',
                        click: () => this.sendTrayAction('tray:set-play-mode', 'sequence')
                    },
                    {
                        label: '随机播放',
                        type: 'radio',
                        checked: this.playbackState.playMode === 'shuffle',
                        click: () => this.sendTrayAction('tray:set-play-mode', 'shuffle')
                    },
                    {
                        label: '单曲循环',
                        type: 'radio',
                        checked: this.playbackState.playMode === 'repeat-one',
                        click: () => this.sendTrayAction('tray:set-play-mode', 'repeat-one')
                    }
                ]
            },
            {
                label: '完整模式',
                submenu: [
                    {label: '打开完整模式', click: () => this.showMainWindow()},
                    {label: '沉浸播放', click: () => this.sendTrayAction('tray:open-immersive')}
                ]
            },
            {type: 'separator'},
            {label: '打开音乐桌面', click: () => this.showMainWindow()},
            {label: '打开桌面歌词', click: () => this.sendTrayAction('tray:open-desktop-lyrics')},
            {type: 'separator'},
            {label: '设置', click: () => this.sendTrayAction('tray:open-settings')},
            {type: 'separator'},
            {
                label: '退出', click: () => {
                    this.windowManager.sendToMainWindow('tray:quit');
                    setTimeout(() => app.quit(), 300);
                }
            }
        ]);
        this.tray.setContextMenu(menu);
    }

    private getTrayTrackTitle(): string {
        const title = (this.playbackState.title || '').trim();
        const artist = (this.playbackState.artist || '').trim();
        if (!title) {
            return '暂无播放';
        }
        return artist ? `${title} - ${artist}` : title;
    }

    private sendTrayAction(channel: string, payload?: unknown): void {
        this.windowManager.sendToMainWindow(channel, payload);
    }

    private showMainWindow(): void {
        const win = this.windowManager.getMainWindow();
        if (win) {
            win.show();
            win.focus();
        }
    }

    private async createTrayInstance(): Promise<void> {
        if (this.tray) return;
        const icon = await this.createTrayIcon();
        this.tray = new Tray(icon);
        this.tray.setToolTip('Auralux');
        this.updateTrayMenu();
        this.tray.on('click', () => {
            const win = this.windowManager.getMainWindow();
            if (!win) return;
            if (win.isVisible()) {
                if (win.isFocused()) win.hide();
                else {
                    win.show();
                    win.focus();
                }
            } else {
                this.showMainWindow();
            }
        });
    }

    private destroyTrayInstance(): void {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }

    private async saveTraySettings(): Promise<void> {
        await fs.promises.writeFile(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf8');
    }

    @IpcHandle('tray:create')
    async create(): Promise<{ success: boolean; error?: string }> {
        try {
            await this.createTrayInstance();
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error.message};
        }
    }

    @IpcHandle('tray:destroy')
    destroy(): { success: boolean; error?: string } {
        try {
            this.destroyTrayInstance();
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error.message};
        }
    }

    @IpcHandle('tray:updateSettings')
    async updateSettings(settings: Partial<TraySettings>): Promise<{ success: boolean; error?: string }> {
        try {
            this.settings = {...this.settings, ...settings};
            await this.saveTraySettings();
            if (settings.enabled === false) this.destroyTrayInstance();
            else if (settings.enabled === true && !this.tray) await this.createTrayInstance();
            this.updateTrayMenu();
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error.message};
        }
    }

    @IpcHandle('tray:updatePlaybackState')
    updatePlaybackState(state: TrayPlaybackState): { success: boolean; error?: string } {
        try {
            this.playbackState = {...this.playbackState, ...state};
            this.updateTrayMenu();
            return {success: true};
        } catch (error: any) {
            return {success: false, error: error.message};
        }
    }

    @IpcHandle('tray:getSettings')
    getSettings(): TraySettings {
        return this.settings;
    }
}
