import { BoxedVar } from '@/util/BoxedVar';

export const performanceOptionKeys = [
    'raycastHelperReuse',
    'entityIntersectTraversal',
    'mapTileHitTest',
    'worldViewportCache',
    'worldSoundLoopCache',
    'telemetry',
] as const;

export type PerformanceOptionKey = typeof performanceOptionKeys[number];

export type PerformanceOptionSnapshot = Record<PerformanceOptionKey, boolean>;

export interface PerformanceOptionVars {
    raycastHelperReuse: BoxedVar<boolean>;
    entityIntersectTraversal: BoxedVar<boolean>;
    mapTileHitTest: BoxedVar<boolean>;
    worldViewportCache: BoxedVar<boolean>;
    worldSoundLoopCache: BoxedVar<boolean>;
    telemetry: BoxedVar<boolean>;
}

export const defaultPerformanceOptionValues: PerformanceOptionSnapshot = {
    raycastHelperReuse: true,
    entityIntersectTraversal: true,
    mapTileHitTest: true,
    worldViewportCache: true,
    worldSoundLoopCache: true,
    telemetry: false,
};

export function snapshotPerformanceOptions(options: PerformanceOptionVars): PerformanceOptionSnapshot {
    return performanceOptionKeys.reduce((snapshot, key) => {
        snapshot[key] = options[key].value;
        return snapshot;
    }, {} as PerformanceOptionSnapshot);
}

export function createPerformanceOptionVars(initialValues: Partial<PerformanceOptionSnapshot> = {}): PerformanceOptionVars {
    const values = {
        ...defaultPerformanceOptionValues,
        ...initialValues,
    };
    return {
        raycastHelperReuse: new BoxedVar<boolean>(values.raycastHelperReuse),
        entityIntersectTraversal: new BoxedVar<boolean>(values.entityIntersectTraversal),
        mapTileHitTest: new BoxedVar<boolean>(values.mapTileHitTest),
        worldViewportCache: new BoxedVar<boolean>(values.worldViewportCache),
        worldSoundLoopCache: new BoxedVar<boolean>(values.worldSoundLoopCache),
        telemetry: new BoxedVar<boolean>(values.telemetry),
    };
}

export function serializePerformanceOptions(options: PerformanceOptionVars): string {
    return performanceOptionKeys
        .map((key) => Number(options[key].value))
        .join('');
}

export function unserializePerformanceOptions(options: PerformanceOptionVars, serializedValue: string | undefined): void {
    if (!serializedValue) {
        return;
    }
    performanceOptionKeys.forEach((key, index) => {
        const encodedValue = serializedValue[index];
        if (encodedValue === undefined) {
            return;
        }
        options[key].value = encodedValue === '1';
    });
}

export class PerformanceOptions implements PerformanceOptionVars {
    raycastHelperReuse: BoxedVar<boolean>;
    entityIntersectTraversal: BoxedVar<boolean>;
    mapTileHitTest: BoxedVar<boolean>;
    worldViewportCache: BoxedVar<boolean>;
    worldSoundLoopCache: BoxedVar<boolean>;
    telemetry: BoxedVar<boolean>;

    constructor(initialValues: Partial<PerformanceOptionSnapshot> = {}) {
        const options = createPerformanceOptionVars(initialValues);
        this.raycastHelperReuse = options.raycastHelperReuse;
        this.entityIntersectTraversal = options.entityIntersectTraversal;
        this.mapTileHitTest = options.mapTileHitTest;
        this.worldViewportCache = options.worldViewportCache;
        this.worldSoundLoopCache = options.worldSoundLoopCache;
        this.telemetry = options.telemetry;
    }

    serialize(): string {
        return serializePerformanceOptions(this);
    }

    unserialize(serializedValue: string | undefined): this {
        unserializePerformanceOptions(this, serializedValue);
        return this;
    }

    snapshot(): PerformanceOptionSnapshot {
        return snapshotPerformanceOptions(this);
    }
}
