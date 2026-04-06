import * as THREE from 'three';
import { EventDispatcher } from '@/util/event';
import { IsoCoords } from '@/engine/IsoCoords';
import { Coords } from '@/game/Coords';
import { RaycastHelper } from '@/engine/util/RaycastHelper';
import { EntityIntersectHelper } from '@/engine/util/EntityIntersectHelper';
import { MapTileIntersectHelper } from '@/engine/util/MapTileIntersectHelper';
import { WorldViewportHelper } from '@/engine/util/WorldViewportHelper';
import { WorldSound } from '@/engine/sound/WorldSound';
import { SoundControl, SoundType } from '@/engine/sound/SoundSpecs';
import { TestToolSupport, type TestToolRuntimeContext } from '@/tools/TestToolSupport';
import { type PerformanceOptionKey, performanceOptionKeys } from '@/performance/PerformanceOptions';
import { attachPerformanceOptions, measurePerformanceMetric, resetPerformanceTelemetry, snapshotPerformanceConfig, snapshotPerformanceTelemetry } from '@/performance/PerformanceRuntime';

type Strings = {
    get(key: string): string;
};

type RuntimeVars = {
    perfRaycastHelperReuse?: { value: boolean; };
    perfEntityIntersectTraversal?: { value: boolean; };
    perfMapTileHitTest?: { value: boolean; };
    perfWorldViewportCache?: { value: boolean; };
    perfWorldSoundLoopCache?: { value: boolean; };
    perfTelemetry?: { value: boolean; };
};

type GeneralOptions = {
    performance: Record<PerformanceOptionKey, { value: boolean; }>;
};

type MetricSummary = {
    totalMsMedian: number;
    avgMsMedian: number;
};

type BenchmarkSample = {
    label: string;
    profile: 'all-off' | 'all-on' | 'warmup';
    telemetry: ReturnType<typeof snapshotPerformanceTelemetry>;
};

type BenchmarkPhaseResult = {
    metric: string;
    baseline: BenchmarkSample[];
    candidate: BenchmarkSample[];
    baselineMedian: MetricSummary;
    candidateMedian: MetricSummary;
    regressionPct: MetricSummary;
    passed: boolean;
};

const metricNamesByPhase = {
    entityIntersect: 'phase.entityIntersect',
    mapTileHit: 'phase.mapTileHit',
    worldViewport: 'phase.worldViewport',
    worldSound: 'phase.worldSound',
} as const;

const performanceFeatureRuntimeMap = {
    raycastHelperReuse: 'perfRaycastHelperReuse',
    entityIntersectTraversal: 'perfEntityIntersectTraversal',
    mapTileHitTest: 'perfMapTileHitTest',
    worldViewportCache: 'perfWorldViewportCache',
    worldSoundLoopCache: 'perfWorldSoundLoopCache',
    telemetry: 'perfTelemetry',
} as const;

export class PerformanceTester {
    private static host?: HTMLDivElement;
    private static summaryBlock?: HTMLPreElement;
    private static homeButton?: HTMLButtonElement;
    private static currentOptions?: GeneralOptions['performance'];

    static async main(parentElement: HTMLElement, strings: Strings, runtimeVars: RuntimeVars, generalOptions: GeneralOptions, context: TestToolRuntimeContext = {}): Promise<void> {
        this.currentOptions = generalOptions.performance;
        attachPerformanceOptions(generalOptions.performance as any);
        this.buildLayout(parentElement, strings);
        TestToolSupport.setState('performance', {
            status: 'running',
            completed: false,
            phase: 'warmup',
            performance: null,
        });
        const originalValues = this.captureOptionValues(generalOptions.performance);
        const originalTelemetry = generalOptions.performance.telemetry.value;
        generalOptions.performance.telemetry.value = true;
        if (runtimeVars.perfTelemetry) {
            runtimeVars.perfTelemetry.value = true;
        }
        try {
            const benchmarkResult = await this.runBenchmarks();
            const payload = {
                status: 'complete',
                completed: true,
                browser: navigator.userAgent,
                seed: 1337,
                viewport: { width: 800, height: 600 },
                featureFlags: snapshotPerformanceConfig(),
                performance: benchmarkResult,
            };
            this.summaryBlock!.textContent = JSON.stringify(payload.performance, null, 2);
            TestToolSupport.setState('performance', payload);
        }
        finally {
            this.applyOptionValues(originalValues);
            generalOptions.performance.telemetry.value = originalTelemetry;
            if (runtimeVars.perfTelemetry) {
                runtimeVars.perfTelemetry.value = originalTelemetry;
            }
            attachPerformanceOptions(generalOptions.performance as any);
        }
        if (context.rootElement) {
            context.rootElement.dataset.ra2PerfReady = '1';
        }
    }

