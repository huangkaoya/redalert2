interface AudioItem {
    startTime: number;
    duration: number;
    handle: {
        stop(): void;
        setVolume(volume: number): void;
        setPan(pan: number): void;
    };
}
interface PlayBufferResult {
    handle: {
        stop(): void;
        setVolume(volume: number): void;
        setPan(pan: number): void;
    };
    source: AudioBufferSourceNode;
}
export class AudioSequence {
    private audioContext: AudioContext;
    private volume: number;
    private pan: number;
    private rate: number;
    private delayMs: number;
    private playBuffer: (buffer: AudioBuffer, startTime: number, volume: number, pan: number, rate: number) => PlayBufferResult;
    private isLoop: boolean = false;
    private items: AudioItem[] = [];
    private playing: boolean = false;
    private buffers?: AudioBuffer[];
    private timePointer!: number;
    constructor(audioContext: AudioContext, volume: number, pan: number, rate: number, delayMs: number, playBuffer: (buffer: AudioBuffer, startTime: number, volume: number, pan: number, rate: number) => PlayBufferResult) {
        this.audioContext = audioContext;
        this.volume = volume;
        this.pan = pan;
        this.rate = rate;
        this.delayMs = delayMs;
        this.playBuffer = playBuffer;
    }
    private handleSoundEnded = (): void => {
        if (this.playing) {
            this.removeCompleted();
            if (!this.items.length) {
                this.playing = false;
            }
        }
    };
    setBuffers(buffers: AudioBuffer[]): void {
        this.buffers = buffers;
        if (this.playing) {
            this.timePointer = Math.max(this.timePointer, this.audioContext.currentTime);
            this.fill(this.buffers);
        }
    }
    start(startTime: number): void {
        if (this.playing) {
            throw new Error("Already playing");
        }
        this.timePointer = startTime;
        this.playing = true;
        if (this.buffers) {
            this.fill(this.buffers);
        }
    }
    isPlaying(): boolean {
        return this.playing;
    }
    stop(): void {
        if (this.playing) {
            this.playing = false;
            this.items.forEach((item) => item.handle.stop());
            this.items.length = 0;
        }
    }
    setVolume(volume: number): void {
        this.volume = volume;
        this.items.forEach((item) => item.handle.setVolume(volume));
    }
    setPan(pan: number): void {
        this.pan = pan;
        this.items.forEach((item) => item.handle.setPan(pan));
    }
    private add(item: AudioItem): void {
        this.items.push(item);
    }
    private removeCompleted(): void {
        this.items = this.items.filter((item) => item.startTime + item.duration >= this.audioContext.currentTime);
    }
    private fill(buffers: AudioBuffer[]): void {
        let delay = this.delayMs ? this.delayMs / 1000 : 0;
        for (const buffer of buffers) {
            const duration = this.queueBuffer(buffer, this.timePointer, delay);
            this.timePointer += duration;
            delay = 0;
        }
    }
    private queueBuffer(buffer: AudioBuffer, startTime: number, delay: number): number {
        const actualStartTime = startTime + delay;
        const duration = buffer.duration / this.rate;
        const { handle, source } = this.playBuffer(buffer, actualStartTime, this.volume, this.pan, this.rate);
        source.addEventListener("ended", this.handleSoundEnded);
        this.add({ startTime: actualStartTime, duration, handle });
        return duration + delay;
    }
}
