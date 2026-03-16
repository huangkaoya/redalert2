import { getRandomInt } from "../../util/math";
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
interface DelayRange {
    min: number;
    max: number;
}
export class AudioLoop {
    private audioContext: AudioContext;
    private volume: number;
    private pan: number;
    private rate: number;
    private delayMs?: DelayRange;
    private attack: boolean;
    private decay: boolean;
    private playBuffer: (buffer: AudioBuffer, startTime: number, volume: number, pan: number, rate: number) => PlayBufferResult;
    private isLoop: boolean = true;
    private items: AudioItem[] = [];
    private playing: boolean = false;
    private remainingLoops: number;
    private buffers?: AudioBuffer[];
    private timePointer!: number;
    private bufferPointer?: number;
    constructor(audioContext: AudioContext, volume: number, pan: number, rate: number, delayMs: DelayRange | undefined, attack: boolean, decay: boolean, loops: number, playBuffer: (buffer: AudioBuffer, startTime: number, volume: number, pan: number, rate: number) => PlayBufferResult) {
        this.audioContext = audioContext;
        this.volume = volume;
        this.pan = pan;
        this.rate = rate;
        this.delayMs = delayMs;
        this.attack = attack;
        this.decay = decay;
        this.playBuffer = playBuffer;
        this.remainingLoops = loops;
    }
    private handleSoundEnded = (): void => {
        if (this.playing) {
            this.removeCompleted();
            this.fill(this.buffers!);
            if (!this.remainingLoops && !this.items.length) {
                this.stop();
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
            if (this.decay && this.buffers) {
                this.removeCompleted();
                if (this.items.length) {
                    const nextStartTime = this.items[0].startTime + this.items[0].duration;
                    this.items.splice(1).forEach((item) => item.handle.stop());
                    this.queueBuffer(this.buffers[this.buffers.length - 1], nextStartTime);
                }
            }
            else {
                this.items.forEach((item) => item.handle.stop());
                this.items.length = 0;
            }
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
        let timeAhead = this.items.length
            ? this.timePointer - this.items[0].startTime
            : 0;
        while (timeAhead < 0.1 || this.items.length < 3) {
            if (!this.attack || this.bufferPointer !== undefined) {
                if (this.remainingLoops <= 0)
                    break;
                this.remainingLoops--;
            }
            if (this.attack) {
                this.bufferPointer =
                    this.bufferPointer === undefined
                        ? 0
                        : getRandomInt(1, buffers.length - 1 - (this.decay ? 1 : 0));
            }
            else {
                this.bufferPointer = getRandomInt(0, buffers.length - 1);
            }
            const buffer = buffers[this.bufferPointer];
            const duration = this.queueBuffer(buffer, this.timePointer);
            this.timePointer += duration;
            timeAhead += duration;
        }
    }
    private queueBuffer(buffer: AudioBuffer, startTime: number): number {
        const delay = this.delayMs
            ? getRandomInt(this.delayMs.min, this.delayMs.max) / 1000
            : 0;
        const actualStartTime = startTime + delay;
        const duration = buffer.duration / this.rate;
        const { handle, source } = this.playBuffer(buffer, actualStartTime, this.volume, this.pan, this.rate);
        source.addEventListener("ended", this.handleSoundEnded);
        this.add({ startTime: actualStartTime, duration, handle });
        return duration + delay;
    }
}