    private static buildLayout(parentElement: HTMLElement, strings: Strings): void {
        parentElement.replaceChildren();
        const host = document.createElement('div');
        host.style.cssText = `
            width: min(960px, 100%);
            margin: 0 auto;
            padding: 24px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-height: 100%;
        `;
        const title = document.createElement('h2');
        title.textContent = strings.get?.('GUI:Options') ? 'Performance Benchmark' : 'Performance Benchmark';
        title.style.margin = '0';
        title.style.color = '#ffd84a';
        const summary = document.createElement('pre');
        summary.style.cssText = `
            margin: 0;
            padding: 16px;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 12px;
            line-height: 1.5;
            min-height: 240px;
            overflow: auto;
        `;
        summary.textContent = 'Running performance benchmark...';
        TestToolSupport.applyPanelTheme(host);
        host.append(title, summary);
        parentElement.appendChild(host);
        this.host = host;
        this.summaryBlock = summary;
        this.buildHomeButton();
    }

    private static buildHomeButton(): void {
        if (this.homeButton) {
            this.homeButton.remove();
        }
        const button = document.createElement('button');
        button.innerHTML = '点此返回主页';
        button.style.cssText = `
            position: fixed;
            left: 50%;
            top: 10px;
            transform: translateX(-50%);
            padding: 10px 20px;
            z-index: 1000;
        `;
        TestToolSupport.applyHomeButtonTheme(button);
        button.onclick = () => {
            window.location.hash = '/';
        };
        document.body.appendChild(button);
        this.homeButton = button;
    }

    private static captureOptionValues(options: GeneralOptions['performance']): Record<PerformanceOptionKey, boolean> {
        return performanceOptionKeys.reduce((acc, key) => {
            acc[key] = options[key].value;
            return acc;
        }, {} as Record<PerformanceOptionKey, boolean>);
    }

    private static applyOptionValues(values: Record<PerformanceOptionKey, boolean>): void {
        if (!this.currentOptions) {
            return;
        }
        performanceOptionKeys.forEach((key) => {
            this.currentOptions![key].value = values[key];
        });
    }

    private static setFeatureProfile(enabled: boolean): void {
        if (!this.currentOptions) {
            return;
        }
        this.currentOptions.raycastHelperReuse.value = enabled;
        this.currentOptions.entityIntersectTraversal.value = enabled;
        this.currentOptions.mapTileHitTest.value = enabled;
        this.currentOptions.worldViewportCache.value = enabled;
        this.currentOptions.worldSoundLoopCache.value = enabled;
        Object.entries(performanceFeatureRuntimeMap).forEach(([feature, runtimeVarKey]) => {
            if (feature === 'telemetry') {
                return;
            }
            const runtimeVar = (window as any).__ra2debug?.runtimeVars?.[runtimeVarKey];
            if (runtimeVar) {
                runtimeVar.value = enabled;
            }
        });
    }

    private static async runBenchmarks(): Promise<Record<string, any>> {
        const viewport = { x: 0, y: 0, width: 800, height: 600 };
        const pan = { x: 0, y: 0 };
        const seed = 1337;
        const entityFixture = this.createEntityFixture(viewport, seed);
        const mapFixture = this.createMapFixture(viewport, pan);
        const worldViewportFixture = this.createWorldViewportFixture(viewport, pan);
        const worldSoundFixture = this.createWorldSoundFixture(viewport, pan, mapFixture.helper, worldViewportFixture.isoHelper);
        await this.runProfile('warmup', true, {
            entityIntersect: entityFixture.run,
            mapTileHit: mapFixture.run,
            worldViewport: worldViewportFixture.run,
            worldSound: worldSoundFixture.run,
        });
        const phaseResults = {
            entityIntersect: await this.runPhase('entityIntersect', entityFixture.run),
            mapTileHit: await this.runPhase('mapTileHit', mapFixture.run),
            worldViewport: await this.runPhase('worldViewport', worldViewportFixture.run),
            worldSound: await this.runPhase('worldSound', worldSoundFixture.run),
        };
        return {
            phases: phaseResults,
            thresholdPct: 10,
            passed: Object.values(phaseResults).every((phase) => phase.passed),
            generatedAt: new Date().toISOString(),
        };
    }

