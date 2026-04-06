import { PerformanceOptions, type PerformanceOptionKey, type PerformanceOptionSnapshot, type PerformanceOptionVars, snapshotPerformanceOptions } from '@/performance/PerformanceOptions';

type FrameMetricKind = 'ui' | 'game';

interface FrameMetricState {
    lastTimestamp?: number;
    averageMs?: number;
    fps: number | null;
    frameMs: number | null;
    lastSampleAt: number;
}

interface PerformanceMetricState {
    calls: number;
    totalMs: number;
}

export interface PerformanceMetricSnapshot {
    calls: number;
    totalMs: number;
    avgMs: number;
}

export interface PerformanceTelemetrySnapshot {
    enabled: boolean;
    options: PerformanceOptionSnapshot;
    uiFps: number | null;
    uiFrameMs: number | null;
    gameFps: number | null;
    gameFrameMs: number | null;
    metrics: Record<string, PerformanceMetricSnapshot>;
    updatedAt: number;
}

const createFrameMetricState = (): FrameMetricState => ({
    fps: null,
    frameMs: null,
    lastSampleAt: 0,
});

class PerformanceTelemetry {
    private readonly metrics = new Map<string, PerformanceMetricState>();
    private readonly uiFrame = createFrameMetricState();
    private readonly gameFrame = createFrameMetricState();

    constructor(private readonly isEnabled: () => boolean) {
    }

    reset(): void {
        this.metrics.clear();
        this.resetFrames();
    }

    resetMetrics(): void {
        this.metrics.clear();
    }

    private resetFrames(): void {
        this.uiFrame.lastTimestamp = undefined;
        this.uiFrame.averageMs = undefined;
        this.uiFrame.fps = null;
        this.uiFrame.frameMs = null;
        this.uiFrame.lastSampleAt = 0;
        this.gameFrame.lastTimestamp = undefined;
        this.gameFrame.averageMs = undefined;
        this.gameFrame.fps = null;
        this.gameFrame.frameMs = null;
        this.gameFrame.lastSampleAt = 0;
    }

    recordFrame(kind: FrameMetricKind, timestamp: number): void {
        if (!this.isEnabled()) {
            return;
        }
        const target = kind === 'ui' ? this.uiFrame : this.gameFrame;
        if (target.lastTimestamp !== undefined) {
            const delta = timestamp - target.lastTimestamp;
            if (delta > 0) {
                if (delta > 1200) {
                    target.averageMs = undefined;
                    target.fps = null;
                    target.frameMs = null;
                }
                else {
                    const smoothing = delta > 200 ? 0.2 : 0.1;
                    target.averageMs = target.averageMs === undefined
                        ? delta
                        : target.averageMs + (delta - target.averageMs) * smoothing;
                    target.frameMs = target.averageMs;
                    target.fps = target.averageMs > 0 ? 1000 / target.averageMs : null;
                }
            }
        }
        target.lastTimestamp = timestamp;
        target.lastSampleAt = this.now();
    }

    measure<T>(metricName: string, callback: () => T): T {
        if (!this.isEnabled()) {
            return callback();
        }
        const start = this.now();
        try {
            return callback();
        }
        finally {
            this.recordMetric(metricName, this.now() - start);
        }
    }

    async measureAsync<T>(metricName: string, callback: () => Promise<T>): Promise<T> {
        if (!this.isEnabled()) {
            return callback();
        }
        const start = this.now();
        try {
            return await callback();
        }
        finally {
            this.recordMetric(metricName, this.now() - start);
        }
    }

    snapshot(options: PerformanceOptionVars): PerformanceTelemetrySnapshot {
        const metrics = Array.from(this.metrics.entries()).reduce((acc, [key, metric]) => {
            acc[key] = {
                calls: metric.calls,
                totalMs: metric.totalMs,
                avgMs: metric.calls ? metric.totalMs / metric.calls : 0,
            };
            return acc;
        }, {} as Record<string, PerformanceMetricSnapshot>);

        return {
            enabled: this.isEnabled(),
            options: snapshotPerformanceOptions(options),
            uiFps: this.uiFrame.fps,
            uiFrameMs: this.uiFrame.frameMs,
            gameFps: this.gameFrame.fps,
            gameFrameMs: this.gameFrame.frameMs,
            metrics,
            updatedAt: Date.now(),
        };
    }

    private recordMetric(metricName: string, elapsedMs: number): void {
        const metric = this.metrics.get(metricName) ?? { calls: 0, totalMs: 0 };
        metric.calls += 1;
        metric.totalMs += elapsedMs;
        this.metrics.set(metricName, metric);
    }

    private now(): number {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        return Date.now();
    }
}

let performanceOptions: PerformanceOptionVars = new PerformanceOptions();

const telemetry = new PerformanceTelemetry(() => performanceOptions.telemetry.value);

export function attachPerformanceOptions(options: PerformanceOptionVars): void {
    performanceOptions = options;
}

export function getPerformanceOptions(): PerformanceOptionVars {
    return performanceOptions;
}

export function snapshotPerformanceConfig(): PerformanceOptionSnapshot {
    return snapshotPerformanceOptions(performanceOptions);
}

export function isPerformanceFeatureEnabled(feature: Exclude<PerformanceOptionKey, 'telemetry'>): boolean {
    return performanceOptions[feature].value;
}

export function measurePerformanceFeature<T>(feature: Exclude<PerformanceOptionKey, 'telemetry'>, callback: () => T): T {
    return telemetry.measure(feature, callback);
}

export function measurePerformanceMetric<T>(metricName: string, callback: () => T): T {
    return telemetry.measure(metricName, callback);
}

export async function measurePerformanceMetricAsync<T>(metricName: string, callback: () => Promise<T>): Promise<T> {
    return telemetry.measureAsync(metricName, callback);
}

export function recordUiPerformanceFrame(timestamp: number): void {
    telemetry.recordFrame('ui', timestamp);
}

export function recordGamePerformanceFrame(timestamp: number): void {
    telemetry.recordFrame('game', timestamp);
}

export function resetPerformanceTelemetry(): void {
    telemetry.reset();
}

export function resetPerformanceMetricSamples(): void {
    telemetry.resetMetrics();
}

export function snapshotPerformanceTelemetry(): PerformanceTelemetrySnapshot {
    return telemetry.snapshot(performanceOptions);
}

export function installPerformanceDebugApi(target: Record<string, any>): void {
    target.performance = {
        reset: () => resetPerformanceTelemetry(),
        snapshot: () => snapshotPerformanceTelemetry(),
        getOptions: () => snapshotPerformanceConfig(),
        setEnabled: (feature: PerformanceOptionKey, enabled: boolean) => {
            if (!(feature in performanceOptions)) {
                throw new Error(`Unknown performance option "${feature}"`);
            }
            performanceOptions[feature].value = enabled;
        },
    };
}
