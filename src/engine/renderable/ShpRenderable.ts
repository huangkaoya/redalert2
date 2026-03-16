import { ShpBuilder } from "./builder/ShpBuilder";
import { ShadowRenderable } from "./ShadowRenderable";
import { Coords } from "@/game/Coords";
import * as THREE from "three";
export class ShpRenderable {
    private builder: ShpBuilder;
    private shadowRenderable?: ShadowRenderable;
    private zShapeFixBuilder?: ShpBuilder;
    private target?: THREE.Object3D;
    private shapeMesh?: THREE.Object3D;
    private shadowMesh?: THREE.Object3D;
    static factory(shpFile: any, palette: any, camera: any, drawOffset: {
        x: number;
        y: number;
    }, hasShadow: boolean = false, shadowHeightTileAdjust: number = 0, useBatching: boolean = false, frameOffset: number = 0, hasZShapeFix: boolean = false): ShpRenderable {
        const shadowRenderable = hasShadow
            ? new ShadowRenderable(shpFile, camera, drawOffset, shadowHeightTileAdjust)
            : undefined;
        const isoWorldScale = Coords.ISO_WORLD_SCALE;
        let builder = new ShpBuilder(shpFile, palette, camera, isoWorldScale, useBatching, frameOffset);
        builder.setOffset(drawOffset);
        let zShapeFixBuilder: ShpBuilder | undefined;
        if (hasZShapeFix) {
            zShapeFixBuilder = new ShpBuilder(shpFile, palette, camera, isoWorldScale, useBatching, frameOffset);
            zShapeFixBuilder.setOffset(drawOffset);
            zShapeFixBuilder.flat = true;
        }
        return new ShpRenderable(builder, shadowRenderable, zShapeFixBuilder);
    }
    constructor(builder: ShpBuilder, shadowRenderable?: ShadowRenderable, zShapeFixBuilder?: ShpBuilder) {
        this.builder = builder;
        this.shadowRenderable = shadowRenderable;
        this.zShapeFixBuilder = zShapeFixBuilder;
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    setBatched(batched: boolean): void {
        this.builder.setBatched(batched);
        this.zShapeFixBuilder?.setBatched(batched);
        this.shadowRenderable?.setBatched(batched);
    }
    setBatchPalettes(palettes: any[]): void {
        this.builder.setBatchPalettes(palettes);
        this.zShapeFixBuilder?.setBatchPalettes(palettes);
    }
    setSize(size: number): void {
        this.builder.setSize(size);
        this.zShapeFixBuilder?.setSize(size);
        this.shadowRenderable?.setSize(size);
    }
    getFlat(): boolean {
        return this.builder.flat;
    }
    setFlat(flat: boolean): void {
        this.builder.flat = flat;
    }
    setFrame(frame: number): void {
        if (this.builder.getFrame() !== frame) {
            this.builder.setFrame(frame);
            this.zShapeFixBuilder?.setFrame(frame);
            this.shadowRenderable?.setBaseFrame(frame);
        }
    }
    setFrameOffset(offset: number): void {
        this.builder.setFrameOffset(offset);
        this.zShapeFixBuilder?.setFrameOffset(offset);
        this.shadowRenderable?.setFrameOffset(offset);
    }
    setPalette(palette: any): void {
        this.builder.setPalette(palette);
        this.zShapeFixBuilder?.setPalette(palette);
    }
    setExtraLight(light: any): void {
        this.builder.setExtraLight(light);
        this.zShapeFixBuilder?.setExtraLight(light);
    }
    setOpacity(opacity: number): void {
        this.builder.setOpacity(opacity);
        this.zShapeFixBuilder?.setOpacity(opacity);
    }
    setForceTransparent(transparent: boolean): void {
        this.builder.setForceTransparent(transparent);
        this.zShapeFixBuilder?.setForceTransparent(transparent);
    }
    get frameCount(): number {
        return this.shadowRenderable
            ? this.builder.frameCount / 2
            : this.builder.frameCount;
    }
    getShapeMesh(): THREE.Object3D | undefined {
        return this.shapeMesh;
    }
    getShadowMesh(): THREE.Object3D | undefined {
        return this.shadowMesh;
    }
    setShadowVisible(visible: boolean): void {
        this.shadowRenderable?.setVisible(visible);
    }
    create3DObject(): void {
        if (!this.target) {
            this.shapeMesh = this.builder.build();
            if (this.shadowRenderable || this.zShapeFixBuilder) {
                const container = new THREE.Object3D();
                container.matrixAutoUpdate = false;
                container.add(this.shapeMesh);
                if (this.shadowRenderable) {
                    this.shadowRenderable.create3DObject();
                    this.shadowMesh = this.shadowRenderable.get3DObject();
                    container.add(this.shadowMesh);
                }
                if (this.zShapeFixBuilder) {
                    const zShapeFixMesh = this.zShapeFixBuilder.build();
                    container.add(zShapeFixMesh);
                }
                this.target = container;
            }
            else {
                this.target = this.shapeMesh;
            }
        }
    }
    update(delta: number): void { }
    dispose(): void {
        this.builder.dispose();
        this.zShapeFixBuilder?.dispose();
        this.shadowRenderable?.dispose();
    }
}
