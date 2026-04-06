import { beforeEach, describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { IsoCoords } from '@/engine/IsoCoords';
import { Coords } from '@/game/Coords';
import { RaycastHelper } from '@/engine/util/RaycastHelper';
import { EntityIntersectHelper } from '@/engine/util/EntityIntersectHelper';
import { MapTileIntersectHelper } from '@/engine/util/MapTileIntersectHelper';
import { WorldViewportHelper } from '@/engine/util/WorldViewportHelper';
import { WorldSound } from '@/engine/sound/WorldSound';
import { SoundControl, SoundType } from '@/engine/sound/SoundSpecs';
import { PerformanceOptions } from '@/performance/PerformanceOptions';
import { attachPerformanceOptions, resetPerformanceTelemetry } from '@/performance/PerformanceRuntime';
import { EventDispatcher } from '@/util/event';

beforeEach(() => {
    attachPerformanceOptions(new PerformanceOptions());
    resetPerformanceTelemetry();
    (globalThis as any).window = { THREE };
    IsoCoords.init({ x: 0, y: 0 });
});

describe('RaycastHelper', () => {
    test('returns the same intersection and reuses a single Raycaster when enabled', () => {
        const viewport = { x: 0, y: 0, width: 800, height: 600 };
        const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(50, 50, 10), new THREE.MeshBasicMaterial());
        mesh.updateMatrixWorld(true);
        const helper = new RaycastHelper({ viewport, camera });
        const point = { x: 400, y: 300 };

        attachPerformanceOptions(new PerformanceOptions({ raycastHelperReuse: false }));
        const legacyResult = helper.intersect(point, [mesh], false);

        attachPerformanceOptions(new PerformanceOptions({ raycastHelperReuse: true }));
        const optimizedFirst = helper.intersect(point, [mesh], false);
        const raycasterRef = (helper as any).raycaster;
        const optimizedSecond = helper.intersect(point, [mesh], false);

        expect(legacyResult[0]?.object).toBe(mesh);
        expect(optimizedFirst[0]?.object).toBe(mesh);
        expect(optimizedSecond[0]?.object).toBe(mesh);
        expect((helper as any).raycaster).toBe(raycasterRef);
    });
});

describe('EntityIntersectHelper', () => {
    test('preserves traversal results with nested children and array intersect targets', () => {
        const leafA = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        leafA.name = 'leaf-a';
        const leafB = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        leafB.name = 'leaf-b';
        const nested = new THREE.Group();
        nested.userData.id = 'nested';
        nested.add(leafA, leafB);
        const destroyed = new THREE.Group();
        destroyed.userData.id = 'destroyed';
        const root = new THREE.Group();
        root.add(nested, destroyed);
        const renderables = new Map([
            ['nested', {
                    gameObject: {
                        isDestroyed: false,
                        isCrashing: false,
                    },
                    getIntersectTarget: () => [leafA, leafB],
                }],
            ['destroyed', {
                    gameObject: {
                        isDestroyed: true,
                        isCrashing: false,
                    },
                    getIntersectTarget: () => destroyed,
                }],
        ]);
        const helper = new EntityIntersectHelper({
            getObjectsOnTile: () => [],
        } as any, {
            getRenderableContainer: () => ({ get3DObject: () => root }),
            getRenderableById: (id: string) => renderables.get(id),
            getRenderableByGameObject: () => undefined,
        } as any, {
            getTileAtScreenPoint: () => undefined,
        } as any, {
            intersect: () => [],
        } as any, {
            viewport: { x: 0, y: 0, width: 800, height: 600 },
        } as any, {
            intersectsScreenBox: () => true,
        } as any);

        const legacyTargets = (helper as any).collectIntersectTargetsLegacy(root).map((item: THREE.Object3D) => item.name);
        const optimizedTargets = (helper as any).collectIntersectTargetsOptimized(root).map((item: THREE.Object3D) => item.name);

        expect(optimizedTargets).toEqual(legacyTargets);
        expect(optimizedTargets).toEqual(['leaf-a', 'leaf-b']);
    });
});

describe('MapTileIntersectHelper', () => {
    test('matches legacy results for center, boundary, fallback-style, and out-of-range points', () => {
        const tiles = new Map<string, { rx: number; ry: number; z: number; }>();
        for (let x = -8; x <= 8; x += 1) {
            for (let y = -8; y <= 8; y += 1) {
                tiles.set(`${x},${y}`, { rx: x, ry: y, z: x === 0 && y === 0 ? 1 : 0 });
            }
        }
        const helper = new MapTileIntersectHelper({
            tiles: {
                getByMapCoords: (x: number, y: number) => tiles.get(`${x},${y}`),
            },
        } as any, {
            viewport: { x: 0, y: 0, width: 800, height: 600 },
            cameraPan: {
                getPan: () => ({ x: 0, y: 0 }),
            },
        } as any);
        const points = [
            { x: 400, y: 300 },
            { x: 415, y: 308 },
            { x: 400, y: 315 },
            { x: -5000, y: -5000 },
        ];

        points.forEach((point) => {
            const legacy = (helper as any).intersectTilesByScreenPosLegacy(point).map((tile: any) => `${tile.rx},${tile.ry},${tile.z}`);
            const optimized = (helper as any).intersectTilesByScreenPosOptimized(point).map((tile: any) => `${tile.rx},${tile.ry},${tile.z}`);
            expect(optimized).toEqual(legacy);
        });
    });
});

