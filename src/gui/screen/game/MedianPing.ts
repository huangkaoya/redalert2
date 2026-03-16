export class MedianPing {
    private reservoir: number[] = [];
    private totalSamples: number = 0;
    constructor(private reservoirSize: number = 100) { }
    pushSample(sample: number): void {
        this.totalSamples++;
        if (this.reservoir.length < this.reservoirSize) {
            this.reservoir.push(sample);
        }
        else {
            const randomIndex = Math.floor(Math.random() * this.totalSamples);
            if (randomIndex < this.reservoirSize) {
                this.reservoir[randomIndex] = sample;
            }
        }
    }
    calculate(): number | undefined {
        if (this.reservoir.length === 0) {
            return undefined;
        }
        const sorted = [...this.reservoir].sort((a, b) => a - b);
        const midIndex = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 1) {
            return sorted[midIndex];
        }
        else {
            return (sorted[midIndex - 1] + sorted[midIndex]) / 2;
        }
    }
}
