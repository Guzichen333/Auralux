import type {Track} from "@api/types/track";
import type {AppView} from "@/shared/types/AppContracts";

import type {
    ComponentEventName,
    ComponentNotificationPayload,
    PageComponentBindingContext
} from "./ComponentBindingTypes";

export class PageComponentBindings {
    constructor(private readonly context: PageComponentBindingContext) {}

    setupComponentEvents(componentName: ComponentEventName | null = null): void {
        if (componentName) {
            this.setupSingleComponentEvents(componentName);
            return;
        }

        const {app, components, content, playback} = this.context;

        components.homePage.on('trackPlayed', async (track: Track, index: number) => {
            await app.handleTrackPlayed(track, index);
        });

        components.homePage.on('viewChange', (view: AppView) => {
            content.navigateToView(view);
        });

        components.homePage.on('toggleLyricsFullscreen', () => {
            playback.toggleLyricsFullscreen(false);
        });

        if (components.recentPage) {
            this.setupSingleComponentEvents('recentPage');
        }

        if (components.networkDiskModal) {
            this.setupSingleComponentEvents('networkDiskModal');
        }

        if (components.networkDriveDetailPage) {
            this.setupSingleComponentEvents('networkDriveDetailPage');
        }
    }

    setupSingleComponentEvents(componentName: ComponentEventName | string): void {
        const {app, components, content, notify} = this.context;

        switch (componentName) {
            case 'recentPage':
                if (components.recentPage) {
                    components.recentPage.on('trackPlayed', async (track: Track, index: number) => {
                        await app.handleTrackPlayed(track, index);
                    });

                    components.recentPage.on('playAll', async (tracks: Track[]) => {
                        await app.handlePlayAllTracks(tracks);
                    });

                    components.recentPage.on('addToPlaylist', (track: Track) => {
                        app.addToPlaylist(track);
                    });

                    components.recentPage.on('viewChange', (view: AppView) => {
                        content.navigateToView(view);
                    });
                }
                break;

            case 'networkDiskModal':
                if (components.networkDiskModal) {
                    components.networkDiskModal.on('notification', (data: ComponentNotificationPayload) => {
                        notify(data);
                    });
                }
                break;

            case 'networkDriveDetailPage':
                if (components.networkDriveDetailPage) {
                    components.networkDriveDetailPage.on('driveRemoved', async (drive: unknown) => {
                        await app.handleDriveRemoved(drive);
                    });

                    components.networkDriveDetailPage.on('playTrack', async (track: Track, index: number) => {
                        await app.handleTrackPlayed(track, index);
                    });

                    components.networkDriveDetailPage.on('playTracks', async (tracks: Track[]) => {
                        await app.handlePlayAllTracks(tracks);
                    });

                    components.networkDriveDetailPage.on(
                        'trackRightClick',
                        (track: Track, index: number, x: number, y: number) => {
                            content.showContextMenu(x, y, track, index);
                        }
                    );
                }
                break;

            default:
                console.warn('🎵 App: 未知的组件名称:', componentName);
        }
    }
}
