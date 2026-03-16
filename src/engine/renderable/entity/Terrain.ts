import { WithPosition } from "@/engine/renderable/WithPosition";
import { ImageFinder } from "@/engine/ImageFinder";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { ShpRenderable } from "@/engine/renderable/ShpRenderable";
import { TiberiumTreeTrait, SpawnStatus } from "@/game/gameobject/trait/TiberiumTreeTrait";
import { SimpleRunner } from "@/engine/animation/SimpleRunner";
import { AnimProps } from "@/engine/AnimProps";
import { Animation, AnimationState } from "@/engine/Animation";
import { IniSection } from "@/data/IniSection";
import { AlphaRenderable } from "@/engine/renderable/AlphaRenderable";
import * as THREE from "three";
export class Terrain {
    private gameObject: any;
    private terrainLayer: any;
    private imageFinder: ImageFinder;
    private palette: any;
    private camera: any;
    private lighting: any;
    private debugFrame: any;
    private gameSpeed: any;
    private useSpriteBatching: boolean;
    private objectArt: any;
    private label: string;
    private tiberiumTreeTrait?: any;
    private withPosition: WithPosition;
    private extraLight: THREE.Vector3;
    private target?: THREE.Object3D;
    private mainObj?: ShpRenderable;
    private animationRunner?: SimpleRunner;
    private lastTiberiumSpawnStatus?: any;
    constructor(gameObject: any, terrainLayer: any, imageFinder: ImageFinder, palette: any, camera: any, lighting: any, debugFrame: any, gameSpeed: any, useSpriteBatching: boolean) {
        this.gameObject = gameObject;
        this.terrainLayer = terrainLayer;
        this.imageFinder = imageFinder;
        this.palette = palette;
        this.camera = camera;
        this.lighting = lighting;
        this.debugFrame = debugFrame;
        this.gameSpeed = gameSpeed;
        this.useSpriteBatching = useSpriteBatching;
        this.objectArt = gameObject.art;
        this.label = "terrain_" + gameObject.rules.name;
        this.init();
    }
    private init(): void {
        this.tiberiumTreeTrait = this.gameObject.traits.find(TiberiumTreeTrait);
        this.withPosition = new WithPosition();
        this.extraLight = new THREE.Vector3();
        this.updateLighting();
    }
    private updateLighting(): void {
        this.extraLight
            .copy(this.lighting.compute(this.objectArt.lightingType, this.gameObject.tile))
            .addScalar(-1);
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
        }
    }
    public setPosition(pos: THREE.Vector3): void {
        this.withPosition.setPosition(pos.x, pos.y, pos.z);
    }
    public getPosition(): THREE.Vector3 {
        return this.withPosition.getPosition();
    }
    public update(delta: number): void {
        if (this.tiberiumTreeTrait) {
            const status = this.tiberiumTreeTrait.status;
            if (status !== this.lastTiberiumSpawnStatus && status === SpawnStatus.Spawning) {
                this.lastTiberiumSpawnStatus = status;
                this.animationRunner?.animation.reset();
            }
            if (this.animationRunner) {
                this.animationRunner.tick(delta);
                if (this.animationRunner.animation.getState() !== AnimationState.STOPPED) {
                    this.mainObj?.setFrame(this.animationRunner.getCurrentFrame());
                }
                else {
                    this.mainObj?.setFrame(0);
                }
            }
        }
    }
    private createObjects(parent: THREE.Object3D): void {
        const size = { width: 1, height: 1 };
        if (this.debugFrame.value) {
            const wireframe = DebugUtils.createWireframe(size, 2);
            parent.add(wireframe);
        }
        let image;
        try {
            image = this.imageFinder.findByObjectArt(this.objectArt);
        }
        catch (e) {
            if (e instanceof ImageFinder.MissingImageError) {
                console.warn(e.message);
                return;
            }
            throw e;
        }
        const alphaImage = this.gameObject.rules.alphaImage;
        if (alphaImage) {
            const alphaTexture = this.imageFinder.tryFind(alphaImage, false);
            if (alphaTexture) {
                const alphaRenderable = new AlphaRenderable(alphaTexture, this.camera, this.objectArt.getDrawOffset());
                alphaRenderable.create3DObject();
                parent.add(alphaRenderable.get3DObject());
            }
            else {
                console.warn(`<${this.gameObject.name}>: Alpha image "${alphaImage}" not found`);
            }
        }
        if (this.terrainLayer?.shouldBeBatched(this.gameObject)) {
            this.terrainLayer.addObject(this.gameObject);
        }
        else {
            const obj = new THREE.Object3D();
            obj.matrixAutoUpdate = false;
            const translation = new MapSpriteTranslation(size.width, size.height);
            const { spriteOffset, anchorPointWorld } = translation.compute();
            obj.position.x = anchorPointWorld.x;
            obj.position.z = anchorPointWorld.y;
            obj.updateMatrix();
            const offset = spriteOffset.clone().add(this.objectArt.getDrawOffset());
            const shpRenderable = ShpRenderable.factory(image, this.palette, this.camera, offset, this.objectArt.hasShadow);
            shpRenderable.setBatched(this.useSpriteBatching);
            if (this.useSpriteBatching) {
                shpRenderable.setBatchPalettes([this.palette]);
            }
            shpRenderable.setFrame(0);
            shpRenderable.setExtraLight(this.extraLight);
            shpRenderable.create3DObject();
            obj.add(shpRenderable.get3DObject());
            this.mainObj = shpRenderable;
            if (this.tiberiumTreeTrait) {
                const iniSection = new IniSection("dummy");
                if (this.gameObject.rules.animationRate) {
                    iniSection.set("Rate", "" + 60 * this.gameObject.rules.animationRate);
                    iniSection.set("Shadow", "yes");
                }
                const animProps = new AnimProps(iniSection, image);
                const animation = new Animation(animProps, this.gameSpeed);
                this.animationRunner = new SimpleRunner();
                this.animationRunner.animation = animation;
                animation.stop();
            }
            parent.add(obj);
        }
    }
    public onRemove(): void {
        if (this.terrainLayer?.hasObject(this.gameObject)) {
            this.terrainLayer.removeObject(this.gameObject);
        }
    }
    public dispose(): void {
        this.mainObj?.dispose();
    }
}
