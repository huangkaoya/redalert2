import { TextureAtlas } from '../../gfx/TextureAtlas';
import { IndexedBitmap } from '../../../data/Bitmap';
import { SpriteUtils } from '../../gfx/SpriteUtils';
import { Coords } from '../../../game/Coords';
import { TextureUtils } from '../../gfx/TextureUtils';
import { SelectionLevel } from '../../../game/gameobject/selection/SelectionLevel';
import { PipColor } from '../../../game/type/PipColor';
import { CompositeDisposable } from '../../../util/disposable/CompositeDisposable';
import { OverlayUtils } from '../../gfx/OverlayUtils';
import { RallyPointFx } from '../fx/RallyPointFx';
import { FlyerHelperMode } from './unit/FlyerHelperMode';
import { ZoneType } from '../../../game/gameobject/unit/ZoneType';
import { BufferGeometryUtils } from '../../gfx/BufferGeometryUtils';
import { PaletteBasicMaterial } from '../../gfx/material/PaletteBasicMaterial';
import { BatchedMesh, BatchMode } from '../../gfx/batch/BatchedMesh';
import { HealthLevel } from '../../../game/gameobject/unit/HealthLevel';
import { DebugLabel } from './unit/DebugLabel';
import * as THREE from 'three';
const HEALTH_BAR_OFFSET = -1;
const CONTROL_GROUP_SIZE = { width: 8, height: 11 };
const BORDER_WIDTH = 1;
const SELECTION_LEVEL_MAP: Record<number, SelectionLevel> = {
    [0]: SelectionLevel.Hover,
    2: SelectionLevel.Selected,
    1: SelectionLevel.Hover,
    3: SelectionLevel.Hover,
    4: SelectionLevel.Selected,
    5: SelectionLevel.Selected,
};
const HEALTH_LEVEL_TO_IMAGE = new Map<HealthLevel, number>()
    .set(HealthLevel.Green, 15)
    .set(HealthLevel.Yellow, 16)
    .set(HealthLevel.Red, 17);