    private static async runPhase(phase: keyof typeof metricNamesByPhase, runner: () => void): Promise<BenchmarkPhaseResult> {
        const baseline = await this.runProfile('all-off', false, { [phase]: runner } as Record<string, () => void>);
        const candidate = await this.runProfile('all-on', true, { [phase]: runner } as Record<string, () => void>);
        const metric = metricNamesByPhase[phase];
        const baselineMedian = this.computeMetricMedian(baseline, metric);
        const candidateMedian = this.computeMetricMedian(candidate, metric);
        const regressionPct = {
            totalMsMedian: this.computeRegressionPct(baselineMedian.totalMsMedian, candidateMedian.totalMsMedian),
            avgMsMedian: this.computeRegressionPct(baselineMedian.avgMsMedian, candidateMedian.avgMsMedian),
        };
        return {
            metric,
            baseline,
            candidate,
            baselineMedian,
            candidateMedian,
            regressionPct,
            passed: regressionPct.totalMsMedian <= 10 && regressionPct.avgMsMedian <= 10,
        };
    }

    private static async runProfile(profile: 'warmup' | 'all-off' | 'all-on', enabled: boolean, ...phaseGroups: Array<Record<string, () => void>>): Promise<BenchmarkSample[]> {
        this.setFeatureProfile(enabled);
        const phaseMap = Object.assign({}, ...phaseGroups) as Record<string, () => void>;
        const phaseNames = Object.keys(phaseMap);
        const sampleCount = profile === 'warmup' ? phaseNames.length : 3;
        const samples: BenchmarkSample[] = [];
        for (let index = 0; index < sampleCount; index += 1) {
            const phaseName = phaseNames[index % phaseNames.length]!;
            this.updateStatus(profile, phaseName, index + 1, sampleCount);
            resetPerformanceTelemetry();
            measurePerformanceMetric(metricNamesByPhase[phaseName as keyof typeof metricNamesByPhase], () => {
                phaseMap[phaseName]!();
            });
            samples.push({
                label: `${profile}-${index + 1}`,
                profile,
                telemetry: snapshotPerformanceTelemetry(),
            });
            await this.nextFrame();
        }
        return samples;
    }

    private static updateStatus(profile: string, phase: string, runIndex: number, sampleCount: number): void {
        const state = {
            status: 'running',
            completed: false,
            phase,
            profile,
            runIndex,
            sampleCount,
        };
        TestToolSupport.setState('performance', state);
        if (this.summaryBlock) {
            this.summaryBlock.textContent = JSON.stringify(state, null, 2);
        }
    }

    private static createEntityFixture(viewport: { x: number; y: number; width: number; height: number; }, seed: number) {
        const sceneRoot = new THREE.Group();
        const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        const random = this.createRandom(seed);
        const renderables = new Map<string, any>();
        const screenPoints: Array<{ x: number; y: number; }> = [];
        const screenBoxes: THREE.Box2[] = [];
        const gameObjectsOnTile: any[] = [];
        const baseGeometry = new THREE.BoxGeometry(14, 14, 10);
        const baseMaterial = new THREE.MeshBasicMaterial();
        for (let index = 0; index < 48; index += 1) {
            const id = `entity-${index}`;
            const holder = new THREE.Group();
            holder.userData.id = id;
            holder.position.set(Math.floor((random() - 0.5) * 640), Math.floor((random() - 0.5) * 420), 0);
            const mesh = new THREE.Mesh(baseGeometry, baseMaterial);
            mesh.position.set(0, 0, 0);
            holder.add(mesh);
            sceneRoot.add(holder);
            const gameObject = {
                id,
                position: { worldPosition: { x: holder.position.x, y: holder.position.y, z: 0 } },
                isUnit: () => index % 4 !== 0,
                isBuilding: () => index % 4 === 0,
                isDestroyed: false,
                isCrashing: false,
            };
            const renderable = {
                gameObject,
                getIntersectTarget: () => index % 3 === 0 ? [mesh] : mesh,
            };
            renderables.set(id, renderable);
            gameObjectsOnTile.push(gameObject);
            const projected = new THREE.Vector3(holder.position.x, holder.position.y, 0).project(camera);
            const screenPoint = {
                x: viewport.x + ((projected.x + 1) / 2) * viewport.width,
                y: viewport.y + ((1 - projected.y) / 2) * viewport.height,
            };
            screenPoints.push(screenPoint);
            screenBoxes.push(new THREE.Box2(new THREE.Vector2(screenPoint.x - 16, screenPoint.y - 16), new THREE.Vector2(screenPoint.x + 16, screenPoint.y + 16)));
        }
        sceneRoot.updateMatrixWorld(true);
        const raycastHelper = new RaycastHelper({ viewport, camera });
        const helper = new EntityIntersectHelper({
            getObjectsOnTile: () => gameObjectsOnTile,
        } as any, {
            getRenderableContainer: () => ({ get3DObject: () => sceneRoot }),
            getRenderableById: (id: string) => renderables.get(id),
            getRenderableByGameObject: (gameObject: any) => renderables.get(gameObject.id),
        } as any, {
            getTileAtScreenPoint: () => ({ rx: 0, ry: 0, z: 0 }),
        } as any, raycastHelper as any, {
            viewport,
        } as any, {
            intersectsScreenBox: () => true,
        } as any);
        return {
            run: () => {
                for (let index = 0; index < screenPoints.length; index += 1) {
                    helper.getEntityAtScreenPoint(screenPoints[index]!);
                    helper.getEntitiesAtScreenBox(screenBoxes[index]!);
                }
            },
        };
    }

