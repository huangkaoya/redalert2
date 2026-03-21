import { ChannelType } from "./ChannelType";
import { CompositeDisposable } from "../../util/disposable/CompositeDisposable";
import { InternalPlaybackHandle } from "./InternalPlaybackHandle";
import { AudioLoop } from "./AudioLoop";
import { AudioSequence } from "./AudioSequence";
const SILENT_MP3 = "data:audio/mpeg;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST//w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
interface Mixer {
    onVolumeChange: {
        subscribe(handler: (channel: ChannelType, mixer: Mixer) => void): void;
        unsubscribe(handler: (channel: ChannelType, mixer: Mixer) => void): void;
    };
    getVolume(channel: ChannelType): number;
    isMuted(channel: ChannelType): boolean;
    setMuted(channel: ChannelType, muted: boolean): void;
}
interface AudioFile {
    getData(): ArrayBuffer;
    asFile(): File;
}
interface MusicState {
    source: MediaElementAudioSourceNode;
    playing: boolean;
    onEnd?: () => void;
}
export class AudioSystem {
    private mixer: Mixer;
    private audioContext?: AudioContext;
    private channels = new Map<ChannelType, GainNode>();
    private audioBufferCache = new Map<AudioFile, AudioBuffer>();
    private disposables = new CompositeDisposable();
    private soundsPlaying = new Set<AudioBufferSourceNode>();
    private musicState?: MusicState;
    constructor(mixer: Mixer) {
        this.mixer = mixer;
    }
    private handleVolumeChange = (channel: ChannelType, mixer: Mixer): void => {
        this.getChannel(channel).gain.value = mixer.isMuted(channel)
            ? 0
            : mixer.getVolume(channel);
    };
    isInitialized(): boolean {
        return !!this.audioContext;
    }
    isSuspended(): boolean {
        return this.audioContext?.state !== "running";
    }
    initialize(): void {
        if (this.isInitialized())
            return;
        this.audioContext = new AudioContext();
        this.mixer.onVolumeChange.subscribe(this.handleVolumeChange);
        this.disposables.add(() => this.mixer.onVolumeChange.unsubscribe(this.handleVolumeChange));
        this.createChannels(this.audioContext, this.mixer);
    }
    dispose(): void {
        this.disposables.dispose();
        if (this.audioContext) {
            const ctx = this.audioContext;
            if (ctx.state !== 'closed') {
                try {
                    void ctx.close().catch(() => { });
                }
                catch {
                }
            }
            this.soundsPlaying.clear();
            this.audioContext = undefined;
        }
    }
    private createChannels(audioContext: AudioContext, mixer: Mixer): void {
        const channelTypes = Object.keys(ChannelType)
            .map(Number)
            .filter((num) => !Number.isNaN(num));
        channelTypes.forEach((channelType) => {
            const gainNode = audioContext.createGain();
            gainNode.gain.value = mixer.getVolume(channelType);
            this.channels.set(channelType, gainNode);
        });
        const masterChannel = this.getChannel(ChannelType.Master);
        channelTypes.forEach((channelType) => {
            const channel = this.getChannel(channelType);
            if (channelType === ChannelType.Master) {
                channel.connect(audioContext.destination);
            }
            else if (channelType === ChannelType.Effect) {
                const compressor = audioContext.createDynamicsCompressor();
                channel.connect(compressor).connect(masterChannel);
            }
            else {
                channel.connect(masterChannel);
            }
        });
    }
    private getChannel(channelType: ChannelType): GainNode {
        if (!this.channels.has(channelType)) {
            throw new Error(`Sound channel "${channelType}" doesn't exist`);
        }
        return this.channels.get(channelType)!;
    }
    setMuted(muted: boolean): void {
        this.mixer.setMuted(ChannelType.Master, muted);
    }
    playWavFile(file: AudioFile, channel: ChannelType, volume: number = 1, pan: number = 0, delayMs: number = 0, rate: number = 1, loop: boolean = false): InternalPlaybackHandle {
        if (!this.isInitialized()) {
            throw new Error("Can't play audio file because audio system is not initialized");
        }
        const startTime = this.audioContext!.currentTime + delayMs / 1000;
        this.removeSuspendedSounds();
        return this.playWavFileAtTime(file, channel, startTime, volume, pan, rate, loop);
    }
    private removeSuspendedSounds(): void {
        if (this.isSuspended()) {
            this.soundsPlaying.forEach((source) => {
                try {
                    source.stop();
                }
                catch (error) {
                    console.error(error);
                }
            });
        }
    }
    playWavLoop(files: AudioFile[], channel: ChannelType, volume: number = 1, pan: number = 0, delayMs?: {
        min: number;
        max: number;
    }, rate: number = 1, attack: boolean = false, decay: boolean = false, loops: number = Number.POSITIVE_INFINITY): AudioLoop {
        if (!this.isInitialized()) {
            throw new Error("Can't play audio sequence because audio system is not initialized");
        }
        const audioContext = this.audioContext!;
        this.removeSuspendedSounds();
        const audioLoop = new AudioLoop(audioContext, volume, pan, rate, delayMs, attack, decay, loops, (buffer, startTime, vol, p, r) => {
            const handle = new InternalPlaybackHandle();
            return {
                handle,
                source: this.playAudioBuffer(handle, buffer, channel, vol, p, startTime, r, false),
            };
        });
        Promise.all(files.map((file) => this.decodeFile(file, audioContext)))
            .then((buffers) => {
            audioLoop.setBuffers(buffers);
        })
            .catch((error) => console.error(error));
        audioLoop.start(audioContext.currentTime);
        return audioLoop;
    }
    playWavSequence(files: AudioFile[], channel: ChannelType, volume: number = 1, pan: number = 0, delayMs: number = 0, rate: number = 1): AudioSequence {
        if (!this.isInitialized()) {
            throw new Error("Can't play audio sequence because audio system is not initialized");
        }
        const audioContext = this.audioContext!;
        this.removeSuspendedSounds();
        const audioSequence = new AudioSequence(audioContext, volume, pan, rate, delayMs, (buffer, startTime, vol, p, r) => {
            const handle = new InternalPlaybackHandle();
            return {
                handle,
                source: this.playAudioBuffer(handle, buffer, channel, vol, p, startTime, r, false),
            };
        });
        Promise.all(files.map((file) => this.decodeFile(file, audioContext)))
            .then((buffers) => {
            audioSequence.setBuffers(buffers);
        })
            .catch((error) => console.error(error));
        audioSequence.start(audioContext.currentTime);
        return audioSequence;
    }
    private async decodeFile(file: AudioFile, audioContext: AudioContext): Promise<AudioBuffer> {
        let buffer = this.audioBufferCache.get(file);
        if (!buffer) {
            const arrayBuffer = new Uint8Array(file.getData()).buffer;
            buffer = await audioContext.decodeAudioData(arrayBuffer);
            if (this.audioBufferCache.size >= 100) {
                this.audioBufferCache.delete(this.audioBufferCache.keys().next().value);
            }
            this.audioBufferCache.set(file, buffer);
        }
        return buffer;
    }
    private playWavFileAtTime(file: AudioFile, channel: ChannelType, startTime: number, volume: number = 1, pan: number = 0, rate: number = 1, loop: boolean = false): InternalPlaybackHandle {
        if (!this.isInitialized()) {
            throw new Error("Can't play audio file because audio system is not initialized");
        }
        const audioContext = this.audioContext!;
        const handle = new InternalPlaybackHandle();
        const cachedBuffer = this.audioBufferCache.get(file);
        if (cachedBuffer) {
            this.playAudioBuffer(handle, cachedBuffer, channel, volume, pan, startTime, rate, loop);
        }
        else {
            let arrayBuffer: ArrayBuffer;
            try {
                const data = file.getData();
                arrayBuffer = new Uint8Array(data).buffer;
            }
            catch (error) {
                console.error("Failed to decode wav file", error);
                return handle;
            }
            (async () => {
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                if (this.audioBufferCache.size >= 100) {
                    this.audioBufferCache.delete(this.audioBufferCache.keys().next().value);
                }
                this.audioBufferCache.set(file, buffer);
                if (!handle.stopRequested) {
                    this.playAudioBuffer(handle, buffer, channel, volume, pan, startTime, rate, loop);
                }
            })().catch((error) => console.error(error));
        }
        return handle;
    }
    private playAudioBuffer(handle: InternalPlaybackHandle, buffer: AudioBuffer, channel: ChannelType, volume: number, pan: number, startTime: number, rate: number, loop: boolean): AudioBufferSourceNode {
        const audioContext = this.audioContext!;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        const panNode = audioContext.createStereoPanner();
        panNode.pan.value = pan;
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.playbackRate.value = rate;
        sourceNode.loop = loop;
        sourceNode.connect(panNode).connect(gainNode).connect(this.getChannel(channel));
        handle.setNodes(sourceNode, gainNode, panNode);
        sourceNode.addEventListener("ended", () => {
            this.soundsPlaying.delete(sourceNode);
            (handle as any).playing = false;
        });
        this.soundsPlaying.add(sourceNode);
        sourceNode.start(startTime);
        return sourceNode;
    }
    async initMusicLoop(): Promise<void> {
        if (!this.isInitialized()) {
            throw new Error("Can't initialize music loop because audio system is not initialized");
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('[AudioSystem] AudioContext resumed successfully');
            }
            catch (error) {
                console.error('[AudioSystem] Failed to resume AudioContext:', error);
                throw error;
            }
        }
        if (!this.musicState) {
            this.initMusicNode();
        }
    }
    async playMusicFile(file: AudioFile, repeat: boolean, onEnded?: () => void): Promise<void> {
        if (!this.isInitialized()) {
            throw new Error("Can't play audio file because audio system is not initialized");
        }
        this.removeSuspendedSounds();
        this.stopMusic();
        const musicState = this.musicState ?? this.initMusicNode();
        const audioElement = musicState.source.mediaElement;
        audioElement.loop = repeat;
        const objectUrl = URL.createObjectURL(file.asFile());
        audioElement.src = objectUrl;
        audioElement.onended = audioElement.onpause = () => {
            URL.revokeObjectURL(objectUrl);
        };
        if (onEnded) {
            musicState.onEnd = onEnded;
            audioElement.addEventListener("ended", musicState.onEnd, { once: true });
        }
        await this.playOrResumeMusic();
    }
    private initMusicNode(): MusicState {
        const audioContext = this.audioContext!;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        const panNode = audioContext.createStereoPanner();
        panNode.pan.value = 0;
        const audioElement = document.createElement("audio");
        audioElement.src = SILENT_MP3;
        audioElement.loop = true;
        const sourceNode = audioContext.createMediaElementSource(audioElement);
        this.musicState = { source: sourceNode, playing: false };
        sourceNode.addEventListener("ended", () => {
            this.musicState!.playing = false;
        });
        sourceNode
            .connect(panNode)
            .connect(gainNode)
            .connect(this.getChannel(ChannelType.Music));
        return this.musicState;
    }
    private async playOrResumeMusic(): Promise<void> {
        if (this.musicState && !this.musicState.playing) {
            this.musicState.playing = true;
            try {
                await this.musicState.source.mediaElement.play()?.catch((error) => console.error(error));
            }
            catch (error) {
                console.error(error);
                this.musicState.playing = false;
            }
        }
    }
    stopMusic(): void {
        if (this.musicState?.playing) {
            try {
                if (this.musicState.onEnd) {
                    this.musicState.source.mediaElement.removeEventListener("ended", this.musicState.onEnd);
                }
                this.musicState.source.mediaElement.pause();
                this.musicState.source.mediaElement.src = SILENT_MP3;
                this.musicState.playing = false;
                this.musicState.onEnd = undefined;
            }
            catch (error) {
                console.error(error);
            }
        }
    }
}
