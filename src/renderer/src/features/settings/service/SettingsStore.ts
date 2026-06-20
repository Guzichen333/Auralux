import {cacheManager} from "@/shared/cache";
import type {MusicBoxSettings} from "@api/types/settings";

export type SettingValue = string | number | boolean | object | null | undefined;

export interface SettingsInitialValues {
    language: string;
    autoplay: boolean;
    rememberPosition: boolean;
    desktopLyrics: boolean;
    recentPlay: boolean;
    showTrackCovers: boolean;
    gaplessPlayback: boolean;
    systemTray: boolean;
    trayCloseBehavior: string;
    trayStartMinimized: boolean;
    networkDriveEnabled: boolean;
    lyricsDirectory: string;
}

export interface SettingsSyncEvents {
    desktopLyricsEnabled: boolean;
    recentPlayEnabled: boolean;
    gaplessPlaybackEnabled: boolean;
    networkDriveEnabled: boolean;
}

const retiredSettingKeys = new Set([
    'statistics',
    'artistsPage',
    'albumsPage'
]);

class SettingsStore {
    private readonly cacheKey = 'musicbox-settings';

    load(): MusicBoxSettings {
        return this.migrate(cacheManager.getLocalCache<MusicBoxSettings>(this.cacheKey) || {});
    }

    save(settings: MusicBoxSettings): void {
        cacheManager.setLocalCache(this.cacheKey, this.migrate(settings));
    }

    update(settings: MusicBoxSettings, key: string, value: SettingValue): MusicBoxSettings {
        if (retiredSettingKeys.has(key)) {
            const migratedSettings = this.migrate(settings);
            this.save(migratedSettings);
            return migratedSettings;
        }

        const nextSettings = {
            ...settings,
            [key]: value
        };
        this.save(nextSettings);
        return this.migrate(nextSettings);
    }

    get<T = unknown>(settings: MusicBoxSettings, key: string, defaultValue: T | null = null): T | null {
        return (settings[key] !== undefined ? settings[key] : defaultValue) as T | null;
    }

    getInitialValues(settings: MusicBoxSettings): SettingsInitialValues {
        return {
            language: this.getString(settings, 'language', 'zh-CN'),
            autoplay: this.getBoolean(settings, 'autoplay', false),
            rememberPosition: this.getBoolean(settings, 'rememberPosition', false),
            desktopLyrics: this.getBoolean(settings, 'desktopLyrics', true),
            recentPlay: this.getBoolean(settings, 'recentPlay', true),
            showTrackCovers: this.getBoolean(settings, 'showTrackCovers', true),
            gaplessPlayback: this.getBoolean(settings, 'gaplessPlayback', false),
            systemTray: this.getBoolean(settings, 'systemTray', true),
            trayCloseBehavior: this.getString(settings, 'trayCloseBehavior', 'exit'),
            trayStartMinimized: this.getBoolean(settings, 'trayStartMinimized', false),
            networkDriveEnabled: this.getBoolean(settings, 'networkDriveEnabled', false),
            lyricsDirectory: this.getString(settings, 'lyricsDirectory', '')
        };
    }

    getSyncEvents(initialValues: SettingsInitialValues): SettingsSyncEvents {
        return {
            desktopLyricsEnabled: initialValues.desktopLyrics,
            recentPlayEnabled: initialValues.recentPlay,
            gaplessPlaybackEnabled: initialValues.gaplessPlayback,
            networkDriveEnabled: initialValues.networkDriveEnabled
        };
    }

    private getBoolean(settings: MusicBoxSettings, key: string, defaultValue: boolean): boolean {
        return typeof settings[key] === 'boolean' ? settings[key] as boolean : defaultValue;
    }

    private getString(settings: MusicBoxSettings, key: string, defaultValue: string): string {
        return typeof settings[key] === 'string' ? settings[key] as string : defaultValue;
    }

    private migrate(settings: MusicBoxSettings): MusicBoxSettings {
        const migratedSettings = {...settings};
        retiredSettingKeys.forEach((key) => {
            delete migratedSettings[key];
        });
        return migratedSettings;
    }
}

export const settingsStore = new SettingsStore();