    private static createMapFixture(viewport: { x: number; y: number; width: number; height: number; }, pan: { x: number; y: number; }) {
        IsoCoords.init({ x: 0, y: 0 });
        const tiles = new Map<string, { rx: number; ry: number; z: number; }>();
        for (let x = -32; x < 96; x += 1) {
            for (let y = -32; y < 96; y += 1) {
                tiles.set(`${x},${y}`, { rx: x, ry: y, z: (x + y) % 3 === 0 ? 1 : 0 });
            }
        }
        const helper = new MapTileIntersectHelper({
            tiles: {
                getByMapCoords: (x: number, y: number) => tiles.get(`${x},${y}`),
            },
        } as any, {
            viewport,
            cameraPan: {
                getPan: () => pan,
            },
        } as any);
        const points = this.createScreenPointSamples(viewport, 40);
        const pans = this.createPanSamples(24);
        return {
            helper,
            run: () => {
                for (let index = 0; index < points.length; index += 1) {
                    const nextPan = pans[index % pans.length]!;
                    pan.x = nextPan.x;
                    pan.y = nextPan.y;
                    helper.getTileAtScreenPoint(points[index]!);
                    helper.intersectTilesByScreenPos(points[index]!);
                }
            },
        };
    }

    private static createWorldViewportFixture(viewport: { x: number; y: number; width: number; height: number; }, pan: { x: number; y: number; }) {
        const isoHelper = new WorldViewportHelper({
            viewport,
            cameraPan: {
                getPan: () => pan,
            },
        } as any);
        const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        const cameraHelper = new WorldViewportHelper({
            viewport,
            cameraPan: {
                getPan: () => pan,
            },
            camera,
        } as any);
        const worldPositions = Array.from({ length: 72 }, (_, index) => ({
            x: (index - 36) * 48,
            y: (index % 6) * 10,
            z: ((index * 37) % 48 - 24) * 32,
        }));
        const pans = this.createPanSamples(36);
        const screenBox = new THREE.Box2(new THREE.Vector2(120, 120), new THREE.Vector2(680, 480));
        return {
            isoHelper,
            run: () => {
                for (let index = 0; index < worldPositions.length; index += 1) {
                    const nextPan = pans[index % pans.length]!;
                    pan.x = nextPan.x;
                    pan.y = nextPan.y;
                    const worldPosition = worldPositions[index]!;
                    isoHelper.distanceToViewport(worldPosition);
                    isoHelper.distanceToViewportCenter(worldPosition);
                    isoHelper.distanceToScreenBox(worldPosition, screenBox);
                    cameraHelper.distanceToViewport(worldPosition);
                    cameraHelper.distanceToViewportCenter(worldPosition);
                    cameraHelper.distanceToScreenBox(worldPosition, screenBox);
                }
            },
        };
    }

