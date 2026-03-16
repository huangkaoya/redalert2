import { WithPosition } from "@/engine/renderable/WithPosition";
import { AnimProps } from "@/engine/AnimProps";
import { Animation, AnimationState } from "@/engine/Animation";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { ImageFinder } from "@/engine/ImageFinder";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { SimpleRunner } from "@/engine/animation/SimpleRunner";
import { MathUtils } from "@/engine/gfx/MathUtils";
import { Coords } from "@/game/Coords";
import * as THREE from 'three';
interface ObjectArt {
    paletteType: string;
    customPaletteName?: string;
    startSound?: string;
    report?: string;
    translucent: boolean;
    translucency: number;
    zAdjust?: number;
    flat: boolean;
    art: any;
    getDrawOffset(): {
        x: number;
        y: number;
    };
}
interface Theater {
    getPalette(paletteType: string, customPaletteName?: string): any;
}
interface Camera {
}
interface DebugFrame {
    value: boolean;
}
interface WorldSound {
    playEffect(sound: string, position: THREE.Vector3, param3?: any, param4?: number, param5?: number): SoundHandle;
}
interface SoundHandle {
    isLoop: boolean;
    stop(): void;
}
interface Palette {
    clone(): Palette;
    remap(colorMap: any): void;
}
export class Anim {
    public objectArt: ObjectArt;
    public extraOffset: {
        x: number;
        y: number;
    };
    public imageFinder: ImageFinder;
    public theater: Theater;
    public camera: Camera;
    public debugFrame: DebugFrame;
    public gameSpeed: number;
    public useSpriteBatching: boolean;
    public extraLight: THREE.Vector3;
    public worldSound?: WorldSound;
    public renderOrder: number = 0;
    public name: string;
    public palette: Palette;
    public withPosition: WithPosition;
    private target?: THREE.Object3D;
    private mainObj?: ShpRenderable;
    private animation?: Animation;
    private animationRunner?: SimpleRunner;
    private shpFile?: any;
    private soundHandle?: SoundHandle;
    constructor(name: string, objectArt: ObjectArt, extraOffset: {
        x: number;
        y: number;
    }, imageFinder: ImageFinder, theater: Theater, camera: Camera, debugFrame: DebugFrame, gameSpeed: number, useSpriteBatching: boolean, extraLight: THREE.Vector3 = new THREE.Vector3(0, 0, 0), worldSound?: WorldSound, palette?: Palette) {
        this.objectArt = objectArt;
        this.extraOffset = extraOffset;
        this.imageFinder = imageFinder;
        this.theater = theater;
        this.camera = camera;
        this.debugFrame = debugFrame;
        this.gameSpeed = gameSpeed;
        this.useSpriteBatching = useSpriteBatching;
        this.extraLight = extraLight;
        this.worldSound = worldSound;
        this.name = name;
        this.palette = palette ?? this.theater.getPalette(this.objectArt.paletteType, this.objectArt.customPaletteName);
        this.withPosition = new WithPosition();
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = new THREE.Object3D();
            obj.name = "anim_" + this.name;
            this.target = obj;
            obj.matrixAutoUpdate = false;
            this.withPosition.matrixUpdate = true;
            this.withPosition.applyTo(this);
            this.createObjects(obj);
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
    update(deltaTime: number): void {
        if (this.animationRunner && this.animation && this.mainObj) {
            const sound = this.objectArt.startSound ?? this.objectArt.report;
            if (sound && !this.soundHandle &&
                this.animation.getState() === AnimationState.NOT_STARTED) {
                this.soundHandle = this.worldSound?.playEffect(sound, this.withPosition.getPosition(), undefined, 1, 0.25);
            }
            this.animationRunner.tick(deltaTime);
            const obj = this.mainObj.get3DObject();
            if (obj) {
                obj.visible = this.animation.getState() !== AnimationState.DELAYED;
            }
            this.mainObj.setFrame(this.animationRunner.getCurrentFrame());
            const isTranslucent = this.objectArt.translucent;
            const translucency = this.objectArt.translucency;
            if (isTranslucent || translucency > 0) {
                let opacity: number;
                if (isTranslucent) {
                    const props = this.animation.props;
                    opacity = 1 - this.animationRunner.getCurrentFrame() / (props.end - props.start);
                }
                else {
                    opacity = 1 - translucency;
                }
                this.mainObj.setOpacity(opacity);
            }
        }
    }
    private createObjects(parentObj: THREE.Object3D): void {
        const dimensions = { width: 1, height: 1 };
        if (this.debugFrame.value) {
            const wireframe = DebugUtils.createWireframe(dimensions, 0);
            parentObj.add(wireframe);
        }
        const spriteTranslation = new MapSpriteTranslation(dimensions.width, dimensions.height);
        const { spriteOffset, anchorPointWorld } = spriteTranslation.compute();
        const anchorOffset = this.computeSpriteAnchorOffset(spriteOffset);
        const container = new THREE.Object3D();
        container.matrixAutoUpdate = false;
        this.mainObj = this.createMainObject(anchorOffset);
        if (this.mainObj) {
            this.mainObj.setExtraLight(this.extraLight);
            const shouldBatch = this.useSpriteBatching && !this.renderOrder;
            this.mainObj.setBatched(shouldBatch);
            if (shouldBatch) {
                this.mainObj.setBatchPalettes([this.palette]);
            }
            const isTranslucent = this.objectArt.translucent;
            const translucency = this.objectArt.translucency;
            if (isTranslucent || translucency > 0) {
                this.mainObj.setForceTransparent(true);
            }
            this.mainObj.create3DObject();
            if (this.renderOrder) {
                if (shouldBatch) {
                    throw new Error("Render order not supported with batching");
                }
                const shapeMesh = this.mainObj.getShapeMesh();
                shapeMesh.renderOrder = this.renderOrder;
                shapeMesh.material.depthTest = !this.renderOrder;
                shapeMesh.material.transparent = !!this.renderOrder;
            }
            const mainObj3D = this.mainObj.get3DObject();
            if (mainObj3D) {
                container.add(mainObj3D);
            }
            container.position.x = anchorPointWorld.x;
            container.position.z = anchorPointWorld.y;
            if (this.objectArt.zAdjust) {
                MathUtils.translateTowardsCamera(container, this.camera, -this.objectArt.zAdjust * Coords.ISO_WORLD_SCALE);
            }
            container.updateMatrix();
            parentObj.add(container);
        }
    }
    setExtraLight(light: THREE.Vector3): void {
        this.extraLight = light;
        this.mainObj?.setExtraLight(this.extraLight);
    }
    setRenderOrder(order: number): void {
        if (this.mainObj) {
            throw new Error("Render order must be set before 3DObject is created");
        }
        this.renderOrder = order;
    }
    private computeSpriteAnchorOffset(spriteOffset: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    } {
        const drawOffset = this.objectArt.getDrawOffset();
        return {
            x: spriteOffset.x + drawOffset.x + this.extraOffset.x,
            y: spriteOffset.y + drawOffset.y + this.extraOffset.y
        };
    }
    private createMainObject(offset: {
        x: number;
        y: number;
    }): ShpRenderable | undefined {
        let shpFile: any;
        try {
            shpFile = this.shpFile = this.imageFinder.findByObjectArt(this.objectArt);
        }
        catch (error) {
            if (error instanceof ImageFinder.MissingImageError) {
                console.warn(error.message);
                return undefined;
            }
            throw error;
        }
        const renderable = ShpRenderable.factory(shpFile, this.palette, this.camera, offset);
        renderable.setFlat(this.objectArt.flat);
        const animProps = new AnimProps(this.objectArt.art, shpFile);
        this.animation = new Animation(animProps, this.gameSpeed);
        this.animationRunner = new SimpleRunner();
        this.animationRunner.animation = this.animation;
        return renderable;
    }
    getAnimProps(): AnimProps | undefined {
        return this.animation?.props;
    }
    getShpFile(): any {
        return this.shpFile;
    }
    remapColor(colorMap: any): void {
        if (this.mainObj) {
            throw new Error("Palette can only be remapped before creating 3DObject");
        }
        const clonedPalette = this.palette.clone();
        clonedPalette.remap(colorMap);
        this.palette = clonedPalette;
    }
    isAnimFinished(): boolean {
        return this.animation?.getState() === AnimationState.STOPPED;
    }
    isAnimNotStarted(): boolean {
        return this.animation?.getState() === AnimationState.NOT_STARTED;
    }
    endAnimationLoop(): void {
        this.animation?.endLoopAndPlayToEnd();
    }
    reset(): void {
        this.animation?.reset();
    }
    dispose(): void {
        this.mainObj?.dispose();
        if (this.soundHandle?.isLoop) {
            this.soundHandle.stop();
        }
    }
}
