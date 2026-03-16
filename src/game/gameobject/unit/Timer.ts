export class Timer {
    private activeTicks: number = 0;
    private activeFor?: number;
    private activeSince?: number;
    constructor() {
        this.activeTicks = 0;
    }
    isActive(): boolean {
        return this.activeTicks > 0;
    }
    setActiveFor(ticks: number, timestamp: number): void {
        this.activeTicks = ticks;
        this.activeFor = ticks;
        this.activeSince = timestamp;
    }
    reset(): void {
        this.activeTicks = 0;
        this.activeSince = undefined;
        this.activeFor = undefined;
    }
    getTicksLeft(): number {
        return this.activeTicks;
    }
    getInitialTicks(): number {
        return this.activeFor ?? 0;
    }
    tick(timestamp: number): boolean {
        if (this.activeTicks <= 0) {
            return false;
        }
        this.activeTicks--;
        if (this.activeTicks <= 0 ||
            (this.activeSince !== undefined &&
                timestamp - this.activeSince > this.activeFor!)) {
            this.reset();
            return true;
        }
        return false;
    }
}
