import { describe, expect, test } from 'bun:test';
import { GeneralOptions } from '@/gui/screen/options/GeneralOptions';

describe('GeneralOptions performance settings', () => {
    test('loads legacy serialized options without performance suffix', () => {
        const current = new GeneralOptions();
        const legacySerialized = current.serialize().split(',').slice(0, 8).join(',');

        const restored = new GeneralOptions().unserialize(legacySerialized);

        expect(restored.performance.raycastHelperReuse.value).toBe(true);
        expect(restored.performance.entityIntersectTraversal.value).toBe(true);
        expect(restored.performance.mapTileHitTest.value).toBe(true);
        expect(restored.performance.worldViewportCache.value).toBe(true);
        expect(restored.performance.worldSoundLoopCache.value).toBe(true);
        expect(restored.performance.telemetry.value).toBe(false);
    });

    test('round-trips performance settings in serialized options', () => {
        const options = new GeneralOptions();
        options.performance.raycastHelperReuse.value = false;
        options.performance.entityIntersectTraversal.value = false;
        options.performance.mapTileHitTest.value = false;
        options.performance.worldViewportCache.value = false;
        options.performance.worldSoundLoopCache.value = false;
        options.performance.telemetry.value = true;

        const restored = new GeneralOptions().unserialize(options.serialize());

        expect(restored.performance.raycastHelperReuse.value).toBe(false);
        expect(restored.performance.entityIntersectTraversal.value).toBe(false);
        expect(restored.performance.mapTileHitTest.value).toBe(false);
        expect(restored.performance.worldViewportCache.value).toBe(false);
        expect(restored.performance.worldSoundLoopCache.value).toBe(false);
        expect(restored.performance.telemetry.value).toBe(true);
    });
});
