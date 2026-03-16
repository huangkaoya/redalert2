import { Building } from "@/engine/renderable/entity/Building";
import { Vehicle } from "@/engine/renderable/entity/Vehicle";
import { Terrain } from "@/engine/renderable/entity/Terrain";
import { Overlay } from "@/engine/renderable/entity/Overlay";
import { Smudge } from "@/engine/renderable/entity/Smudge";
import { AnimationType } from "@/engine/renderable/entity/building/AnimationType";
import { Infantry } from "@/engine/renderable/entity/Infantry";
import { PipOverlay } from "@/engine/renderable/entity/PipOverlay";
import { Aircraft } from "@/engine/renderable/entity/Aircraft";
import { TransientAnim } from "@/engine/renderable/entity/TransientAnim";
import { Projectile } from "@/engine/renderable/entity/Projectile";
import { ObjectType } from "@/engine/type/ObjectType";
import { HarvesterPlugin } from "@/engine/renderable/entity/plugin/HarvesterPlugin";
import { Anim } from "@/engine/renderable/entity/Anim";
import { MoveSoundFxPlugin } from "@/engine/renderable/entity/plugin/MoveSoundFxPlugin";
import { VehicleDisguisePlugin } from "@/engine/renderable/entity/plugin/VehicleDisguisePlugin";
import { ChronoSparkleFxPlugin } from "@/engine/renderable/entity/plugin/ChronoSparkleFxPlugin";
import { TntFxPlugin } from "@/engine/renderable/entity/plugin/TntFxPlugin";
import { MindControlLinkPlugin } from "@/engine/renderable/entity/plugin/MindControlLinkPlugin";
import { InfantryDisguisePlugin } from "@/engine/renderable/entity/plugin/InfantryDisguisePlugin";
import { PsychicDetectPlugin } from "@/engine/renderable/entity/building/PsychicDetectPlugin";
import { TrailerSmokePlugin } from "@/engine/renderable/entity/plugin/TrailerSmokePlugin";
import { DamageSmokePlugin } from "@/engine/renderable/entity/plugin/DamageSmokePlugin";
import { LocomotorType } from "@/game/type/LocomotorType";
import { ShipWakeTrailPlugin } from "@/engine/renderable/entity/plugin/ShipWakeTrailPlugin";
import { ObjectCloakPlugin } from "@/engine/renderable/entity/plugin/ObjectCloakPlugin";
import { Debris } from "@/engine/renderable/entity/Debris";
import { ShpAggregator } from "@/engine/renderable/builder/ShpAggregator";
interface Position {
    x: number;
    y: number;
}
interface GameEntity {
    art: {
        paletteType: string;
        customPaletteName?: string;
    };
    rules: {
        moveSound?: string;
        damageParticleSystems: any[];
        locomotor: LocomotorType;
    };
    type: string;
    mindControllerTrait?: any;
    psychicDetectorTrait?: any;
    harvesterTrait?: any;
    disguiseTrait?: any;
    tntChargeTrait?: any;
    isAircraft(): boolean;
    isProjectile(): boolean;
    isDebris(): boolean;
    isTechno(): boolean;
    isUnit(): boolean;
    isBuilding(): boolean;
    isVehicle(): boolean;
    isInfantry(): boolean;
    isTerrain(): boolean;
    isOverlay(): boolean;
    isSmudge(): boolean;
}
interface LocalPlayer {
}
interface UnitSelection {
    getOrCreateSelectionModel(entity: GameEntity): any;
}
interface Alliances {
}
interface Rules {
    general: {
        paradrop: any;
    };
    audioVisual: {
        chronoSparkle1: any;
    };
    combatDamage: {
        ivanIconFlickerRate: number;
    };
}
interface Art {
    getObject(name: string, type: ObjectType): any;
}
interface MapRenderable {
    terrainLayer?: any;
    overlayLayer?: any;
    smudgeLayer?: any;
}
interface ImageFinder {
}
interface Palettes {
    get(name: string): any;
}
interface Voxels {
}
interface VoxelAnims {
}
interface Theater {
    getPalette(paletteType: string, customPaletteName?: string): any;
    animPalette: any;
    isoPalette: any;
}
interface Camera {
}
interface Lighting {
}
interface LightingDirector {
}
interface DebugWireframes {
}
interface DebugText {
}
interface GameSpeed {
}
interface WorldSound {
}
interface Strings {
}
interface FlyerHelperOpt {
}
interface HiddenObjectsOpt {
}
interface VxlBuilderFactory {
}
interface BuildingImageDataCache {
}
interface Plugin {
}
interface RenderableEntity {
    registerPlugin(plugin: Plugin): void;
}
export class RenderableFactory {
    private localPlayer: LocalPlayer;
    private unitSelection: UnitSelection;
    private alliances: Alliances;
    private rules: Rules;
    private art: Art;
    private mapRenderable: MapRenderable | null;
    private imageFinder: ImageFinder;
    private palettes: Palettes;
    private voxels: Voxels;
    private voxelAnims: VoxelAnims;
    private theater: Theater;
    private camera: Camera;
    private lighting: Lighting;
    private lightingDirector: LightingDirector;
    private debugWireframes: DebugWireframes;
    private debugText: DebugText;
    private gameSpeed: GameSpeed;
    private worldSound: WorldSound | null;
    private strings: Strings;
    private flyerHelperOpt: FlyerHelperOpt;
    private hiddenObjectsOpt: HiddenObjectsOpt;
    private vxlBuilderFactory: VxlBuilderFactory;
    private buildingImageDataCache: BuildingImageDataCache;
    private useSpriteBatching: boolean;
    private useMeshInstancing: boolean;
    private bridgeImageCache: Map<any, any>;
    constructor(localPlayer: LocalPlayer, unitSelection: UnitSelection, alliances: Alliances, rules: Rules, art: Art, mapRenderable: MapRenderable | null, imageFinder: ImageFinder, palettes: Palettes, voxels: Voxels, voxelAnims: VoxelAnims, theater: Theater, camera: Camera, lighting: Lighting, lightingDirector: LightingDirector, debugWireframes: DebugWireframes, debugText: DebugText, gameSpeed: GameSpeed, worldSound: WorldSound | null, strings: Strings, flyerHelperOpt: FlyerHelperOpt, hiddenObjectsOpt: HiddenObjectsOpt, vxlBuilderFactory: VxlBuilderFactory, buildingImageDataCache: BuildingImageDataCache, useSpriteBatching: boolean = false, useMeshInstancing: boolean = false) {
        this.localPlayer = localPlayer;
        this.unitSelection = unitSelection;
        this.alliances = alliances;
        this.rules = rules;
        this.art = art;
        this.mapRenderable = mapRenderable;
        this.imageFinder = imageFinder;
        this.palettes = palettes;
        this.voxels = voxels;
        this.voxelAnims = voxelAnims;
        this.theater = theater;
        this.camera = camera;
        this.lighting = lighting;
        this.lightingDirector = lightingDirector;
        this.debugWireframes = debugWireframes;
        this.debugText = debugText;
        this.gameSpeed = gameSpeed;
        this.worldSound = worldSound;
        this.strings = strings;
        this.flyerHelperOpt = flyerHelperOpt;
        this.hiddenObjectsOpt = hiddenObjectsOpt;
        this.vxlBuilderFactory = vxlBuilderFactory;
        this.buildingImageDataCache = buildingImageDataCache;
        this.useSpriteBatching = useSpriteBatching;
        this.useMeshInstancing = useMeshInstancing;
        this.bridgeImageCache = new Map();
    }
    createTransientAnim(name: string, callback?: any): TransientAnim {
        const artObject = this.art.getObject(name, ObjectType.Animation);
        return new TransientAnim(name, artObject, { x: 0, y: 0 }, this.imageFinder, this.theater, this.camera, this.debugWireframes, this.gameSpeed, this.useSpriteBatching, callback, this.worldSound);
    }
    createAnim(name: string): Anim {
        const artObject = this.art.getObject(name, ObjectType.Animation);
        return new Anim(name, artObject, { x: 0, y: 0 }, this.imageFinder, this.theater, this.camera, this.debugWireframes, this.gameSpeed, this.useSpriteBatching, undefined, this.worldSound);
    }
    create(entity: GameEntity): RenderableEntity {
        let palette = this.theater.getPalette(entity.art.paletteType, entity.art.customPaletteName);
        const plugins: Plugin[] = [];
        if (entity.isAircraft() ||
            entity.isProjectile() ||
            entity.isDebris()) {
            plugins.push(new TrailerSmokePlugin(entity, this.art, this.theater, this.imageFinder, this.gameSpeed));
        }
        if (entity.isTechno()) {
            palette = palette.clone();
            const selectionModel = this.unitSelection.getOrCreateSelectionModel(entity);
            const pipOverlay = new PipOverlay(this.rules.general.paradrop, this.rules.audioVisual, entity, this.localPlayer, this.alliances, selectionModel, this.imageFinder, this.palettes.get("palette.pal"), this.camera, this.strings, this.flyerHelperOpt, this.hiddenObjectsOpt, this.debugText, (name: string) => this.createAnim(name), this.useSpriteBatching, this.useMeshInstancing);
            if (entity.isUnit()) {
                const moveSound = entity.rules.moveSound;
                if (moveSound && this.worldSound) {
                    plugins.push(new MoveSoundFxPlugin(entity, moveSound, this.worldSound));
                }
            }
            plugins.push(new ChronoSparkleFxPlugin(entity, this.rules.audioVisual.chronoSparkle1));
            if (entity.mindControllerTrait) {
                plugins.push(new MindControlLinkPlugin(entity, selectionModel, this.alliances, this.localPlayer));
            }
            let renderable: RenderableEntity;
            if (entity.isBuilding()) {
                const animPalette = this.theater.animPalette;
                const isoPalette = this.theater.isoPalette;
                renderable = new Building(entity, selectionModel, this.rules, this.art, this.imageFinder, this.theater, this.voxels, this.voxelAnims, palette, animPalette, isoPalette, this.camera, this.lighting, this.debugWireframes, this.gameSpeed, this.vxlBuilderFactory, this.useSpriteBatching, new ShpAggregator(), this.buildingImageDataCache, pipOverlay, this.worldSound, AnimationType.BUILDUP);
                if (entity.psychicDetectorTrait) {
                    plugins.push(new PsychicDetectPlugin(entity, entity.psychicDetectorTrait, this.localPlayer, this.camera));
                }
            }
            else if (entity.isVehicle()) {
                renderable = new Vehicle(entity, this.rules, this.art, this.imageFinder, this.theater, this.voxels, this.voxelAnims, palette, this.camera, this.lighting, this.debugWireframes, this.gameSpeed, selectionModel, this.vxlBuilderFactory, this.useSpriteBatching, pipOverlay, this.worldSound);
                if (entity.rules.damageParticleSystems.length) {
                    plugins.push(new DamageSmokePlugin(entity, this.art, this.theater, this.imageFinder, this.gameSpeed));
                }
                if (entity.rules.locomotor === LocomotorType.Ship ||
                    entity.rules.locomotor === LocomotorType.Hover) {
                    plugins.push(new ShipWakeTrailPlugin(entity, this.rules, this.art, this.theater, this.imageFinder, this.gameSpeed));
                }
                if (entity.harvesterTrait && this.mapRenderable) {
                    plugins.push(new HarvesterPlugin(entity, entity.harvesterTrait));
                }
                if (entity.disguiseTrait) {
                    plugins.push(new VehicleDisguisePlugin(entity, entity.disguiseTrait, this.localPlayer, this.alliances, renderable, this.art, this.imageFinder, this.theater, this.camera, this.lighting, this.gameSpeed, this.useSpriteBatching));
                }
            }
            else if (entity.isInfantry()) {
                renderable = new Infantry(entity, this.rules, this.art, this.imageFinder, this.theater, palette, this.camera, this.lighting, this.debugWireframes, this.gameSpeed, selectionModel, this.useSpriteBatching, this.useMeshInstancing, pipOverlay, this.worldSound);
                if (entity.disguiseTrait) {
                    plugins.push(new InfantryDisguisePlugin(entity, entity.disguiseTrait, this.localPlayer, this.alliances, renderable, this.art, this.gameSpeed));
                }
            }
            else if (entity.isAircraft()) {
                renderable = new Aircraft(entity, this.rules, this.voxels, this.voxelAnims, palette, this.lighting, this.debugWireframes, this.gameSpeed, selectionModel, this.vxlBuilderFactory, this.useSpriteBatching, pipOverlay);
            }
            else {
                throw new Error("Unhandled game object type " + entity.type);
            }
            if (entity.tntChargeTrait) {
                plugins.push(new TntFxPlugin(entity, entity.tntChargeTrait, this.rules.combatDamage.ivanIconFlickerRate, renderable, this.imageFinder, this.art, this.alliances, this.localPlayer, this.worldSound, (name: string) => this.createAnim(name)));
            }
            plugins.push(new ObjectCloakPlugin(entity, this.localPlayer, this.alliances, renderable));
            plugins.forEach((plugin) => renderable.registerPlugin(plugin));
            return renderable;
        }
        if (entity.isTerrain()) {
            return new Terrain(entity, this.mapRenderable?.terrainLayer, this.imageFinder, palette, this.camera, this.lighting, this.debugWireframes, this.gameSpeed, this.useSpriteBatching);
        }
        if (entity.isOverlay()) {
            return new Overlay(entity, this.rules, this.art, this.imageFinder, palette, this.camera, this.lighting, this.debugWireframes, this.bridgeImageCache, this.mapRenderable?.overlayLayer, this.useSpriteBatching);
        }
        if (entity.isProjectile()) {
            const projectile = new Projectile(entity, this.rules, this.imageFinder, this.voxels, this.voxelAnims, this.theater, palette, this.palettes.get("palette.pal"), this.camera, this.gameSpeed, this.lighting, this.lightingDirector, this.vxlBuilderFactory, this.useSpriteBatching, this.useMeshInstancing);
            plugins.forEach((plugin) => projectile.registerPlugin(plugin));
            return projectile;
        }
        if (entity.isSmudge()) {
            return new Smudge(entity, this.imageFinder, palette, this.camera, this.lighting, this.debugWireframes, this.mapRenderable?.smudgeLayer);
        }
        if (entity.isDebris()) {
            const debris = new Debris(entity, this.rules, this.imageFinder, this.voxels, this.voxelAnims, palette, this.camera, this.lighting, this.gameSpeed, this.vxlBuilderFactory, this.useSpriteBatching);
            plugins.forEach((plugin) => debris.registerPlugin(plugin));
            return debris;
        }
        throw new Error("Not implemented");
    }
}
