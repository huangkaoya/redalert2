import { Palette } from "@/data/Palette";
import { ShpBuilder } from "@/engine/renderable/builder/ShpBuilder";
import { Coords } from "@/game/Coords";
import { IsoCoords } from "@/engine/IsoCoords";
import { MAGIC_OFFSET } from "@/engine/renderable/entity/map/MapSurface";
import * as THREE from "three";
export class ShadowRenderable {
    private static shadowPalette: Palette;
    private shpFile: any;
    private camera: any;
    private shadowHeightTileAdjust: number;
    private baseFrameNo: number;
    private frameOffset: number;
    private visible: boolean;
    private useBatching: boolean;
    private drawOffset: {
        x: number;
        y: number;
    };
    private builder?: ShpBuilder;
    private object3d?: THREE.Object3D;
    private shpSize?: number;
    static getOrCreateShadowPalette(): Palette {
        let palette = ShadowRenderable.shadowPalette;
        if (!palette) {
            palette = new Palette(new Array(768).fill(0));
            ShadowRenderable.shadowPalette = palette;
        }
        return palette;
    }
    constructor(shpFile: any, camera: any, drawOffset: {
        x: number;
        y: number;
    }, shadowHeightTileAdjust: number = 0) {
        this.shpFile = shpFile;
        this.camera = camera;
        this.shadowHeightTileAdjust = shadowHeightTileAdjust;
        this.baseFrameNo = 0;
        this.frameOffset = 0;
        this.visible = true;
        this.useBatching = false;
        this.drawOffset = { ...drawOffset };
    }
    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.object3d) {
            const frameNo = this.computeShadowFrameNo(this.baseFrameNo);
            this.object3d.visible = visible && this.frameHasShadowData(frameNo);
        }
    }
    setSize(size: number): void {
        this.shpSize = size;
        this.builder?.setSize(size);
    }
    setBatched(batched: boolean): void {
        this.useBatching = batched;
        this.builder?.setBatched(batched);
    }
    setBaseFrame(frameNo: number): void {
        this.baseFrameNo = frameNo;
        if (this.builder) {
            const shadowFrameNo = this.computeShadowFrameNo(frameNo);
            this.builder.setFrame(shadowFrameNo);
            this.object3d!.visible = this.visible && this.frameHasShadowData(shadowFrameNo);
        }
    }
    setFrameOffset(offset: number): void {
        this.frameOffset = offset;
        this.builder?.setFrameOffset(offset);
    }
    computeShadowFrameNo(frameNo: number): number {
        return frameNo < this.shpFile.numImages ? this.shpFile.numImages / 2 + frameNo : 1;
    }
    create3DObject(): void {
        if (!this.object3d) {
            const palette = ShadowRenderable.getOrCreateShadowPalette();
            const builder = new ShpBuilder(this.shpFile, palette, this.camera, Coords.ISO_WORLD_SCALE);
            if (this.shpSize) {
                builder.setSize(this.shpSize);
            }
            builder.setFrameOffset(this.frameOffset);
            builder.setBatched(this.useBatching);
            if (this.useBatching) {
                builder.setBatchPalettes([palette]);
            }
            builder.flat = true;
            const shadowFrameNo = this.computeShadowFrameNo(this.baseFrameNo);
            builder.setFrame(shadowFrameNo);
            if (this.shadowHeightTileAdjust) {
                const heightAdjust = IsoCoords.tileHeightToScreen(this.shadowHeightTileAdjust);
                this.drawOffset.y += -heightAdjust;
            }
            builder.setOffset(this.drawOffset);
            builder.setOpacity(0.5);
            const object = builder.build();
            if (this.shadowHeightTileAdjust) {
                object.position.y += Coords.tileHeightToWorld(-this.shadowHeightTileAdjust);
                object.updateMatrix();
            }
            object.visible = this.visible && this.frameHasShadowData(shadowFrameNo);
            object.position.y += MAGIC_OFFSET / 5;
            object.updateMatrix();
            this.builder = builder;
            this.object3d = object;
        }
    }
    frameHasShadowData(frameNo: number): boolean {
        return !!this.shpFile.getImage(this.frameOffset + frameNo).imageData.length;
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.object3d;
    }
    update(delta: number): void { }
    dispose(): void {
        this.builder?.dispose();
    }
}
