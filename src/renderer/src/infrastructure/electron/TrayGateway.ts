import {ElectronNamespaceAdapter} from './ElectronBridge';
import type {Unsubscribe} from '@api/types/common';

class TrayGateway extends ElectronNamespaceAdapter<'tray'> {
    constructor() {
        super('tray');
    }

    create(): Promise<void> {
        return this.call('create');
    }

    destroy(): Promise<void> {
        return this.call('destroy');
    }

    updateSettings(settings: unknown): Promise<void> {
        return this.call('updateSettings', settings);
    }

    updatePlaybackState(state: unknown): Promise<void> {
        return this.call('updatePlaybackState', state);
    }

    onAction(handler: (action: string, payload?: unknown) => void): Unsubscribe {
        return this.on('onAction', handler);
    }

    onQuit(handler: () => void): Unsubscribe {
        return this.on('onQuit', handler);
    }
}

export const trayGateway = new TrayGateway();