interface SpriteGeometryConfig {
    texture: THREE.Texture;
    textureArea: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    align: {
        x: number;
        y: number;
    };
    offset?: {
        x: number;
        y: number;
    };
    camera: THREE.Camera;
    scale: number;
}
interface ImageHandle {
    bitmap: IndexedBitmap;
    shpFile: any;
}
interface UnitHealthBarResult {
    healthBarWrapper: THREE.Object3D;
    selectionBox: THREE.Mesh;
}
interface GameObject {
    isBuilding(): boolean;
    isUnit(): boolean;
    isVehicle(): boolean;
    isAircraft(): boolean;
    isInfantry(): boolean;
    isDestroyed: boolean;
    isCrashing: boolean;
    isSpawned: boolean;
    name: string;
    ammo?: number;
    veteranLevel?: number;
    debugLabel?: string;
    tileElevation: number;
    zone: ZoneType;
    owner: any;
    position: {
        worldPosition: THREE.Vector3;
    };
    tile: {
        occluded: boolean;
    };
    art: {
        height: number;
        isVoxel: boolean;
        canBeHidden: boolean;
        foundation: {
            width: number;
            height: number;
        };
    };
    rules: {
        consideredAircraft: boolean;
        missileSpawn: boolean;
        factory?: string;
        storage?: number;
        passengers?: number;
        spawnsNumber?: number;
        maxNumberOccupants?: number;
        size: number;
        pip: PipColor;
    };
    healthTrait: {
        health: number;
        level: HealthLevel;
    };
    garrisonTrait?: {
        units: {
            length: number;
        };
    };
    rallyTrait?: {
        getRallyPoint(): {
            rx: number;
            ry: number;
            z: number;
        } | null;
    };
    autoRepairTrait?: {
        isDisabled(): boolean;
    };
    harvesterTrait?: {
        gems: number;
        ore: number;
    };
    transportTrait?: {
        units: GameObject[];
    };
    airSpawnTrait?: {
        availableSpawns: number;
    };
}
interface SelectionModel {
    getSelectionLevel(): SelectionLevel;
    getControlGroupNumber(): number | undefined;
}
interface AnimFactory {
    (name: string): any;
}
export class PipOverlay {
    private static atlasCache?: TextureAtlas;
    private static atlasImageHandles = new Map<any, ImageHandle>();
    private static geometries = new Map<any, THREE.BufferGeometry>();
    private static buildingHealthGeoCache = new Map<string, THREE.BufferGeometry>();
    private static unitHealthGeoCache = new Map<string, THREE.BufferGeometry>();
    private static unitHealthTextures = new Map<boolean, THREE.Texture>();
    private static unitHealthMaterials = new Map<boolean, THREE.Material>();
    private static controlGroupTextures = new Map<number, THREE.Texture>();
    private static controlGroupMaterials = new Map<THREE.Texture, THREE.Material>();
    private static primaryFactoryTextures = new Map<number, THREE.Texture>();
    private static primaryFactoryMaterials = new Map<THREE.Texture, THREE.Material>();
    private static material?: THREE.Material;
    private static pipBrdFile: any;
    private static pipsFile: any;
    private static pips2File: any;
    private paradropRules: any;
    private audioVisualRules: any;
    private gameObject: GameObject;
    private viewer: {
        value?: any;
    };
    private alliances: any;
    private selectionModel: SelectionModel;
    private imageFinder: any;
    private palette: any;
    private camera: THREE.Camera;
    private strings: Map<string, string>;
    private flyerHelperOpt: {
        value: FlyerHelperMode;
    };
    private hiddenObjectsOpt: {
        value: boolean;
    };
    private debugTextEnabled: {
        value: boolean;
    };
    private animFactory: AnimFactory;
    private useSpriteBatching: boolean;
    private useMeshInstancing: boolean;
    private lastPrimaryFactory = false;
    private lastHealth?: number;
    private lastOwner?: any;
    private lastOwnerColorHex?: number;
    private lastPipsDataKey?: any;
    private lastControlGroup?: number;
    private lastRallyPoint?: any;
    private lastRepairState?: boolean;
    private lastVeteranLevel?: number;
    private lastSelectionLevel?: SelectionLevel;
    private lastDebugLabel?: string;
    private lastDebugTextEnabled?: boolean;
    private invalidatedElements: (boolean | undefined)[] = [];
    private rootObj?: THREE.Object3D;
    private healthBar?: THREE.Object3D;
    private selectionBox?: THREE.Mesh;
    private pipsSprite?: THREE.Mesh;
    private controlGroupSprite?: THREE.Mesh;
    private primaryFactorySprite?: THREE.Mesh;
    private veteranIndicator?: THREE.Mesh;
    private rallyLine?: RallyPointFx;
    private repairWrench?: any;
    private flyHelper?: any;
    private behindAnim?: any;
    private debugLabel?: DebugLabel;
    private lastDebugLabelOwnerColorHex?: number;
    private disposables = new CompositeDisposable();
    static clearCaches(): void {
        PipOverlay.atlasCache?.dispose();
        PipOverlay.atlasCache = undefined;
        PipOverlay.atlasImageHandles.clear();
        [...PipOverlay.unitHealthTextures.values()].forEach(texture => texture.dispose());
        PipOverlay.unitHealthTextures.clear();
        PipOverlay.unitHealthMaterials.forEach(material => material.dispose());
        PipOverlay.unitHealthMaterials.clear();
        [...PipOverlay.controlGroupTextures.values()].forEach(texture => texture.dispose());
        PipOverlay.controlGroupTextures.clear();
        PipOverlay.controlGroupMaterials.forEach(material => material.dispose());
        PipOverlay.controlGroupMaterials.clear();
        [...PipOverlay.primaryFactoryTextures.values()].forEach(texture => texture.dispose());
        PipOverlay.primaryFactoryTextures.clear();
        PipOverlay.primaryFactoryMaterials.forEach(material => material.dispose());
        PipOverlay.primaryFactoryMaterials.clear();
    }
    constructor(paradropRules: any, audioVisualRules: any, gameObject: GameObject, viewer: {
        value?: any;
    }, alliances: any, selectionModel: SelectionModel, imageFinder: any, palette: any, camera: THREE.Camera, strings: Map<string, string>, flyerHelperOpt: {
        value: FlyerHelperMode;
    }, hiddenObjectsOpt: {
        value: boolean;
    }, debugTextEnabled: {
        value: boolean;
    }, animFactory: AnimFactory, useSpriteBatching: boolean, useMeshInstancing: boolean) {
        this.paradropRules = paradropRules;
        this.audioVisualRules = audioVisualRules;
        this.gameObject = gameObject;
        this.viewer = viewer;
        this.alliances = alliances;
        this.selectionModel = selectionModel;
        this.imageFinder = imageFinder;
        this.palette = palette;
        this.camera = camera;
        this.strings = strings;
        this.flyerHelperOpt = flyerHelperOpt;
        this.hiddenObjectsOpt = hiddenObjectsOpt;
        this.debugTextEnabled = debugTextEnabled;
        this.animFactory = animFactory;
        this.useSpriteBatching = useSpriteBatching;
        this.useMeshInstancing = useMeshInstancing;
    }
    create3DObject(): void {
        let rootObj = this.rootObj;
        if (!rootObj) {
            rootObj = new THREE.Object3D();
            rootObj.name = "pip_overlay";
            rootObj.matrixAutoUpdate = false;
            if (!PipOverlay.atlasCache) {
                const atlas = this.initTexture();
                PipOverlay.atlasCache = atlas;
                [...PipOverlay.atlasImageHandles.keys()].forEach(imageHandle => {
                    const geometry = SpriteUtils.createSpriteGeometry(this.buildSpriteGeometry(imageHandle));
                    PipOverlay.geometries.set(imageHandle, geometry);
                });
                PipOverlay.material = new PaletteBasicMaterial({
                    map: PipOverlay.atlasCache.getTexture(),
                    palette: TextureUtils.textureFromPalette(this.palette),
                    alphaTest: 0.5,
                    transparent: true,
                    depthTest: false,
                });
            }
            if (this.gameObject.isBuilding()) {
                this.healthBar = this.createBuildingHealthBar(this.gameObject);
                rootObj.add(this.healthBar);
                if (this.gameObject.art.height >= 1) {
                    this.selectionBox = this.createBuildingSelectionBox(this.gameObject) as any;
                    rootObj.add(this.selectionBox);
                }
                const occupationInfo = this.createBuildingOccupationInfo(this.gameObject);
                if (occupationInfo) {
                    rootObj.add(occupationInfo);
                    this.pipsSprite = occupationInfo;
                }
                this.lastPipsDataKey = this.gameObject.garrisonTrait?.units.length;
            }
            else {
                const { healthBarWrapper, selectionBox } = this.createUnitHealthBar(this.gameObject);
                this.healthBar = healthBarWrapper;
                this.selectionBox = selectionBox;
                rootObj.add(this.healthBar);
                if (this.gameObject.art.isVoxel &&
                    (this.gameObject.rules.consideredAircraft || this.gameObject.isAircraft()) &&
                    !this.gameObject.rules.missileSpawn) {
                    const flyHelper = this.animFactory(this.audioVisualRules.flyerHelper);
                    this.flyHelper = flyHelper;
                    flyHelper.create3DObject();
                    rootObj.add(flyHelper.get3DObject());
                }
                if (this.gameObject.isUnit()) {
                    const behindAnim = this.animFactory(this.audioVisualRules.behind);
                    behindAnim.setRenderOrder(999995);
                    this.behindAnim = behindAnim;
                }
            }
            if (this.gameObject.debugLabel && this.debugTextEnabled.value) {
                const debugLabel = new DebugLabel(this.gameObject.debugLabel, this.gameObject.owner.color.asHex(), this.camera);
                this.debugLabel = debugLabel;
                debugLabel.create3DObject();
                debugLabel.get3DObject().renderOrder = 999999;
                rootObj.add(debugLabel.get3DObject());
            }
            this.lastHealth = this.gameObject.healthTrait.health;
            this.lastOwner = this.gameObject.owner;
            this.lastOwnerColorHex = this.gameObject.owner.color.asHex();
            this.rootObj = rootObj;
        }
    }
    onCreate(effectManager: any): void {
        if (this.gameObject.isBuilding() && this.gameObject.rallyTrait) {
            this.rallyLine = new RallyPointFx(this.camera as any, new THREE.Vector3(), new THREE.Vector3(), new THREE.Color(), 999999);
            this.rallyLine.visible = false;
            effectManager.addEffect(this.rallyLine);
            this.disposables.add(() => this.rallyLine!.remove(), this.rallyLine);
        }
    }
    private initTexture(): TextureAtlas {
        PipOverlay.pipBrdFile = this.imageFinder.find("pipbrd", false);
        PipOverlay.pipsFile = this.imageFinder.find("pips", false);
        PipOverlay.pips2File = this.imageFinder.find("pips2", false);
        const files = [PipOverlay.pipBrdFile, PipOverlay.pipsFile, PipOverlay.pips2File];
        const bitmaps: IndexedBitmap[] = [];
        files.forEach(file => {
            for (let i = 0; i < file.numImages; i++) {
                const image = file.getImage(i);
                const bitmap = new IndexedBitmap(image.width, image.height, image.imageData);
                bitmaps.push(bitmap);
                PipOverlay.atlasImageHandles.set(image, { bitmap, shpFile: file });
            }
        });
        const atlas = new TextureAtlas();
        atlas.pack(bitmaps);
        return atlas;
    }
    private buildSpriteGeometry(imageHandle: any): SpriteGeometryConfig {
        if (!PipOverlay.atlasCache) {
            throw new Error("Must build texture atlas before geometry");
        }
        const atlas = PipOverlay.atlasCache;
        const { bitmap, shpFile } = PipOverlay.atlasImageHandles.get(imageHandle)!;
        return {
            texture: atlas.getTexture(),
            textureArea: atlas.getImageRect(bitmap),
            align: { x: 1, y: -1 },
            offset: {
                x: imageHandle.x - Math.floor(shpFile.width / 2),
                y: imageHandle.y - Math.floor(shpFile.height / 2),
            },
            camera: this.camera,
            scale: Coords.ISO_WORLD_SCALE,
        };
    }
    private createBuildingHealthBar(gameObject: GameObject): THREE.Mesh {
        const foundationHeight = gameObject.art.foundation.height;
        const health = gameObject.healthTrait.health;
        const spacing = 4 * Coords.ISO_WORLD_SCALE;
        const maxPips = Math.floor((foundationHeight * Coords.getWorldTileSize()) / spacing);
        const healthPips = Math.max(1, Math.floor((health / 100) * maxPips));
        let pipImageIndex: number;
        if (health > 100 * this.audioVisualRules.conditionYellow) {
            pipImageIndex = 1;
        }
        else if (health > 100 * this.audioVisualRules.conditionRed) {
            pipImageIndex = 2;
        }
        else {
            pipImageIndex = 4;
        }
        const cacheKey = `${pipImageIndex}_${foundationHeight}_${healthPips}`;
        let geometry = PipOverlay.buildingHealthGeoCache.get(cacheKey);
        if (!geometry) {
            const geometries: THREE.BufferGeometry[] = [];
            const emptyPipImage = PipOverlay.pipsFile.getImage(0);
            const healthPipImage = PipOverlay.pipsFile.getImage(pipImageIndex);
            for (let i = 0; i < maxPips; i++) {
                const image = i < healthPips ? healthPipImage : emptyPipImage;
                const pipGeometry = PipOverlay.geometries.get(image)!.clone();
                const yOffset = spacing * i + spacing / 2;
                pipGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(spacing, 0, yOffset));
                geometries.push(pipGeometry);
            }
            geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
            PipOverlay.buildingHealthGeoCache.set(cacheKey, geometry);
        }
        const mesh = this.useMeshInstancing
            ? new BatchedMesh(geometry, PipOverlay.material!, BatchMode.Instancing)
            : new THREE.Mesh(geometry, PipOverlay.material!);
        mesh.matrixAutoUpdate = false;
        mesh.renderOrder = 999999;
        const height = gameObject.art.height || 0.5;
        mesh.position.y = Coords.tileHeightToWorld(height);
        mesh.updateMatrix();
        return mesh;
    }
    private createUnitHealthBar(gameObject: GameObject): UnitHealthBarResult {
        const isVehicle = !gameObject.isInfantry();
        const health = gameObject.healthTrait.health;
        const healthLevel = gameObject.healthTrait.level;
        let healthTexture = PipOverlay.unitHealthTextures.get(isVehicle);
        if (!healthTexture) {
            healthTexture = this.createUnitHealthTexture(isVehicle);
            PipOverlay.unitHealthTextures.set(isVehicle, healthTexture);
        }
        const borderImage = PipOverlay.pipBrdFile.getImage(isVehicle ? 0 : 1);
        const healthImageIndex = HEALTH_LEVEL_TO_IMAGE.get(healthLevel);
        if (healthImageIndex === undefined) {
            throw new Error(`Unhandled health level "${healthLevel}"`);
        }
        const healthPipImage = PipOverlay.pipsFile.getImage(healthImageIndex);
        const maxPips = Math.floor((borderImage.width - 2 * BORDER_WIDTH) / healthPipImage.width);
        const currentPips = Math.max(1, Math.floor((health / 100) * maxPips));
        const healthGeoCacheKey = `${isVehicle ? 1 : 0}_${currentPips}`;
        let healthGeometry = PipOverlay.unitHealthGeoCache.get(healthGeoCacheKey);
        if (!healthGeometry) {
            healthGeometry = SpriteUtils.createSpriteGeometry({
                texture: healthTexture,
                textureArea: {
                    x: 0,
                    y: (currentPips - 1) * borderImage.height,
                    width: borderImage.width,
                    height: borderImage.height,
                },
                camera: this.camera,
                align: { x: 0, y: 0 },
                scale: Coords.ISO_WORLD_SCALE,
            });
            PipOverlay.unitHealthGeoCache.set(healthGeoCacheKey, healthGeometry);
        }
        let healthMaterial = PipOverlay.unitHealthMaterials.get(isVehicle);
        if (!healthMaterial) {
            healthMaterial = new PaletteBasicMaterial({
                map: healthTexture,
                palette: TextureUtils.textureFromPalette(this.palette),
                alphaTest: 0.5,
                transparent: true,
                depthTest: false,
            });
            PipOverlay.unitHealthMaterials.set(isVehicle, healthMaterial);
        }
        const healthMesh = this.useSpriteBatching
            ? new BatchedMesh(healthGeometry, healthMaterial, BatchMode.Merging)
            : new THREE.Mesh(healthGeometry, healthMaterial);
        healthMesh.matrixAutoUpdate = false;
        healthMesh.renderOrder = 999998;
        const healthOffset = Coords.screenDistanceToWorld(Math.floor(borderImage.width / 2) + HEALTH_BAR_OFFSET, 0);
        healthMesh.applyMatrix4(new THREE.Matrix4().makeTranslation(healthOffset.x, 0, healthOffset.y));
        healthMesh.updateMatrix();
        const borderGeometry = PipOverlay.geometries.get(borderImage)!;
        const borderMesh = this.useSpriteBatching
            ? new BatchedMesh(borderGeometry, PipOverlay.material!, BatchMode.Merging)
            : new THREE.Mesh(borderGeometry, PipOverlay.material!);
        borderMesh.matrixAutoUpdate = false;
        const borderOffset = Coords.screenDistanceToWorld(Math.floor(PipOverlay.pipBrdFile.getImage(0).width / 2) + HEALTH_BAR_OFFSET, 0);
        borderMesh.applyMatrix4(new THREE.Matrix4().makeTranslation(borderOffset.x, 0, borderOffset.y));
        borderMesh.updateMatrix();
        borderMesh.renderOrder = 999997;
        const wrapper = new THREE.Object3D();
        wrapper.matrixAutoUpdate = false;
        wrapper.add(borderMesh);
        wrapper.add(healthMesh);
        const wrapperOffset = Coords.screenDistanceToWorld(-Math.floor(borderImage.width / 2), 0);
        wrapper.applyMatrix4(new THREE.Matrix4().makeTranslation(wrapperOffset.x, Coords.tileHeightToWorld(2), wrapperOffset.y));
        wrapper.updateMatrix();
        return { healthBarWrapper: wrapper, selectionBox: borderMesh };
    }
    private createUnitHealthTexture(isVehicle: boolean): THREE.Texture {
        const borderImage = PipOverlay.pipBrdFile.getImage(isVehicle ? 0 : 1);
        const pipWidth = PipOverlay.pipsFile.getImage(HEALTH_LEVEL_TO_IMAGE.values().next().value).width;
        const maxPips = Math.floor((borderImage.width - 2 * BORDER_WIDTH) / pipWidth);
        const bitmap = new IndexedBitmap(borderImage.width, borderImage.height * maxPips);
        for (let pips = 1; pips <= maxPips; ++pips) {
            const healthPercent = (pips / maxPips) * 100;
            let healthLevel: HealthLevel;
            if (healthPercent > 100 * this.audioVisualRules.conditionYellow) {
                healthLevel = HealthLevel.Green;
            }
            else if (healthPercent > 100 * this.audioVisualRules.conditionRed) {
                healthLevel = HealthLevel.Yellow;
            }
            else {
                healthLevel = HealthLevel.Red;
            }
            const imageIndex = HEALTH_LEVEL_TO_IMAGE.get(healthLevel);
            if (imageIndex === undefined) {
                throw new Error(`Unhandled health level "${healthLevel}"`);
            }
            const pipImage = PipOverlay.pipsFile.getImage(imageIndex);
            const pipBitmap = new IndexedBitmap(pipImage.width, pipImage.height, pipImage.imageData);
            const yOffset = (pips - 1) * borderImage.height;
            for (let i = 0; i < pips; i++) {
                const xOffset = pipImage.width * i;
                bitmap.drawIndexedImage(pipBitmap, xOffset + BORDER_WIDTH, yOffset + BORDER_WIDTH);
            }
        }
        const rgbaData = new Uint8Array(bitmap.width * bitmap.height * 4);
        for (let i = 0; i < bitmap.data.length; i++) {
            const base = i * 4;
            rgbaData[base] = 0;
            rgbaData[base + 1] = 0;
            rgbaData[base + 2] = 0;
            rgbaData[base + 3] = bitmap.data[i];
        }
        const texture = new THREE.DataTexture(rgbaData, bitmap.width, bitmap.height, THREE.RGBAFormat);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.flipY = true;
        texture.needsUpdate = true;
        (texture as any).colorSpace = (THREE as any).LinearSRGBColorSpace ?? (texture as any).colorSpace;
        return texture;
    }
    private createBuildingSelectionBox(gameObject: GameObject): THREE.Object3D {
        const container = new THREE.Object3D();
        container.matrixAutoUpdate = false;
        const foundation = gameObject.art.foundation;
        const tileSize = Coords.getWorldTileSize();
        const corners: [
            number,
            number
        ][] = [
            [0, 0], [0, 1], [1, 1], [1, 0]
        ];
        corners.forEach(([x, z], index) => {
            const cornerMesh = this.createBuildingSelectionCornerMesh();
            cornerMesh.matrixAutoUpdate = false;
            cornerMesh.position.set(x * tileSize * foundation.width, Coords.tileHeightToWorld(gameObject.art.height), z * tileSize * foundation.height);
            cornerMesh.rotation.y = (index * Math.PI) / 2;
            cornerMesh.scale.set(((index % 2 === 0 ? foundation.width : foundation.height) / 4) * Coords.getWorldTileSize(), Coords.tileHeightToWorld(gameObject.art.height / 4), ((index % 2 === 0 ? foundation.height : foundation.width) / 4) * Coords.getWorldTileSize());
            cornerMesh.updateMatrix();
            container.add(cornerMesh);
        });
        return container;
    }
    private createBuildingSelectionCornerMesh(): THREE.LineSegments {
        const positions = [
            0, 0, 0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1,
        ];
        const colors = new Array(positions.length).fill(1);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
        });
        this.disposables.add(geometry, material);
        return new THREE.LineSegments(geometry, material);
    }
    private createBuildingOccupationInfo(gameObject: GameObject): THREE.Mesh | undefined {
        if (gameObject.garrisonTrait?.units.length &&
            !this.objectIsOpaqueToViewer()) {
            const occupiedSlots = gameObject.garrisonTrait.units.length;
            const maxSlots = gameObject.rules.maxNumberOccupants!;
            const geometries: THREE.BufferGeometry[] = [];
            const spacing = 4 * Coords.ISO_WORLD_SCALE;
            const emptySlotImage = PipOverlay.pipsFile.getImage(6);
            const occupiedSlotImage = PipOverlay.pipsFile.getImage(7);
            for (let i = 1; i <= maxSlots; i++) {
                const image = i <= occupiedSlots ? occupiedSlotImage : emptySlotImage;
                const geometry = PipOverlay.geometries.get(image)!.clone();
                const xOffset = spacing * i + spacing / 2;
                geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(xOffset, 0, gameObject.art.foundation.height * Coords.getWorldTileSize()));
                geometries.push(geometry);
            }
            const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
            const mesh = this.useSpriteBatching
                ? new BatchedMesh(mergedGeometry, PipOverlay.material!, BatchMode.Merging)
                : new THREE.Mesh(mergedGeometry, PipOverlay.material!);
            mesh.matrixAutoUpdate = false;
            mesh.renderOrder = 999999;
            return mesh;
        }
    }
    private createPipsSprite(pipColors: PipColor[], totalSlots: number, isAircraft = false): THREE.Mesh | undefined {
        if (!this.objectIsOpaqueToViewer()) {
            const geometries: THREE.BufferGeometry[] = [];
            const pipWidth = PipOverlay.pips2File.getImage(isAircraft ? 12 : 0).width;
            const emptyPipImage = PipOverlay.pips2File.getImage(isAircraft ? 13 : 0);
            for (let i = 0; i < totalSlots; i++) {
                let pipImage: any;
                if (i < pipColors.length) {
                    const color = pipColors[i];
                    let imageIndex = isAircraft ? 12 : 3;
                    if (color === PipColor.Blue) {
                        imageIndex = 5;
                    }
                    else if (color === PipColor.Red) {
                        imageIndex = 4;
                    }
                    else if (color === PipColor.Yellow) {
                        imageIndex = 2;
                    }
                    pipImage = PipOverlay.pips2File.getImage(imageIndex);
                }
                else {
                    pipImage = emptyPipImage;
                }
                const geometry = PipOverlay.geometries.get(pipImage)!.clone();
                const xOffset = pipWidth * i + pipWidth / 2;
                const screenOffset = Coords.screenDistanceToWorld(-Math.floor(PipOverlay.pipBrdFile.getImage(this.gameObject.isInfantry() ? 1 : 0).width / 2) + xOffset, Math.floor(emptyPipImage.height / 2) + 3);
                geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(screenOffset.x, 0, screenOffset.y));
                geometries.push(geometry);
            }
            const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
            const mesh = this.useSpriteBatching
                ? new BatchedMesh(mergedGeometry, PipOverlay.material!, BatchMode.Merging)
                : new THREE.Mesh(mergedGeometry, PipOverlay.material!);
            mesh.renderOrder = 999996;
            return mesh;
        }
    }
    private createControlGroupTexture(color: any): THREE.Texture {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false })!;
        const borderWidth = BORDER_WIDTH;
        const size = CONTROL_GROUP_SIZE;
        canvas.width = 10 * (size.width + 2 * borderWidth);
        canvas.height = size.height + 2 * borderWidth;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = color.asHexString();
        ctx.fillStyle = color.asHexString();
        ctx.font = 'bold 12px Arial, sans-serif';
        for (let i = 0; i < 10; i++) {
            const x = (size.width + 2 * borderWidth) * i;
            ctx.strokeRect(0.5 + x, 0.5, size.width + 2 * borderWidth - 1, canvas.height - 1);
            ctx.fillText(String(i), x + borderWidth + 0.5, size.height);
        }
        const texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
    }
    private createControlGroupSprite(groupNumber: number): THREE.Mesh {
        const color = this.gameObject.owner.color;
        if (!PipOverlay.controlGroupTextures.has(color.asHex())) {
            const texture = this.createControlGroupTexture(color);
            PipOverlay.controlGroupTextures.set(color.asHex(), texture);
        }
        const texture = PipOverlay.controlGroupTextures.get(color.asHex())!;
        const geometry = SpriteUtils.createSpriteGeometry({
            texture,
            textureArea: {
                x: groupNumber * (CONTROL_GROUP_SIZE.width + 2 * BORDER_WIDTH),
                y: 0,
                width: CONTROL_GROUP_SIZE.width + 2 * BORDER_WIDTH,
                height: CONTROL_GROUP_SIZE.height + 2 * BORDER_WIDTH,
            },
            camera: this.camera,
            align: { x: 1, y: -1 },
            scale: Coords.ISO_WORLD_SCALE,
        });
        let material = PipOverlay.controlGroupMaterials.get(texture);
        if (!material) {
            material = new THREE.MeshBasicMaterial({
                map: texture,
                alphaTest: 0.5,
                transparent: true,
                depthTest: false,
            });
            PipOverlay.controlGroupMaterials.set(texture, material);
        }
        const mesh = this.useSpriteBatching
            ? new BatchedMesh(geometry, material, BatchMode.Merging)
            : new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.renderOrder = 999996;
        return mesh;
    }
    private createPrimaryFactoryTexture(color: any): THREE.Texture {
        const canvas = OverlayUtils.createTextBox(this.strings.get('TXT_PRIMARY')!, {
            color: color.asHexString(),
            borderColor: color.asHexString(),
            backgroundColor: '#000',
            fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
            fontSize: 12,
            fontWeight: '500',
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 2,
            paddingRight: 4,
        });
        const texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
    }
    private createPrimaryFactorySprite(): THREE.Mesh | undefined {
        if (!this.objectIsOpaqueToViewer()) {
            const color = this.gameObject.owner.color;
            if (!PipOverlay.primaryFactoryTextures.has(color.asHex())) {
                const texture = this.createPrimaryFactoryTexture(color);
                PipOverlay.primaryFactoryTextures.set(color.asHex(), texture);
            }
            const texture = PipOverlay.primaryFactoryTextures.get(color.asHex())!;
            const geometry = SpriteUtils.createSpriteGeometry({
                texture,
                camera: this.camera,
                align: { x: 1, y: -1 },
                offset: {
                    x: -Math.floor((texture.image as any).width / 2),
                    y: -Math.floor((texture.image as any).height / 2),
                },
                scale: Coords.ISO_WORLD_SCALE,
            });
            let material = PipOverlay.primaryFactoryMaterials.get(texture);
            if (!material) {
                material = new THREE.MeshBasicMaterial({
                    map: texture,
                    alphaTest: 0.5,
                    transparent: true,
                    depthTest: false,
                });
                PipOverlay.primaryFactoryMaterials.set(texture, material);
            }
            const mesh = this.useSpriteBatching
                ? new BatchedMesh(geometry, material, BatchMode.Merging)
                : new THREE.Mesh(geometry, material);
            mesh.renderOrder = 999999;
            return mesh;
        }
    }
    private createVeteranIndicator(gameObject: GameObject): THREE.Mesh | undefined {
        if (gameObject.veteranLevel) {
            const image = PipOverlay.pipsFile.getImage(13 + gameObject.veteranLevel - 1);
            const geometry = PipOverlay.geometries.get(image)!;
            const mesh = this.useSpriteBatching
                ? new BatchedMesh(geometry, PipOverlay.material!, BatchMode.Merging)
                : new THREE.Mesh(geometry, PipOverlay.material!);
            mesh.matrixAutoUpdate = false;
            mesh.renderOrder = 999996;
            mesh.receiveShadow = false;
            return mesh;
        }
    }
    private createRepairWrench(): any {
        const wrench = this.animFactory('WRENCH');
        wrench.setRenderOrder(999998);
        return wrench;
    }
    private objectIsOpaqueToViewer(): boolean {
        const viewer = this.viewer?.value;
        return !(!viewer || viewer.isObserver) &&
            !(this.gameObject.owner === viewer ||
                this.alliances.areAllied(this.gameObject.owner, viewer));
    }
    update(deltaTime: number): void {
        const gameObject = this.gameObject;
        if (gameObject.isDestroyed || gameObject.isCrashing) {
            this.rootObj!.visible = false;
            return;
        }
        const ownerColorHex = gameObject.owner.color.asHex();
        const ownerColorChanged = this.lastOwnerColorHex !== ownerColorHex;
        if (ownerColorChanged) {
            this.lastOwnerColorHex = ownerColorHex;
            this.invalidatedElements[3] = true;
            this.invalidatedElements[4] = true;
            this.invalidatedElements[5] = true;
        }
        if (gameObject.healthTrait.health !== this.lastHealth) {
            this.lastHealth = gameObject.healthTrait.health;
            this.invalidatedElements[0] = true;
        }
        const selectionLevel = this.selectionModel.getSelectionLevel();
        if (this.invalidatedElements[0] &&
            (selectionLevel >= SELECTION_LEVEL_MAP[0] || selectionLevel >= SELECTION_LEVEL_MAP[3])) {
            this.invalidatedElements[0] = undefined;
            this.updateHealthBarSprite(selectionLevel);
        }
        const pipsDataKey = this.computePipsDataKey(gameObject);
        if (this.lastPipsDataKey !== pipsDataKey || this.lastOwner !== gameObject.owner) {
            this.lastPipsDataKey = pipsDataKey;
            this.invalidatedElements[1] = true;
        }
        if (this.invalidatedElements[1] && selectionLevel >= SELECTION_LEVEL_MAP[1]) {
            this.invalidatedElements[1] = undefined;
            this.updatePipsSprite();
        }
        const controlGroup = this.selectionModel.getControlGroupNumber();
        if (this.lastControlGroup !== controlGroup) {
            this.lastControlGroup = controlGroup;
            this.invalidatedElements[3] = true;
        }
        if (this.invalidatedElements[3] && selectionLevel >= SELECTION_LEVEL_MAP[3]) {
            this.invalidatedElements[3] = undefined;
            this.updateControlGroupSprite(controlGroup);
        }
        const isPrimaryFactory = gameObject.isBuilding() &&
            !!gameObject.rules.factory &&
            gameObject.owner.production?.getPrimaryFactory(gameObject.rules.factory) === gameObject;
        if (this.lastPrimaryFactory !== isPrimaryFactory || this.lastOwner !== gameObject.owner) {
            this.lastPrimaryFactory = isPrimaryFactory;
            this.invalidatedElements[4] = true;
        }
        if (this.invalidatedElements[4] && selectionLevel >= SELECTION_LEVEL_MAP[4]) {
            this.invalidatedElements[4] = undefined;
            this.updatePrimaryFactorySprite(isPrimaryFactory);
        }
        const rallyPoint = (gameObject.isBuilding() && gameObject.rallyTrait?.getRallyPoint()) || undefined;
        if (this.lastRallyPoint !== rallyPoint || this.lastOwner !== gameObject.owner) {
            this.lastRallyPoint = rallyPoint;
            this.invalidatedElements[5] = true;
        }
        if (this.invalidatedElements[5] && selectionLevel >= SELECTION_LEVEL_MAP[5] && this.rallyLine) {
            this.invalidatedElements[5] = undefined;
            this.updateRallyPointLine(rallyPoint, this.rallyLine);
        }
        if (gameObject.isBuilding()) {
            const repairState = !gameObject.autoRepairTrait?.isDisabled();
            if (this.lastRepairState !== repairState) {
                this.lastRepairState = repairState;
                this.updateRepairWrenchSprite(repairState);
            }
        }
        else {
            if (this.lastVeteranLevel !== gameObject.veteranLevel) {
                this.lastVeteranLevel = gameObject.veteranLevel;
                this.updateVeteranIndicatorSprite(gameObject);
            }
        }
        this.updateFlyerHelper(selectionLevel, deltaTime);
        this.updateBehindAnim(deltaTime);
        this.updateDebugLabel();
        if (this.lastSelectionLevel === undefined || this.lastSelectionLevel !== selectionLevel) {
            this.lastSelectionLevel = selectionLevel;
            const elementMap = new Map<number, any>([
                [0, this.healthBar],
                [2, this.selectionBox],
                [1, this.pipsSprite],
                [3, this.controlGroupSprite],
                [4, this.primaryFactorySprite],
                [5, this.rallyLine],
            ]);
            elementMap.forEach((element, index) => {
                if (element) {
                    element.visible = selectionLevel >= SELECTION_LEVEL_MAP[index];
                }
            });
        }
        this.lastOwner = gameObject.owner;
        this.lastDebugTextEnabled = this.debugTextEnabled.value;
        this.repairWrench?.update(deltaTime);
    }
    private updateFlyerHelper(selectionLevel: SelectionLevel, deltaTime: number): void {
        if (this.flyHelper && this.gameObject.isUnit()) {
            let shouldShow: boolean;
            switch (this.flyerHelperOpt.value) {
                case FlyerHelperMode.Never:
                    shouldShow = false;
                    break;
                case FlyerHelperMode.Always:
                    shouldShow = true;
                    break;
                case FlyerHelperMode.Selected:
                    shouldShow = selectionLevel >= SelectionLevel.Selected;
                    break;
                default:
                    shouldShow = false;
            }
            shouldShow = shouldShow && this.gameObject.zone === ZoneType.Air;
            const flyHelperObj = this.flyHelper.get3DObject();
            flyHelperObj.visible = shouldShow;
            if (shouldShow) {
                this.flyHelper.update(deltaTime);
                const newY = -Coords.tileHeightToWorld(this.gameObject.tileElevation);
                if (newY !== flyHelperObj.position.y) {
                    flyHelperObj.position.y = newY;
                    flyHelperObj.updateMatrix();
                }
            }
        }
    }
    private updateBehindAnim(deltaTime: number): void {
        if (this.behindAnim) {
            const shouldShow = this.hiddenObjectsOpt.value &&
                this.gameObject.isSpawned &&
                this.gameObject.tile.occluded &&
                this.gameObject.art.canBeHidden &&
                this.gameObject.zone !== ZoneType.Air;
            if (shouldShow) {
                this.behindAnim.update(deltaTime);
                if (!this.behindAnim.get3DObject()?.parent) {
                    this.behindAnim.create3DObject();
                    this.rootObj!.add(this.behindAnim.get3DObject());
                    this.behindAnim.get3DObject().updateMatrix();
                }
            }
            else if (this.behindAnim.get3DObject()?.parent) {
                this.rootObj!.remove(this.behindAnim.get3DObject());
            }
        }
    }
    private updateDebugLabel(): void {
        const ownerColorHex = this.gameObject.owner.color.asHex();
        if (this.gameObject.debugLabel !== this.lastDebugLabel ||
            this.gameObject.owner !== this.lastOwner ||
            ownerColorHex !== this.lastDebugLabelOwnerColorHex ||
            this.debugTextEnabled.value !== this.lastDebugTextEnabled) {
            this.lastDebugLabel = this.gameObject.debugLabel;
            this.lastDebugLabelOwnerColorHex = ownerColorHex;
            if (this.debugLabel) {
                this.rootObj!.remove(this.debugLabel.get3DObject());
                this.debugLabel.dispose();
                this.debugLabel = undefined;
            }
            if (this.gameObject.debugLabel && this.debugTextEnabled.value) {
                const debugLabel = new DebugLabel(this.gameObject.debugLabel, this.gameObject.owner.color.asHex(), this.camera);
                this.debugLabel = debugLabel;
                debugLabel.create3DObject();
                debugLabel.get3DObject().renderOrder = 999999;
                this.rootObj!.add(debugLabel.get3DObject());
            }
        }
    }
    private updateRepairWrenchSprite(enabled: boolean): void {
        if (this.repairWrench) {
            this.rootObj!.remove(this.repairWrench.get3DObject());
        }
        if (enabled) {
            this.repairWrench = this.createRepairWrench();
            if (this.repairWrench) {
                this.repairWrench.create3DObject();
                this.rootObj!.add(this.repairWrench.get3DObject());
            }
        }
    }
    private updateVeteranIndicatorSprite(gameObject: GameObject): void {
        if (this.veteranIndicator) {
            this.rootObj!.remove(this.veteranIndicator);
        }
        this.veteranIndicator = this.createVeteranIndicator(gameObject);
        if (this.veteranIndicator) {
            this.rootObj!.add(this.veteranIndicator);
            const offset = Coords.screenDistanceToWorld(Math.floor(PipOverlay.pipBrdFile.getImage(gameObject.isInfantry() ? 1 : 0).width / 2) - Math.floor(PipOverlay.pipsFile.getImage(13).width / 2), 0);
            this.veteranIndicator.position.x = offset.x;
            this.veteranIndicator.position.y = 0;
            this.veteranIndicator.position.z = offset.y;
            this.veteranIndicator.updateMatrix();
        }
    }
    private updateRallyPointLine(rallyPoint: any, rallyLine: RallyPointFx): void {
        rallyLine.visible = false;
        if (rallyPoint && !this.objectIsOpaqueToViewer()) {
            rallyLine.sourcePos = this.gameObject.position.worldPosition;
            rallyLine.targetPos = Coords.tile3dToWorld(rallyPoint.rx + 0.5, rallyPoint.ry + 0.5, rallyPoint.z);
            rallyLine.color = new THREE.Color(this.gameObject.owner.color.asHex());
            rallyLine.needsUpdate = true;
            rallyLine.visible = true;
        }
    }
    private updatePrimaryFactorySprite(enabled: boolean): void {
        if (this.primaryFactorySprite) {
            this.rootObj!.remove(this.primaryFactorySprite);
        }
        if (enabled) {
            const sprite = this.createPrimaryFactorySprite();
            if (sprite) {
                this.primaryFactorySprite = sprite;
                this.rootObj!.add(sprite);
            }
        }
    }
    private updateControlGroupSprite(groupNumber: number | undefined): void {
        if (this.controlGroupSprite) {
            this.rootObj!.remove(this.controlGroupSprite);
        }
        if (groupNumber !== undefined) {
            const sprite = this.createControlGroupSprite(groupNumber);
            this.controlGroupSprite = sprite;
            const gameObject = this.gameObject;
            if (gameObject.isBuilding()) {
                sprite.position.x = 1;
                sprite.position.y = Coords.tileHeightToWorld(gameObject.art.height - 0.5);
                sprite.position.z = Coords.getWorldTileSize() * gameObject.art.foundation.height;
            }
            else if (gameObject.isInfantry()) {
                const offset = Coords.screenDistanceToWorld(-(CONTROL_GROUP_SIZE.width + 2 * BORDER_WIDTH +
                    PipOverlay.pipBrdFile.getImage(1).width / 2 + 1), -PipOverlay.pipBrdFile.height / 2);
                sprite.position.x = offset.x;
                sprite.position.y = this.healthBar!.position.y;
                sprite.position.z = offset.y;
            }
            else {
                const offset = Coords.screenDistanceToWorld(-PipOverlay.pipBrdFile.getImage(0).width / 2, PipOverlay.pipBrdFile.height / 2);
                sprite.position.x = offset.x;
                sprite.position.y = this.healthBar!.position.y;
                sprite.position.z = offset.y;
            }
            sprite.updateMatrix();
            this.rootObj!.add(sprite);
        }
    }
    private updatePipsSprite(): void {
        if (this.pipsSprite) {
            this.rootObj!.remove(this.pipsSprite);
            this.pipsSprite = undefined;
        }
        const gameObject = this.gameObject;
        let sprite: THREE.Mesh | undefined;
        if (gameObject.isBuilding()) {
            sprite = this.createBuildingOccupationInfo(gameObject);
        }
        else if (gameObject.isVehicle()) {
            const pipColors: PipColor[] = [];
            let totalSlots: number | undefined;
            if (gameObject.harvesterTrait && gameObject.rules.storage! > 0) {
                totalSlots = 5;
                const storage = gameObject.rules.storage!;
                const gemPips = Math.floor((gameObject.harvesterTrait.gems / storage) * totalSlots);
                const orePips = Math.floor((gameObject.harvesterTrait.ore / storage) * totalSlots);
                pipColors.push(...new Array(gemPips).fill(PipColor.Blue), ...new Array(orePips).fill(PipColor.Yellow));
            }
            else if (gameObject.transportTrait && gameObject.rules.passengers! > 0) {
                totalSlots = gameObject.rules.passengers;
                gameObject.transportTrait.units.forEach(unit => {
                    let vehiclePips = 0;
                    if (unit.isVehicle()) {
                        pipColors.push(PipColor.Blue);
                        vehiclePips++;
                    }
                    pipColors.push(...new Array(unit.rules.size - vehiclePips).fill(unit.isVehicle() ? PipColor.Red : unit.rules.pip));
                });
            }
            else if (gameObject.airSpawnTrait) {
                pipColors.push(...new Array(gameObject.airSpawnTrait.availableSpawns).fill(PipColor.Yellow));
                totalSlots = gameObject.rules.spawnsNumber;
            }
            if (totalSlots) {
                sprite = this.createPipsSprite(pipColors, totalSlots);
            }
        }
        else if (gameObject.isAircraft() &&
            gameObject.ammo &&
            gameObject.name !== this.paradropRules.paradropPlane &&
            !gameObject.rules.missileSpawn) {
            sprite = this.createPipsSprite(new Array(gameObject.ammo).fill(PipColor.Green), gameObject.ammo, true);
        }
        if (sprite) {
            sprite.updateMatrix();
            this.rootObj!.add(sprite);
            this.pipsSprite = sprite;
        }
    }
    private computePipsDataKey(gameObject: GameObject): any {
        if (gameObject.isBuilding()) {
            return gameObject.garrisonTrait?.units.length;
        }
        else if (gameObject.isVehicle()) {
            if (gameObject.harvesterTrait) {
                return `${gameObject.harvesterTrait.ore}_${gameObject.harvesterTrait.gems}`;
            }
            else if (gameObject.transportTrait) {
                return gameObject.transportTrait.units.length;
            }
            else if (gameObject.airSpawnTrait) {
                return gameObject.airSpawnTrait.availableSpawns;
            }
        }
        else if (gameObject.isAircraft()) {
            return gameObject.ammo;
        }
        return undefined;
    }
    private updateHealthBarSprite(selectionLevel: SelectionLevel): void {
        if (this.healthBar) {
            this.rootObj!.remove(this.healthBar);
            if (this.gameObject.isBuilding()) {
                this.healthBar = this.createBuildingHealthBar(this.gameObject);
            }
            else {
                const { healthBarWrapper, selectionBox } = this.createUnitHealthBar(this.gameObject);
                this.healthBar = healthBarWrapper;
                this.selectionBox = selectionBox;
                selectionBox.visible = selectionLevel >= SELECTION_LEVEL_MAP[2];
            }
            this.rootObj!.add(this.healthBar);
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.rootObj;
    }
    dispose(): void {
        this.disposables.dispose();
        this.repairWrench?.dispose();
        this.flyHelper?.dispose();
        this.behindAnim?.dispose();
        this.debugLabel?.dispose();
        this.animFactory = undefined as any;
    }
}
