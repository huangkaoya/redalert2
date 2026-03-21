import { Coords } from "@/game/Coords";
import { WithPosition } from "@/engine/renderable/WithPosition";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { getRandomInt } from "@/util/math";
import { VeteranLevel } from "@/game/gameobject/unit/VeteranLevel";
import { HighlightAnimRunner } from "@/engine/renderable/entity/HighlightAnimRunner";
import { AnimationState } from "@/engine/Animation";
import { DeathType } from "@/game/gameobject/common/DeathType";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { InvulnerableAnimRunner } from "@/engine/renderable/entity/InvulnerableAnimRunner";
import { BoxIntersectObject3D } from "@/engine/renderable/entity/BoxIntersectObject3D";
import { RotorHelper } from "@/engine/renderable/entity/unit/RotorHelper";
import { ExtraLightHelper } from "@/engine/renderable/entity/unit/ExtraLightHelper";
import { DebugRenderable } from "@/engine/renderable/DebugRenderable";
import * as THREE from 'three';
interface GameObject {
    id: string;
    name: string;
    rules: any;
    art: any;
    owner: {
        color: any;
    };
    tile: any;
    veteranLevel: VeteranLevel;
    invulnerableTrait: {
        isActive(): boolean;
    };
    warpedOutTrait: {
        isActive(): boolean;
    };
    cloakableTrait?: {
        isCloaked(): boolean;
    };
    zone: ZoneType;
    pitch: number;
    yaw: number;
    roll: number;
    isDestroyed: boolean;
    deathType: DeathType;
    moveTrait: {
        velocity: THREE.Vector3;
    };
    getUiName(): string;
}
interface Rules {
    colors: Map<string, any>;
    audioVisual: {
        extraAircraftLight: number;
    };
    general: {
        getMissileRules(name: string): {
            bodyLength: number;
        };
    };
}
interface Palette {
    clone(): Palette;
    remap(color: any): Palette;
}
interface VoxelAnims {
    get(key: string): any;
}
interface Voxels {
    get(key: string): any;
}
interface Lighting {
    computeNoAmbient(lightingType: any, tile: any): number;
    getAmbientIntensity(): number;
}
interface GameSpeed {
}
interface SelectionModel {
}
interface VxlBuilderFactory {
    create(voxel: any, anim: any, palettes: Palette[], palette: Palette): VxlBuilder;
}
interface VxlBuilder {
    build(): THREE.Object3D;
    setExtraLight(light: THREE.Vector3): void;
    setOpacity(opacity: number): void;
    setPalette(palette: Palette): void;
    dispose(): void;
    getSection(name: string): THREE.Object3D | undefined;
}
interface PipOverlay {
    create3DObject(): void;
    get3DObject(): THREE.Object3D;
    update(deltaTime: number): void;
    dispose(): void;
}
interface Plugin {
    updateLighting?(): void;
    getUiNameOverride?(): string;
    shouldDisableHighlight?(): boolean;
    update(deltaTime: number): void;
    onCreate(renderableManager: RenderableManager): void;
    onRemove(renderableManager: RenderableManager): void;
    dispose(): void;
}
interface RenderableManager {
    createTransientAnim(name: string, callback: (anim: any) => void): void;
}
interface DebugFrame {
    value: boolean;
}
export class Aircraft {
    private gameObject: GameObject;
    private rules: Rules;
    private voxels: Voxels;
    private voxelAnims: VoxelAnims;
    private palette: Palette;
    private lighting: Lighting;
    private debugFrame: DebugFrame;
    private gameSpeed: GameSpeed;
    private selectionModel: SelectionModel;
    private vxlBuilderFactory: VxlBuilderFactory;
    private useSpriteBatching: boolean;
    private pipOverlay?: PipOverlay;
    private rotorSpeeds: number[] = [];
    private vxlBuilders: VxlBuilder[] = [];
    private highlightAnimRunner: HighlightAnimRunner;
    private invulnAnimRunner: InvulnerableAnimRunner;
    private plugins: Plugin[] = [];
    private objectRules: any;
    private objectArt: any;
    private label: string;
    private paletteRemaps: Palette[] = [];
    private lastOwnerColor: any;
    private withPosition: WithPosition;
    private baseExtraLight: THREE.Vector3;
    private extraLight: THREE.Vector3;
    private target?: THREE.Object3D;
    private lastVeteranLevel?: VeteranLevel;
    private lastInvulnerable: boolean = false;
    private lastWarpedOut: boolean = false;
    private lastCloaked: boolean = false;
    private lastZone?: ZoneType;
    private tiltObj: THREE.Object3D;
    private posObj: THREE.Object3D;
    private rotors?: THREE.Object3D[];
    private placeholder?: DebugRenderable;
    private renderableManager?: RenderableManager;
    constructor(gameObject: GameObject, rules: Rules, voxels: Voxels, voxelAnims: VoxelAnims, palette: Palette, lighting: Lighting, debugFrame: DebugFrame, gameSpeed: GameSpeed, selectionModel: SelectionModel, vxlBuilderFactory: VxlBuilderFactory, useSpriteBatching: boolean, pipOverlay?: PipOverlay) {
        this.gameObject = gameObject;
        this.rules = rules;
        this.voxels = voxels;
        this.voxelAnims = voxelAnims;
        this.palette = palette;
        this.lighting = lighting;
        this.debugFrame = debugFrame;
        this.gameSpeed = gameSpeed;
        this.selectionModel = selectionModel;
        this.vxlBuilderFactory = vxlBuilderFactory;
        this.useSpriteBatching = useSpriteBatching;
        this.pipOverlay = pipOverlay;
        this.highlightAnimRunner = new HighlightAnimRunner(this.gameSpeed);
        this.invulnAnimRunner = new InvulnerableAnimRunner(this.gameSpeed);
        this.objectRules = gameObject.rules;
        this.objectArt = gameObject.art;
        this.label = "aircraft_" + this.objectRules.name;
        this.init();
    }
    private init(): void {
        this.paletteRemaps = [...this.rules.colors.values()].map((color) => this.palette.clone().remap(color));
        this.palette.remap(this.gameObject.owner.color);
        this.lastOwnerColor = this.gameObject.owner.color;
        this.withPosition = new WithPosition();
        this.updateBaseLight();
        this.extraLight = new THREE.Vector3().copy(this.baseExtraLight);
    }
    private updateBaseLight(): void {
        this.baseExtraLight = new THREE.Vector3().setScalar(1 + this.lighting.computeNoAmbient(this.objectArt.lightingType, this.gameObject.tile) + this.rules.audioVisual.extraAircraftLight);
    }
    updateLighting(): void {
        this.plugins.forEach((plugin) => plugin.updateLighting?.());
        this.updateBaseLight();
        this.extraLight.copy(this.baseExtraLight);
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    getIntersectTarget(): THREE.Object3D | undefined {
        return this.target;
    }
    getUiName(): string {
        const override = this.plugins.reduce((result, plugin) => plugin.getUiNameOverride?.() ?? result, undefined as string | undefined);
        return override !== undefined ? override : this.gameObject.getUiName();
    }
    create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = new BoxIntersectObject3D(new THREE.Vector3(1, 1 / 3, 1).multiplyScalar(Coords.LEPTONS_PER_TILE *
                (this.gameObject.rules.spawned ? 0.5 : 1)));
            obj.name = this.label;
            obj.userData.id = this.gameObject.id;
            this.target = obj;
            obj.matrixAutoUpdate = false;
            this.withPosition.matrixUpdate = true;
            this.withPosition.applyTo(this);
            this.createObjects(obj);
            this.vxlBuilders.forEach((builder) => builder.setExtraLight(this.extraLight));
            if (this.pipOverlay) {
                this.pipOverlay.create3DObject();
                this.posObj?.add(this.pipOverlay.get3DObject());
            }
        }
    }
    setPosition(position: {
        x: number;
        y: number;
        z: number;
    }): void {
        this.withPosition.setPosition(position.x, position.y, position.z);
    }
    getPosition(): THREE.Vector3 {
        return this.withPosition.getPosition();
    }
    registerPlugin(plugin: Plugin): void {
        this.plugins.push(plugin);
    }
    highlight(): void {
        if (!this.plugins.some((plugin) => plugin.shouldDisableHighlight?.())) {
            if (this.highlightAnimRunner.animation.getState() !== AnimationState.RUNNING) {
                this.highlightAnimRunner.animate(2);
            }
        }
    }
    update(deltaTime: number): void {
        this.plugins.forEach((plugin) => plugin.update(deltaTime));
        this.pipOverlay?.update(deltaTime);
        if (this.gameObject.veteranLevel !== this.lastVeteranLevel) {
            if (this.gameObject.veteranLevel === VeteranLevel.Elite &&
                this.lastVeteranLevel !== undefined) {
                this.highlightAnimRunner.animate(30);
            }
            this.lastVeteranLevel = this.gameObject.veteranLevel;
        }
        const shouldUpdateHighlight = this.highlightAnimRunner.shouldUpdate();
        const isInvulnerable = this.gameObject.invulnerableTrait.isActive();
        const invulnChanged = isInvulnerable !== this.lastInvulnerable;
        this.lastInvulnerable = isInvulnerable;
        if (isInvulnerable && invulnChanged) {
            this.invulnAnimRunner.animate();
        }
        if (this.invulnAnimRunner.shouldUpdate()) {
            this.invulnAnimRunner.tick(deltaTime);
        }
        if (shouldUpdateHighlight || invulnChanged) {
            if (shouldUpdateHighlight) {
                this.highlightAnimRunner.tick(deltaTime);
            }
            const invulnValue = isInvulnerable ? this.invulnAnimRunner.getValue() : 0;
            const highlightValue = (shouldUpdateHighlight ? this.highlightAnimRunner.getValue() : 0) || invulnValue;
            const ambientIntensity = this.lighting.getAmbientIntensity();
            ExtraLightHelper.multiplyVxl(this.extraLight, this.baseExtraLight, ambientIntensity, highlightValue);
        }
        const isWarpedOut = this.gameObject.warpedOutTrait.isActive();
        const warpedOutChanged = isWarpedOut !== this.lastWarpedOut;
        this.lastWarpedOut = isWarpedOut;
        const isCloaked = this.gameObject.cloakableTrait?.isCloaked();
        const cloakedChanged = isCloaked !== this.lastCloaked;
        this.lastCloaked = isCloaked;
        if (warpedOutChanged || cloakedChanged) {
            const opacity = isWarpedOut || isCloaked ? 0.5 : 1;
            this.vxlBuilders.forEach((builder) => builder.setOpacity(opacity));
            this.placeholder?.setOpacity(opacity);
        }
        const ownerColor = this.gameObject.owner.color;
        if (this.lastOwnerColor !== ownerColor) {
            this.palette.remap(ownerColor);
            this.lastOwnerColor = ownerColor;
            this.vxlBuilders.forEach((builder) => builder.setPalette(this.palette));
            this.placeholder?.setPalette(this.palette);
        }
        const zone = this.gameObject.zone;
        if (zone !== this.lastZone) {
            if (this.gameObject.rules.missileSpawn &&
                zone === ZoneType.Air &&
                this.lastZone !== ZoneType.Air) {
                this.renderableManager?.createTransientAnim("V3TAKOFF", (anim) => anim.setPosition(this.withPosition.getPosition()));
            }
            this.lastZone = zone;
        }
        this.updateVxlRotation();
    }
    private updateVxlRotation(): void {
        const { pitch, yaw, roll } = this.gameObject;
        this.tiltObj.rotation.z = THREE.MathUtils.degToRad(roll);
        this.tiltObj.rotation.x = THREE.MathUtils.degToRad(pitch);
        this.tiltObj.rotation.y = THREE.MathUtils.degToRad(yaw);
        if (this.rotors) {
            this.rotors.forEach((rotor, index) => {
                this.rotorSpeeds[index] = RotorHelper.computeRotationStep(this.gameObject, this.rotorSpeeds[index] ?? 0, this.objectArt.rotors[index]);
                if (this.rotorSpeeds[index]) {
                    rotor.rotateOnAxis(this.objectArt.rotors[index].axis, this.rotorSpeeds[index]);
                    rotor.updateMatrix();
                }
            });
        }
    }
    private createObjects(target: THREE.Object3D): void {
        if (this.debugFrame.value) {
            const wireframe = DebugUtils.createWireframe({ width: 1, height: 1 }, 1);
            wireframe.translateX(-Coords.getWorldTileSize() / 2);
            wireframe.translateZ(-Coords.getWorldTileSize() / 2);
            target.add(wireframe);
        }
        const tiltObj = this.tiltObj = new THREE.Object3D();
        tiltObj.rotation.order = "YXZ";
        const mainObject = this.createMainObject();
        tiltObj.add(mainObject);
        const posObj = this.posObj = new THREE.Object3D();
        posObj.matrixAutoUpdate = false;
        posObj.add(tiltObj);
        target.add(posObj);
    }
    private createMainObject(): THREE.Object3D {
        const imageName = this.objectArt.imageName.toLowerCase();
        const vxlFile = imageName + ".vxl";
        const voxel = this.voxels.get(vxlFile);
        if (!voxel) {
            console.warn(`VXL missing for aircraft ${this.objectRules.name}. Vxl file ${vxlFile} not found. `);
            this.placeholder = new DebugRenderable({ width: 0.5, height: 0.5 }, this.objectArt.height, this.palette, { centerFoundation: true });
            this.placeholder.setBatched(this.useSpriteBatching);
            if (this.useSpriteBatching) {
                this.placeholder.setBatchPalettes(this.paletteRemaps);
            }
            this.placeholder.create3DObject();
            return this.placeholder.get3DObject();
        }
        const hvaFile = this.objectArt.noHva
            ? undefined
            : this.voxelAnims.get(imageName + ".hva");
        const palettes = [...this.rules.colors.values()].map((color) => this.palette.clone().remap(color));
        const vxlBuilder = this.vxlBuilderFactory.create(voxel, hvaFile, palettes, this.palette);
        this.vxlBuilders.push(vxlBuilder);
        const builtObject = vxlBuilder.build();
        if (this.objectArt.rotors) {
            this.rotors = this.objectArt.rotors.map((rotorConfig: any) => {
                const section = vxlBuilder.getSection(rotorConfig.name);
                if (!section) {
                    throw new Error(`Aircraft "${this.objectRules.name}" VXL section "${rotorConfig.name}" not found`);
                }
                return section;
            });
        }
        return builtObject;
    }
    onCreate(renderableManager: RenderableManager): void {
        this.renderableManager = renderableManager;
        this.plugins.forEach((plugin) => plugin.onCreate(renderableManager));
    }
    onRemove(renderableManager: RenderableManager): void {
        this.renderableManager = undefined;
        this.plugins.forEach((plugin) => plugin.onRemove(renderableManager));
        if (this.gameObject.isDestroyed &&
            this.objectRules.explosion.length &&
            this.gameObject.deathType !== DeathType.Temporal &&
            this.gameObject.deathType !== DeathType.None) {
            const explosions = this.objectRules.explosion;
            const explosion = explosions[getRandomInt(0, explosions.length - 1)];
            renderableManager.createTransientAnim(explosion, (anim) => {
                let position = this.withPosition.getPosition();
                if (this.gameObject.rules.missileSpawn) {
                    position = position
                        .clone()
                        .add(this.gameObject.moveTrait.velocity
                        .clone()
                        .setLength(this.rules.general.getMissileRules(this.gameObject.name).bodyLength));
                }
                anim.setPosition(position);
            });
        }
    }
    dispose(): void {
        this.plugins.forEach((plugin) => plugin.dispose());
        this.pipOverlay?.dispose();
        this.vxlBuilders.forEach((builder) => builder.dispose());
        this.placeholder?.dispose();
    }
}