    private static createWorldSoundFixture(viewport: { x: number; y: number; width: number; height: number; }, pan: { x: number; y: number; }, mapTileHelper: MapTileIntersectHelper, worldViewportHelper: WorldViewportHelper) {
        const localPlayer = { id: 'local' };
        const enemyPlayer = { id: 'enemy' };
        const frameDispatcher = new EventDispatcher<string, number>();
        const fixtureSpecs = new Map<string | number, {
            name: string;
            volume: number;
            minVolume: number;
            type: SoundType[];
            control: Set<SoundControl>;
            limit: number;
            loop: number;
            range: number;
        }>();
        const worldSound = new WorldSound({
            getSoundSpec: (key: string | number) => {
                if (!fixtureSpecs.has(key)) {
                    fixtureSpecs.set(key, {
                        name: `fixture-${String(key)}`,
                        volume: 100,
                        minVolume: 20,
                        type: [SoundType.Global],
                        control: new Set(),
                        limit: 4,
                        loop: 0,
                        range: 8,
                    });
                }
                return fixtureSpecs.get(key);
            },
            playWithOptions: () => undefined,
        } as any, localPlayer as any, {
            getShroudTypeByTileCoords: () => 0,
        } as any, worldViewportHelper as any, mapTileHelper as any, {
            onObjectRemoved: frameDispatcher.asEvent(),
        } as any, {
            viewport,
        } as any, {
            onFrame: frameDispatcher.asEvent(),
        } as any);
        const handles = Array.from({ length: 96 }, () => ({
            isPlaying: () => true,
            stop: () => undefined,
            setVolume: (_volume: number) => undefined,
            setPan: (_pan: number) => undefined,
        }));
        (worldSound as any).soundInstances = handles.map((handle, index) => ({
            spec: {
                name: `test-${index % 6}`,
                volume: 100,
                minVolume: 20,
                type: index % 3 === 0 ? [SoundType.Screen] : index % 3 === 1 ? [SoundType.Local] : [SoundType.Global],
                control: new Set(index % 2 === 0 ? [SoundControl.Loop] : []),
                limit: 4,
                loop: index % 2 === 0 ? 1 : 0,
                range: 8,
            },
            gameObject: {
                position: {
                    worldPosition: {
                        x: (index - 48) * (Coords.LEPTONS_PER_TILE / 2),
                        y: 0,
                        z: ((index % 12) - 6) * (Coords.LEPTONS_PER_TILE / 2),
                    },
                },
            },
            worldPos: {
                x: (index - 48) * (Coords.LEPTONS_PER_TILE / 2),
                y: 0,
                z: ((index % 12) - 6) * (Coords.LEPTONS_PER_TILE / 2),
            },
            player: index % 5 === 0 ? enemyPlayer : localPlayer,
            handle,
            gain: 1,
            volume: 0,
            loop: index % 2 === 0,
        }));
        const pans = this.createPanSamples(32);
        return {
            run: () => {
                for (let index = 0; index < 72; index += 1) {
                    const nextPan = pans[index % pans.length]!;
                    pan.x = nextPan.x;
                    pan.y = nextPan.y;
                    (worldSound as any).update();
                }
            },
        };
    }

    private static createScreenPointSamples(viewport: { x: number; y: number; width: number; height: number; }, count: number) {
        return Array.from({ length: count }, (_, index) => ({
            x: viewport.x + 24 + (index * 37) % (viewport.width - 48),
            y: viewport.y + 24 + (index * 29) % (viewport.height - 48),
        }));
    }

    private static createPanSamples(count: number) {
        return Array.from({ length: count }, (_, index) => ({
            x: Math.sin(index / 2) * 80,
            y: Math.cos(index / 3) * 48,
        }));
    }

    private static createRandom(seed: number): () => number {
        let state = seed >>> 0;
        return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 0x100000000;
        };
    }

    private static computeMetricMedian(samples: BenchmarkSample[], metricName: string): MetricSummary {
        const totals = samples.map((sample) => sample.telemetry.metrics[metricName]?.totalMs ?? 0);
        const avgs = samples.map((sample) => sample.telemetry.metrics[metricName]?.avgMs ?? 0);
        return {
            totalMsMedian: this.median(totals),
            avgMsMedian: this.median(avgs),
        };
    }

    private static computeRegressionPct(baseline: number, candidate: number): number {
        if (baseline <= 0) {
            return 0;
        }
        return ((candidate - baseline) / baseline) * 100;
    }

    private static median(values: number[]): number {
        const sorted = [...values].sort((left, right) => left - right);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1]! + sorted[middle]!) / 2;
        }
        return sorted[middle] ?? 0;
    }

    private static nextFrame(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    static destroy(): void {
        TestToolSupport.clearState('performance');
        this.host?.remove();
        this.summaryBlock = undefined;
        this.host = undefined;
        this.homeButton?.remove();
        this.homeButton = undefined;
        this.currentOptions = undefined;
    }
}
