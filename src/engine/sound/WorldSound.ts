import { SoundKey } from "./SoundKey";
import { ChannelType } from "./ChannelType";
import { SoundSpecs, SoundType, SoundControl } from "./SoundSpecs";
import { clamp, getRandomInt } from "../../util/math";
import { rectEquals } from "../../util/geometry";
import { ShroudType } from "../../game/map/MapShroud";
import { Coords } from "../../game/Coords";
import { isNotNullOrUndefined } from "../../util/typeGuard";
import { isPerformanceFeatureEnabled, measurePerformanceFeature } from "@/performance/PerformanceRuntime";
interface WorldPosition {
    x: number;
    y: number;
    z: number;
}
interface GameObject {
    position: {
        worldPosition: WorldPosition;
    };
}
interface SoundSpec {
    name: string;
    volume: number;
    minVolume: number;
    type: SoundType[];
    control: Set<SoundControl>;
    limit: number;
    loop?: number;
    range: number;
    vShift?: {
        min: number;
        max: number;
    };
}
interface PlaybackHandle {
    isPlaying(): boolean;
    stop(): void;
    setVolume(volume: number): void;
    setPan(pan: number): void;
}
interface Sound {
    getSoundSpec(key: SoundKey | string): SoundSpec | undefined;
    playWithOptions(spec: SoundSpec, channel: ChannelType, volume: number, pan: number, limit: number, loops: number): PlaybackHandle | undefined;
}
interface Player {
}
interface Shroud {
    getShroudTypeByTileCoords(x: number, y: number, z: number): ShroudType;
}
interface WorldViewportHelper {
    distanceToViewportCenter(pos: WorldPosition): {
        x: number;
        y: number;
    };
    distanceToViewport(pos: WorldPosition): number;
}
interface MapTileIntersectHelper {
    getTileAtScreenPoint(point: {
        x: number;
        y: number;
    }): {
        rx: number;
        ry: number;
    } | undefined;
}
interface World {
    onObjectRemoved: {
        subscribe(handler: (obj: GameObject) => void): void;
        unsubscribe(handler: (obj: GameObject) => void): void;
    };
}
interface WorldScene {
    viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
interface Renderer {
    onFrame: {
        subscribe(handler: (time: number) => void): void;
        unsubscribe(handler: (time: number) => void): void;
    };
}
interface SoundInstance {
    spec: SoundSpec;
    gameObject?: GameObject;
    worldPos: WorldPosition;
    player: Player;
    handle: PlaybackHandle;
    gain: number;
    volume: number;
    loop: boolean;
}
export class WorldSound {
    private static readonly noShroudKeys = [
        SoundKey.BuildingSlam,
        SoundKey.SellSound,
        SoundKey.BuildingGarrisonedSound,
        SoundKey.BuildingRepairedSound,
        SoundKey.SpySatActivationSound,
        SoundKey.SpySatDeactivationSound,
    ];
    private sound: Sound;
    private localPlayer: Player;
    private shroud: Shroud;
    private worldViewportHelper: WorldViewportHelper;
    private mapTileIntersectHelper: MapTileIntersectHelper;
    private world: World;
    private worldScene: WorldScene;
    private renderer: Renderer;
    private soundInstances: SoundInstance[] = [];
    private noShroudSpecs: SoundSpec[];
    private lastViewport?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    private lastUpdate?: number;
    private tileAtViewportCenter?: {
        rx: number;
        ry: number;
    };
    private specCounts = new Map<SoundSpec, number>();
    constructor(sound: Sound, localPlayer: Player, shroud: Shroud, worldViewportHelper: WorldViewportHelper, mapTileIntersectHelper: MapTileIntersectHelper, world: World, worldScene: WorldScene, renderer: Renderer) {
        this.sound = sound;
        this.localPlayer = localPlayer;
        this.shroud = shroud;
        this.worldViewportHelper = worldViewportHelper;
        this.mapTileIntersectHelper = mapTileIntersectHelper;
        this.world = world;
        this.worldScene = worldScene;
        this.renderer = renderer;
        this.noShroudSpecs = WorldSound.noShroudKeys
            .map((key) => {
            const spec = this.sound.getSoundSpec(key);
            if (spec)
                return spec;
            console.warn(`Sound key "${key}" doesn't have a corresponding sound.ini entry`);
        })
            .filter(isNotNullOrUndefined);
    }
    private handleObjectRemoved = (obj: GameObject): void => {
        this.soundInstances.forEach((instance) => {
            if (instance.gameObject === obj) {
                instance.handle.stop();
            }
        });
    };
    private handleFrame = (time: number): void => {
        let shouldUpdate = false;
        if (!this.lastViewport || !rectEquals(this.worldScene.viewport, this.lastViewport)) {
            this.lastViewport = this.worldScene.viewport;
            shouldUpdate = true;
        }
        if (!this.lastUpdate || time - this.lastUpdate >= 200) {
            shouldUpdate = true;
        }
        if (shouldUpdate) {
            this.update();
            this.lastUpdate = time;
        }
    };
    init(): void {
        this.renderer.onFrame.subscribe(this.handleFrame);
        this.world.onObjectRemoved.subscribe(this.handleObjectRemoved);
    }
    changeLocalPlayer(player: Player, shroud: Shroud): void {
        this.localPlayer = player;
        this.shroud = shroud;
    }
    dispose(): void {
        this.renderer.onFrame.unsubscribe(this.handleFrame);
        this.world.onObjectRemoved.unsubscribe(this.handleObjectRemoved);
        this.soundInstances.forEach((instance) => instance.handle.stop());
    }
    private update(): void {
        measurePerformanceFeature('worldSoundLoopCache', () => isPerformanceFeatureEnabled('worldSoundLoopCache')
            ? this.updateOptimized()
            : this.updateLegacy());
    }
    private updateLegacy(): void {
        const centerTile = this.mapTileIntersectHelper.getTileAtScreenPoint({
            x: this.worldScene.viewport.x + this.worldScene.viewport.width / 2,
            y: this.worldScene.viewport.y + this.worldScene.viewport.height / 2,
        });
        if (centerTile) {
            this.tileAtViewportCenter = centerTile;
            this.cleanOldInstances();
            const specCounts = new Map<SoundSpec, number>();
            for (const instance of this.soundInstances) {
                const worldPos = instance.gameObject?.position.worldPosition ?? instance.worldPos;
                let { volume, pan } = this.computeVolumeAndPan(instance.spec, worldPos, instance.player, instance.gain);
                if (volume > 0) {
                    const count = specCounts.get(instance.spec) ?? 0;
                    if (instance.loop && count >= instance.spec.limit) {
                        volume = 0;
                    }
                    else {
                        specCounts.set(instance.spec, count + 1);
                    }
                }
                instance.handle.setVolume(volume);
                instance.handle.setPan(pan);
                instance.volume = volume;
            }
        }
        else {
            console.warn("No tile found at viewport center. Can't update local sound positions.");
        }
    }
    private updateOptimized(): void {
        const centerTile = this.mapTileIntersectHelper.getTileAtScreenPoint({
            x: this.worldScene.viewport.x + this.worldScene.viewport.width / 2,
            y: this.worldScene.viewport.y + this.worldScene.viewport.height / 2,
        });
        if (!centerTile) {
            console.warn("No tile found at viewport center. Can't update local sound positions.");
            return;
        }
        this.tileAtViewportCenter = centerTile;
        this.cleanOldInstances();
        this.specCounts.clear();
        for (const instance of this.soundInstances) {
            const worldPos = instance.gameObject?.position.worldPosition ?? instance.worldPos;
            let { volume, pan } = this.computeVolumeAndPan(instance.spec, worldPos, instance.player, instance.gain);
            if (volume > 0) {
                const count = this.specCounts.get(instance.spec) ?? 0;
                if (instance.loop && count >= instance.spec.limit) {
                    volume = 0;
                }
                else {
                    this.specCounts.set(instance.spec, count + 1);
                }
            }
            instance.handle.setVolume(volume);
            instance.handle.setPan(pan);
            instance.volume = volume;
        }
    }
    private cleanOldInstances(): void {
        this.soundInstances = this.soundInstances.filter((instance) => instance.handle.isPlaying());
    }
    playEffect(key: SoundKey | string, target: GameObject | WorldPosition, player: Player, gain: number = 1, loopGain?: number): PlaybackHandle | undefined {
        const spec = this.sound.getSoundSpec(key);
        if (!spec)
            return;
        if (spec.type.includes(SoundType.Player) && player !== this.localPlayer) {
            return;
        }
        let worldPos: WorldPosition;
        let gameObject: GameObject | undefined;
        if ('position' in target) {
            worldPos = target.position.worldPosition;
            gameObject = target;
        }
        else {
            worldPos = target;
        }
        const isLoop = spec.control.has(SoundControl.Loop) || spec.control.has(SoundControl.Ambient);
        const loops = isLoop ? spec.loop || Number.POSITIVE_INFINITY : 0;
        if (isLoop && loopGain !== undefined) {
            gain = loopGain;
        }
        let { volume, pan } = this.computeVolumeAndPan(spec, worldPos, player, gain);
        let limit = spec.limit;
        if (isLoop && spec.limit) {
            limit = 0;
            this.cleanOldInstances();
            const activeInstances = this.soundInstances.filter((instance) => instance.spec === spec && instance.volume > 0);
            if (activeInstances.length >= spec.limit) {
                volume = 0;
            }
        }
        if (!isLoop && !volume && spec.limit) {
            return;
        }
        const channel = spec.control.has(SoundControl.Ambient) || spec.name.startsWith("_Amb_")
            ? ChannelType.Ambient
            : ChannelType.Effect;
        const handle = this.sound.playWithOptions(spec, channel, volume, pan, limit, loops);
        if (handle) {
            this.soundInstances.push({
                spec,
                gameObject,
                worldPos,
                player,
                handle,
                gain,
                volume,
                loop: isLoop,
            });
        }
        return handle;
    }
    private computeVolumeAndPan(spec: SoundSpec, worldPos: WorldPosition, player: Player, gain: number = 1): {
        volume: number;
        pan: number;
    } {
        let volume = spec.volume / 100;
        let pan = 0;
        if (spec.type.includes(SoundType.Global) && player !== this.localPlayer) {
            volume = spec.minVolume / 100;
        }
        volume *= gain;
        if (spec.type.includes(SoundType.Screen) || spec.type.includes(SoundType.Global)) {
            const distanceToCenter = this.worldViewportHelper.distanceToViewportCenter(worldPos);
            pan = clamp(distanceToCenter.x / (this.worldScene.viewport.width / 2), -1, 1);
        }
        if (spec.type.includes(SoundType.Screen)) {
            const distanceToViewport = this.worldViewportHelper.distanceToViewport(worldPos);
            const falloffDistance = (this.worldScene.viewport.height + this.worldScene.viewport.width) / 2 / 3;
            volume *= (window as any).THREE.MathUtils.lerp(1, 0, Math.min(1, distanceToViewport / falloffDistance));
        }
        else if (spec.type.includes(SoundType.Local)) {
            if (this.tileAtViewportCenter) {
                const tileDistance = new (window as any).THREE.Vector2(worldPos.x / Coords.LEPTONS_PER_TILE - this.tileAtViewportCenter.rx, worldPos.z / Coords.LEPTONS_PER_TILE - this.tileAtViewportCenter.ry).length();
                const maxRange = spec.range * Math.SQRT2;
                if (maxRange < tileDistance) {
                    volume = 0;
                }
                else {
                    if (spec.vShift) {
                        volume *= getRandomInt(spec.vShift.min, spec.vShift.max) / 100;
                    }
                    volume *= 1 - Math.min(1, (tileDistance / maxRange) ** 2);
                }
            }
            else {
                volume = 0;
            }
        }
        if (this.noShroudSpecs.includes(spec) &&
            !spec.type.includes(SoundType.Global) &&
            this.shroud?.getShroudTypeByTileCoords(Math.floor(worldPos.x / Coords.LEPTONS_PER_TILE), Math.floor(worldPos.z / Coords.LEPTONS_PER_TILE), Math.floor(Coords.worldToTileHeight(worldPos.y))) === ShroudType.Unexplored) {
            volume = 0;
        }
        return { volume, pan };
    }
}
