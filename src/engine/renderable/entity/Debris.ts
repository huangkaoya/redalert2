import { WithPosition } from "@/engine/renderable/WithPosition";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { Animation } from "@/engine/Animation";
import { AnimProps } from "@/engine/AnimProps";
import { SimpleRunner } from "@/engine/animation/SimpleRunner";
import { Coords } from "@/game/Coords";
import { ShadowRenderable } from "@/engine/renderable/ShadowRenderable";
import * as THREE from "three";
interface GameObject {
    rules: any;
    art: any;
    tile: {
        z: number;
    };
    tileElevation: number;
    velocity: THREE.Vector3;
    position: {
        worldPosition: THREE.Vector3;
    };
    rotationAxis: THREE.Vector3;
    angularVelocity: number;
    name: string;
    isDestroyed: boolean;
    explodeAnim?: any;
}
interface Rules {
    voxelAnimRules: Map<string, any>;
}
interface ImageFinder {
    findByObjectArt(objectArt: any): any;
}
interface Voxels {
    get(filename: string): any;
}
interface Palette {
}
interface Camera {
}
interface Lighting {
    compute(lightingType: any, tile: any, tileElevation: number): THREE.Vector3;
    computeNoAmbient(lightingType: any, tile: any, tileElevation: number): number;
}
interface GameSpeed {
}
interface VxlBuilderFactory {
    create(voxel: any, param2: any, palettes: Palette[], palette: Palette): VxlBuilder;
}
interface VxlBuilder {
    build(): THREE.Object3D;
    setExtraLight(light: THREE.Vector3): void;
    dispose(): void;
}
interface Plugin {
    updateLighting?(): void;
    update(time: number): void;
    onCreate(context: any): void;
    onRemove(context: any): void;
    dispose(): void;
}
export class Debris {
    private gameObject: GameObject;
    private rules: Rules;
    private imageFinder: ImageFinder;
    private voxels: Voxels;
    private palette: Palette;
    private camera: Camera;
    private lighting: Lighting;
    private gameSpeed: GameSpeed;
    private vxlBuilderFactory: VxlBuilderFactory;
    private useSpriteBatching: boolean;
    private plugins: Plugin[] = [];
    private objectRules: any;
    private objectArt: any;
    private label: string;
    private baseShpExtraLight!: THREE.Vector3;
    private baseVxlExtraLight!: THREE.Vector3;
    private vxlExtraLight!: THREE.Vector3;
    private shpExtraLight!: THREE.Vector3;
    private withPosition!: WithPosition;
    private target?: THREE.Object3D;
    private lastElevation?: number;
    private shadowWrap?: THREE.Object3D;
    private vxlBuilder?: VxlBuilder;
    private vxlRotObj!: THREE.Object3D;
    private shpAnimRunner!: SimpleRunner;
    private shpRenderable?: ShpRenderable;
    private shpShadowRenderable?: ShpRenderable;
    constructor(gameObject: GameObject, rules: Rules, imageFinder: ImageFinder, voxels: Voxels, _unusedVoxelAnimCollection: unknown, palette: Palette, camera: Camera, lighting: Lighting, gameSpeed: GameSpeed, vxlBuilderFactory: VxlBuilderFactory, useSpriteBatching: boolean) {
        this.gameObject = gameObject;
        this.rules = rules;
        this.imageFinder = imageFinder;
        this.voxels = voxels;
        this.palette = palette;
        this.camera = camera;
        this.lighting = lighting;
        this.gameSpeed = gameSpeed;
        this.vxlBuilderFactory = vxlBuilderFactory;
        this.useSpriteBatching = useSpriteBatching;
        this.objectRules = gameObject.rules;
        this.objectArt = gameObject.art;
        this.label = "debris_" + this.objectRules.name;
        if (typeof this.lighting?.compute !== "function" ||
            typeof this.lighting?.computeNoAmbient !== "function") {
            throw new Error(`[Debris] invalid lighting dependency for "${this.objectRules.name}". ` +
                `Expected Lighting with compute()/computeNoAmbient(), got "${this.lighting?.constructor?.name ?? typeof this.lighting}"`);
        }
        this.init();
    }
    private init(): void {
        this.baseShpExtraLight = this.lighting
            .compute(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
            .addScalar(-1);
        this.baseVxlExtraLight = new THREE.Vector3().addScalar(this.lighting.computeNoAmbient(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation));
        this.vxlExtraLight = new THREE.Vector3().copy(this.baseVxlExtraLight);
        this.shpExtraLight = new THREE.Vector3().copy(this.baseShpExtraLight);
        this.withPosition = new WithPosition();
    }
    public registerPlugin(plugin: Plugin): void {
        this.plugins.push(plugin);
    }
    public updateLighting(): void {
        this.plugins.forEach((plugin) => plugin.updateLighting?.());
        this.baseShpExtraLight = this.lighting
            .compute(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
            .addScalar(-1);
        this.baseVxlExtraLight = new THREE.Vector3().addScalar(this.lighting.computeNoAmbient(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation));
        this.vxlExtraLight.copy(this.baseVxlExtraLight);
        this.shpExtraLight.copy(this.baseShpExtraLight);
    }
    public get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    public create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = new THREE.Object3D();
            obj.name = this.label;
            this.target = obj;
            obj.matrixAutoUpdate = false;
            this.withPosition.matrixUpdate = true;
            this.withPosition.applyTo(this);
            this.createObjects(obj);
            this.vxlBuilder?.setExtraLight(this.vxlExtraLight);
            this.shpRenderable?.setExtraLight(this.shpExtraLight);
        }
    }
    public setPosition(position: THREE.Vector3): void {
        this.withPosition.setPosition(position.x, position.y, position.z);
    }
    public getPosition(): THREE.Vector3 {
        return this.withPosition.getPosition();
    }
    public update(time: number, deltaTime: number = 0): void {
        this.plugins.forEach((plugin) => plugin.update(time));
        const elevation = this.gameObject.tile.z + this.gameObject.tileElevation;
        if (this.lastElevation === undefined || this.lastElevation !== elevation) {
            this.lastElevation = elevation;
            this.baseVxlExtraLight = new THREE.Vector3().addScalar(this.lighting.computeNoAmbient(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation));
            this.baseShpExtraLight = this.lighting
                .compute(this.objectArt.lightingType, this.gameObject.tile, this.gameObject.tileElevation)
                .addScalar(-1);
            this.vxlExtraLight.copy(this.baseVxlExtraLight);
            this.shpExtraLight.copy(this.baseShpExtraLight);
            if (this.shadowWrap) {
                this.shadowWrap.position.y = -Coords.tileHeightToWorld(this.gameObject.tileElevation);
                this.shadowWrap.updateMatrix();
            }
        }
        if (deltaTime > 0) {
            const velocity = this.gameObject.velocity.clone();
            const displacement = velocity.multiplyScalar(deltaTime);
            const newPosition = displacement.add(this.gameObject.position.worldPosition);
            this.setPosition(newPosition);
        }
        if (this.vxlBuilder) {
            const { rotationAxis, angularVelocity } = this.gameObject;
            this.vxlRotObj.rotateOnAxis(rotationAxis, THREE.MathUtils.degToRad(angularVelocity));
            this.vxlRotObj.updateMatrix();
        }
        else {
            this.shpAnimRunner.tick(time);
            this.shpRenderable?.setFrame(this.shpAnimRunner.animation.getCurrentFrame());
            this.shpShadowRenderable?.setFrame(this.shpAnimRunner.animation.getCurrentFrame());
        }
    }
    private createObjects(parent: THREE.Object3D): void {
        const rotationObj = this.vxlRotObj = new THREE.Object3D();
        rotationObj.matrixAutoUpdate = false;
        rotationObj.rotation.order = "YXZ";
        const mainObject = this.createMainObject();
        rotationObj.add(mainObject);
        parent.add(rotationObj);
    }
    private computeSpriteAnchorOffset(offset: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    } {
        const drawOffset = this.objectArt.getDrawOffset();
        return { x: offset.x + drawOffset.x, y: offset.y + drawOffset.y };
    }
    private createMainObject(): THREE.Object3D {
        const mainObj = new THREE.Object3D();
        mainObj.matrixAutoUpdate = false;
        if (this.rules.voxelAnimRules.has(this.gameObject.name)) {
            const vxlFileName = this.getVxlFileName(this.objectRules, this.objectArt);
            const voxel = this.voxels.get(vxlFileName);
            if (!voxel) {
                throw new Error(`VXL missing for anim ${this.objectRules.name}. Vxl file ${vxlFileName} not found. `);
            }
            const builder = this.vxlBuilderFactory.create(voxel, undefined, [this.palette], this.palette);
            this.vxlBuilder = builder;
            const vxlObject = builder.build();
            mainObj.add(vxlObject);
        }
        else {
            const spriteTranslation = new MapSpriteTranslation(1, 1);
            const { spriteOffset, anchorPointWorld } = spriteTranslation.compute();
            const anchorOffset = this.computeSpriteAnchorOffset(spriteOffset);
            const image = this.imageFinder.findByObjectArt(this.objectArt);
            const shpRenderable = this.shpRenderable = ShpRenderable.factory(image, this.palette, this.camera, anchorOffset, false);
            shpRenderable.setBatched(this.useSpriteBatching);
            if (this.useSpriteBatching) {
                shpRenderable.setBatchPalettes([this.palette]);
            }
            shpRenderable.create3DObject();
            mainObj.add(shpRenderable.get3DObject());
            const shadowPalette = ShadowRenderable.getOrCreateShadowPalette();
            const shpShadowRenderable = this.shpShadowRenderable = ShpRenderable.factory(image, shadowPalette, this.camera, anchorOffset, false);
            shpShadowRenderable.setBatched(this.useSpriteBatching);
            if (this.useSpriteBatching) {
                shpShadowRenderable.setBatchPalettes([shadowPalette]);
            }
            shpShadowRenderable.setOpacity(0.5);
            shpShadowRenderable.create3DObject();
            const shadowWrap = this.shadowWrap = new THREE.Object3D();
            shadowWrap.matrixAutoUpdate = false;
            shadowWrap.add(shpShadowRenderable.get3DObject());
            mainObj.add(shadowWrap);
            mainObj.position.x = anchorPointWorld.x;
            mainObj.position.z = anchorPointWorld.y;
            mainObj.updateMatrix();
            shpRenderable.setFlat(this.objectArt.flat);
            const animProps = new AnimProps(this.objectArt.art, image);
            const animation = new Animation(animProps, this.gameSpeed);
            this.shpAnimRunner = new SimpleRunner();
            this.shpAnimRunner.animation = animation;
        }
        return mainObj;
    }
    private getVxlFileName(objectRules: any, objectArt: any): string {
        let imageName = objectArt.imageName;
        if (objectRules.shareSource) {
            imageName = objectRules.shareSource;
            if (objectRules.shareTurretData) {
                imageName += "tur";
            }
            else if (objectRules.shareBarrelData) {
                imageName += "barl";
            }
        }
        return imageName.toLowerCase() + ".vxl";
    }
    public onCreate(context: any): void {
        this.plugins.forEach((plugin) => plugin.onCreate(context));
    }
    public onRemove(context: any): void {
        this.plugins.forEach((plugin) => plugin.onRemove(context));
        if (this.gameObject.isDestroyed && this.get3DObject()) {
            const explodeAnim = this.gameObject.explodeAnim;
            if (explodeAnim) {
                context.createTransientAnim(explodeAnim, (anim: any) => anim.setPosition(this.withPosition.getPosition()));
            }
        }
    }
    public dispose(): void {
        this.plugins.forEach((plugin) => plugin.dispose());
        this.shpRenderable?.dispose();
        this.shpShadowRenderable?.dispose();
        this.vxlBuilder?.dispose();
    }
}
