import { ShpBuilder } from "@/engine/renderable/builder/ShpBuilder";
import { WithPosition } from "@/engine/renderable/WithPosition";
import { ImageFinder } from "@/engine/ImageFinder";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { MapSpriteTranslation } from "@/engine/renderable/MapSpriteTranslation";
import { Coords } from "@/game/Coords";
import * as THREE from "three";
export class Smudge {
    private gameObject: any;
    private imageFinder: ImageFinder;
    private palette: any;
    private camera: any;
    private lighting: any;
    private debugFrame: any;
    private mapSmudgeLayer: any;
    private objectArt: any;
    private label: string;
    private withPosition: WithPosition;
    private extraLight: THREE.Vector3;
    private target?: THREE.Object3D;
    private builder?: ShpBuilder;
    constructor(gameObject: any, imageFinder: ImageFinder, palette: any, camera: any, lighting: any, debugFrame: any, mapSmudgeLayer: any) {
        this.gameObject = gameObject;
        this.imageFinder = imageFinder;
        this.palette = palette;
        this.camera = camera;
        this.lighting = lighting;
        this.debugFrame = debugFrame;
        this.mapSmudgeLayer = mapSmudgeLayer;
        this.objectArt = gameObject.art;
        this.label = "smudge_" + gameObject.name;
        this.init();
    }
    private init(): void {
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
    public update(delta: number): void { }
    public setPosition(pos: THREE.Vector3): void {
        this.withPosition.setPosition(pos.x, pos.y, pos.z);
    }
    public getPosition(): THREE.Vector3 {
        return this.withPosition.getPosition();
    }
    private createObjects(parent: THREE.Object3D): void {
        const size = { width: 1, height: 1 };
        const container = new THREE.Object3D();
        container.matrixAutoUpdate = false;
        if (this.debugFrame.value) {
            const wireframe = DebugUtils.createWireframe(size, 0);
            parent.add(wireframe);
        }
        if (this.mapSmudgeLayer?.shouldBeBatched(this.gameObject)) {
            this.mapSmudgeLayer.addObject(this.gameObject);
        }
        else {
            try {
                const image = this.imageFinder.findByObjectArt(this.objectArt);
                const translation = new MapSpriteTranslation(size.width, size.height);
                const { spriteOffset, anchorPointWorld } = translation.compute();
                const offset = spriteOffset.clone().add(this.objectArt.getDrawOffset());
                this.builder = new ShpBuilder(image, this.palette, this.camera, Coords.ISO_WORLD_SCALE);
                this.builder.setOffset(offset);
                this.builder.flat = this.objectArt.flat;
                this.builder.setExtraLight(this.extraLight);
                const mesh = this.builder.build();
                container.add(mesh);
                container.position.x = anchorPointWorld.x;
                container.position.z = anchorPointWorld.y;
                container.updateMatrix();
                parent.add(container);
            }
            catch (error) {
                if (error instanceof ImageFinder.MissingImageError) {
                    console.warn(error.message);
                    return;
                }
                throw error;
            }
        }
    }
    public onRemove(): void {
        if (this.mapSmudgeLayer?.hasObject(this.gameObject)) {
            this.mapSmudgeLayer.removeObject(this.gameObject);
        }
    }
    public dispose(): void {
        this.builder?.dispose();
    }
}
