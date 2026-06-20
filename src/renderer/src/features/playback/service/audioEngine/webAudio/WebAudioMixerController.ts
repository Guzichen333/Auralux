import {webAudioChain} from './WebAudioChain';
import WebAudioEqualizer from '@/features/equalizer/service/WebAudioEqualizer';

type VolumeChangedCallback = ((volume: number) => void) | null;
type EqualizerChangedCallback = ((state: {enabled: boolean}) => void) | null;

type WebAudioMixerOptions = {
    getVolumeChangedCallback: () => VolumeChangedCallback;
    getEqualizerChangedCallback: () => EqualizerChangedCallback;
};

class WebAudioMixerController {
    private readonly options: WebAudioMixerOptions;
    private audioContext: AudioContext | null;
    private gainNode: GainNode | null;
    private analyserNode: AnalyserNode | null;
    private analyserData: Uint8Array<ArrayBuffer> | null;
    private volume: number;
    private equalizer: WebAudioEqualizer | null;
    private equalizerEnabled: boolean;

    constructor(options: WebAudioMixerOptions) {
        this.options = options;
        this.audioContext = null;
        this.gainNode = null;
        this.analyserNode = null;
        this.analyserData = null;
        this.volume = 0.7;
        this.equalizer = null;
        this.equalizerEnabled = false;
    }

    initialize(audioContext: AudioContext): void {
        this.audioContext = audioContext;
        this.gainNode = audioContext.createGain();
        this.analyserNode = audioContext.createAnalyser();
        this.analyserNode.fftSize = 2048;
        this.analyserNode.smoothingTimeConstant = 0.72;
        this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount);
        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(audioContext.destination);
        this.gainNode.gain.value = this.volume;
        this.equalizer = new WebAudioEqualizer(audioContext);
    }

    setVolume(volume: number): boolean {
        try {
            this.volume = Math.max(0, Math.min(1, volume));

            if (this.audioContext && this.gainNode) {
                this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            }

            console.log(`🔊 音量设置为: ${(this.volume * 100).toFixed(0)}%`);

            const onVolumeChanged = this.options.getVolumeChangedCallback();
            if (onVolumeChanged) {
                onVolumeChanged(this.volume);
            }

            return true;
        } catch (error) {
            console.error('❌ 音量设置失败:', error);
            return false;
        }
    }

    getVolume(): number {
        return this.volume;
    }

    getEqualizer(): WebAudioEqualizer | null {
        return this.equalizer;
    }

    getFrequencySpectrum(binCount = 64): number[] {
        if (!this.analyserNode || !this.analyserData) {
            return [];
        }

        this.analyserNode.getByteFrequencyData(this.analyserData);
        const count = Math.max(8, Math.min(128, Math.floor(binCount)));
        const output: number[] = [];
        const sourceLength = this.analyserData.length;
        const minBin = 2;
        const maxBin = Math.max(minBin + 1, Math.floor(sourceLength * 0.72));

        for (let i = 0; i < count; i++) {
            const startRatio = i / count;
            const endRatio = (i + 1) / count;
            const start = Math.floor(minBin + Math.pow(startRatio, 1.85) * (maxBin - minBin));
            const end = Math.max(start + 1, Math.floor(minBin + Math.pow(endRatio, 1.85) * (maxBin - minBin)));
            let peak = 0;
            let sum = 0;
            let samples = 0;

            for (let bin = start; bin < end && bin < sourceLength; bin++) {
                const value = this.analyserData[bin];
                peak = Math.max(peak, value);
                sum += value;
                samples += 1;
            }

            const average = samples > 0 ? sum / samples : 0;
            const normalized = Math.min(1, ((peak * 0.72) + (average * 0.28)) / 255);
            output.push(Math.pow(normalized, 0.72));
        }

        return output;
    }

    setEqualizerEnabled(
        enabled: boolean,
        currentSourceNode: AudioNode | null,
        isPlaying: boolean
    ): void {
        if (this.equalizerEnabled === enabled) {
            return;
        }

        this.equalizerEnabled = enabled;

        if (currentSourceNode && isPlaying) {
            this.reconnectSource(currentSourceNode);
        }

        const onEqualizerChanged = this.options.getEqualizerChangedCallback();
        if (onEqualizerChanged) {
            onEqualizerChanged({enabled});
        }
    }

    connectSource(sourceNode: AudioNode | null): void {
        if (!this.audioContext || !sourceNode || !this.gainNode) {
            console.warn('⚠️ sourceNode不存在，无法连接音频链');
            return;
        }

        webAudioChain.connect({
            audioContext: this.audioContext,
            sourceNode,
            gainNode: this.gainNode,
            outputNode: this.analyserNode || undefined,
            equalizer: this.equalizer,
            equalizerEnabled: this.equalizerEnabled
        });
    }

    reconnectSource(sourceNode: AudioNode | null): boolean {
        if (!this.audioContext || !sourceNode || !this.gainNode) {
            console.warn('⚠️ sourceNode不存在，无法重新连接音频链');
            return false;
        }

        return webAudioChain.reconnect({
            audioContext: this.audioContext,
            sourceNode,
            gainNode: this.gainNode,
            outputNode: this.analyserNode || undefined,
            equalizer: this.equalizer,
            equalizerEnabled: this.equalizerEnabled
        });
    }

    destroy(): void {
        try {
            this.gainNode?.disconnect();
        } catch (error) {
            console.warn('⚠️ gainNode断开失败:', error);
        }

        try {
            this.analyserNode?.disconnect();
        } catch (error) {
            console.warn('鈿狅笍 analyserNode鏂紑澶辫触:', error);
        }

        if (this.equalizer) {
            this.equalizer.destroy();
            this.equalizer = null;
        }

        this.gainNode = null;
        this.analyserNode = null;
        this.analyserData = null;
        this.audioContext = null;
    }
}

export {WebAudioMixerController};
export default WebAudioMixerController;
