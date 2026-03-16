export class InternalPlaybackHandle {
    private playing: boolean = true;
    private isLoop: boolean = false;
    public stopRequested: boolean = false;
    private sourceNode?: AudioBufferSourceNode;
    private gainNode?: GainNode;
    private panNode?: StereoPannerNode;
    private volumeRequested?: number;
    private panRequested?: number;
    setNodes(sourceNode: AudioBufferSourceNode, gainNode: GainNode, panNode: StereoPannerNode): void {
        this.sourceNode = sourceNode;
        this.gainNode = gainNode;
        this.panNode = panNode;
        if (this.stopRequested) {
            this.stop();
        }
        else {
            if (this.volumeRequested !== undefined) {
                gainNode.gain.value = this.volumeRequested;
            }
            if (this.panRequested !== undefined) {
                panNode.pan.value = this.panRequested;
            }
        }
    }
    isPlaying(): boolean {
        return this.playing;
    }
    stop(): void {
        try {
            if (this.sourceNode) {
                this.sourceNode.stop();
            }
            else {
                this.stopRequested = true;
            }
            this.playing = false;
        }
        catch (error) {
            console.error(error);
        }
    }
    setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
        else {
            this.volumeRequested = volume;
        }
    }
    setPan(pan: number): void {
        if (this.panNode) {
            this.panNode.pan.value = pan;
        }
        else {
            this.panRequested = pan;
        }
    }
}