describe('WorldViewportHelper', () => {
    test('matches legacy distances for iso and camera projection branches', () => {
        const viewport = { x: 0, y: 0, width: 800, height: 600 };
        const pan = { x: 0, y: 0 };
        const isoHelper = new WorldViewportHelper({
            viewport,
            cameraPan: { getPan: () => pan },
        } as any);
        const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        const cameraHelper = new WorldViewportHelper({
            viewport,
            cameraPan: { getPan: () => pan },
            camera,
        } as any);
        const worldPosition = { x: 512, y: Coords.tileHeightToWorld(1), z: 256 };
        const screenBox = new THREE.Box2(new THREE.Vector2(100, 100), new THREE.Vector2(700, 500));

        const isoLegacyDistance = (isoHelper as any).distanceToViewportLegacy(worldPosition);
        const isoOptimizedDistance = (isoHelper as any).distanceToViewportOptimized(worldPosition);
        const isoLegacyCenter = (isoHelper as any).distanceToViewportCenterLegacy(worldPosition);
        const isoOptimizedCenter = (isoHelper as any).distanceToViewportCenterOptimized(worldPosition);
        const cameraLegacyDistance = (cameraHelper as any).distanceToScreenBoxLegacy(worldPosition, screenBox);
        const cameraOptimizedDistance = (cameraHelper as any).distanceToScreenBoxOptimized(worldPosition, screenBox);

        expect(isoOptimizedDistance).toBeCloseTo(isoLegacyDistance, 6);
        expect(isoOptimizedCenter.x).toBeCloseTo(isoLegacyCenter.x, 6);
        expect(isoOptimizedCenter.y).toBeCloseTo(isoLegacyCenter.y, 6);
        expect(cameraOptimizedDistance).toBeCloseTo(cameraLegacyDistance, 6);
    });
});

describe('WorldSound', () => {
    test('keeps loop limits and output levels identical between legacy and optimized updates', () => {
        const viewport = { x: 0, y: 0, width: 800, height: 600 };
        const pan = { x: 0, y: 0 };
        const tileHelper = new MapTileIntersectHelper({
            tiles: {
                getByMapCoords: (x: number, y: number) => ({ rx: x, ry: y, z: 0 }),
            },
        } as any, {
            viewport,
            cameraPan: { getPan: () => pan },
        } as any);
        const worldViewportHelper = new WorldViewportHelper({
            viewport,
            cameraPan: { getPan: () => pan },
        } as any);
        const frameDispatcher = new EventDispatcher<string, number>();
        const createFixture = () => {
            const worldSound = new WorldSound({
                getSoundSpec: () => undefined,
                playWithOptions: () => undefined,
            } as any, { id: 'local' } as any, {
                getShroudTypeByTileCoords: () => 0,
            } as any, worldViewportHelper as any, tileHelper as any, {
                onObjectRemoved: frameDispatcher.asEvent(),
            } as any, {
                viewport,
            } as any, {
                onFrame: frameDispatcher.asEvent(),
            } as any);
            const spec = {
                name: 'looping',
                volume: 100,
                minVolume: 20,
                type: [SoundType.Screen],
                control: new Set([SoundControl.Loop]),
                limit: 2,
                loop: 1,
                range: 8,
            };
            const handles = Array.from({ length: 4 }, () => {
                const state = { volume: 0, pan: 0 };
                return {
                    state,
                    isPlaying: () => true,
                    stop: () => undefined,
                    setVolume: (volume: number) => {
                        state.volume = volume;
                    },
                    setPan: (panValue: number) => {
                        state.pan = panValue;
                    },
                };
            });
            (worldSound as any).soundInstances = handles.map((handle, index) => ({
                spec,
                worldPos: { x: index * Coords.LEPTONS_PER_TILE, y: 0, z: 0 },
                player: { id: 'local' },
                handle,
                gain: 1,
                volume: 0,
                loop: true,
            }));
            return { worldSound, handles };
        };

        const legacyFixture = createFixture();
        const optimizedFixture = createFixture();

        (legacyFixture.worldSound as any).updateLegacy();
        (optimizedFixture.worldSound as any).updateOptimized();

        expect(optimizedFixture.handles.map((handle) => handle.state.volume)).toEqual(legacyFixture.handles.map((handle) => handle.state.volume));
        expect(optimizedFixture.handles.map((handle) => handle.state.pan)).toEqual(legacyFixture.handles.map((handle) => handle.state.pan));
    });
});
