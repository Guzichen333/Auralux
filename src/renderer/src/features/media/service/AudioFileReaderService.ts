import {mediaGateway} from '@/infrastructure/electron/MediaGateway';

export class AudioFileReaderService {
    async readAudioFile(filePath: string): Promise<ArrayBuffer> {
        return await mediaGateway.readAudioFile(filePath);
    }

    async createAudioStreamUrl(filePath: string): Promise<string> {
        return await mediaGateway.createAudioStreamUrl(filePath);
    }

    async createRemoteAudioStreamUrl(remoteUrl: string): Promise<string> {
        return await mediaGateway.createRemoteAudioStreamUrl(remoteUrl);
    }
}

export const audioFileReaderService = new AudioFileReaderService();
