import { Palette } from "@/data/Palette";
import { ShpBuilder } from "@/engine/renderable/builder/ShpBuilder";
import { Color } from "@/util/Color";
import { Coords } from "@/game/Coords";
import * as THREE from "three";
export class AlphaRenderable {
    private static alphaPalette?: Palette;
    private shpFile: any;
    private camera: THREE.Camera;
    private visible: boolean;
    private drawOffset: any;
    private shpSize?: number;
    private builder?: ShpBuilder;
    private object3d?: THREE.Object3D;
    static getOrCreateAlphaPalette(): Palette {
        let palette = AlphaRenderable.alphaPalette;
        if (!palette) {
            palette = new Palette(new Array(768).fill(0));
            const colors: Color[] = [];
            for (let i = 0; i < 256; i++) {
                const value = i > 127 ? 2 * (i - 127) : 0;
                colors.push(new Color(value, value, value));
            }
            palette.setColors(colors);
            AlphaRenderable.alphaPalette = palette;
        }
        return palette;
    }
    constructor(shpFile: any, camera: THREE.Camera, drawOffset: any) {
        this.shpFile = shpFile;
        this.camera = camera;
        this.visible = true;
        this.drawOffset = { ...drawOffset };
    }
    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.object3d) {
            this.object3d.visible = visible;
        }
    }
    setSize(size: number): void {
        this.shpSize = size;
        this.builder?.setSize(size);
    }
    create3DObject(): void {
        if (!this.object3d) {
            const palette = AlphaRenderable.getOrCreateAlphaPalette();
            const builder = new ShpBuilder(this.shpFile, palette, this.camera, Coords.ISO_WORLD_SCALE);
            if (this.shpSize) {
                builder.setSize(this.shpSize);
            }
            builder.setFrame(0);
            builder.setOffset(this.drawOffset);
            const object = builder.build();
            object.visible = this.visible;
            object.renderOrder = 999995;
            const material = object.material as THREE.Material;
            material.depthTest = false;
            material.depthWrite = true;
            material.transparent = true;
            material.blending = THREE.CustomBlending;
            material.blendEquation = THREE.AddEquation;
            material.blendSrc = THREE.DstColorFactor;
            material.blendDst = THREE.OneFactor;
            this.builder = builder;
            this.object3d = object;
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.object3d;
    }
    update(delta: number): void { }
    dispose(): void {
        this.builder?.dispose();
    }
}
