import * as THREE from 'three';
import { SpriteUtils } from '../../gfx/SpriteUtils';
import { CanvasTextureAtlas } from './CanvasTextureAtlas';
export class CanvasSpriteBuilder {
    private static textureCache = new Map<HTMLImageElement[], CanvasTextureAtlas>();
    private images: HTMLImageElement[];
    private camera: THREE.Camera;
    private offset: {
        x: number;
        y: number;
    };
    private align: {
        x: number;
        y: number;
    };
    private opacity: number;
    private forceTransparent: boolean;
    private frustumCulled: boolean;
    private frameGeometries: Map<number, THREE.BufferGeometry>;
    private frameNo: number;
    private atlas?: CanvasTextureAtlas;
    private mesh?: THREE.Mesh;
    static clearCaches(): void {
        CanvasSpriteBuilder.textureCache.clear();
    }
    constructor(images: HTMLImageElement[], camera: THREE.Camera) {
        this.images = images;
        this.camera = camera;
        this.offset = { x: 0, y: 0 };
        this.align = { x: 0, y: 0 };
        this.opacity = 1;
        this.forceTransparent = false;
        this.frustumCulled = false;
        this.frameGeometries = new Map();
        this.frameNo = 0;
        this.setFrame(0);
    }
    setOffset(offset: {
        x: number;
        y: number;
    }): void {
        this.offset = offset;
    }
    setAlign(x: number, y: number): void {
        this.align = { x: x, y: y };
        if (this.mesh) {
            this.frameGeometries.get(this.frameNo)?.dispose();
            const geometry = SpriteUtils.createSpriteGeometry(this.getSpriteGeometryOptions());
            this.frameGeometries.set(this.frameNo, geometry);
            this.mesh.geometry = geometry;
        }
    }
    private initTexture(): void {
        if (CanvasSpriteBuilder.textureCache.has(this.images)) {
            this.atlas = CanvasSpriteBuilder.textureCache.get(this.images)!;
        }
        else {
            let atlas = new CanvasTextureAtlas();
            atlas.pack(this.images);
            CanvasSpriteBuilder.textureCache.set(this.images, atlas);
            this.atlas = atlas;
        }
    }
    private getSpriteGeometryOptions() {
        const image = this.images[this.frameNo];
        const offset = {
            x: -image.width / 2 - this.align.x * (image.width / 2) + this.offset.x,
            y: -image.height / 2 - this.align.y * (image.height / 2) + this.offset.y,
        };
        return {
            texture: this.atlas!.getTexture(),
            textureArea: this.atlas!.getImageRect(image),
            align: { x: 1, y: -1 },
            offset: offset,
            camera: this.camera,
        };
    }
    setFrame(frameNo: number): void {
        if (this.frameNo !== frameNo) {
            this.frameNo = frameNo;
            if (this.mesh) {
                let geometry = this.frameGeometries.get(frameNo);
                if (!geometry) {
                    geometry = SpriteUtils.createSpriteGeometry(this.getSpriteGeometryOptions());
                    this.frameGeometries.set(frameNo, geometry);
                }
                this.mesh.geometry = geometry;
            }
        }
    }
    getFrame(): number {
        return this.frameNo;
    }
    getSize(): {
        width: number;
        height: number;
    } {
        return {
            width: this.images[this.frameNo].width,
            height: this.images[this.frameNo].height,
        };
    }
    get frameCount(): number {
        return this.images.length;
    }
    setOpacity(opacity: number): void {
        const oldOpacity = this.opacity;
        if (oldOpacity !== opacity) {
            this.opacity = opacity;
            if (this.mesh) {
                (this.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
            }
            if (Math.floor(oldOpacity) === Math.floor(opacity) || this.forceTransparent) {
            }
            else {
                this.updateTransparency();
            }
        }
    }
    setForceTransparent(forceTransparent: boolean): void {
        if (this.forceTransparent !== forceTransparent) {
            this.forceTransparent = forceTransparent;
            this.updateTransparency();
        }
    }
    private updateTransparency(): void {
        if (this.mesh) {
            (this.mesh.material as THREE.MeshBasicMaterial).transparent =
                this.forceTransparent || this.opacity < 1;
        }
    }
    setExtraLight(extraLight: any): void {
        throw new Error("Not implemented");
    }
    setFrustumCulled(frustumCulled: boolean): void {
        this.frustumCulled = frustumCulled;
        if (this.mesh) {
            this.mesh.frustumCulled = frustumCulled;
        }
    }
    build(): THREE.Mesh {
        if (this.mesh) {
            return this.mesh;
        }
        this.initTexture();
        const geometry = SpriteUtils.createSpriteGeometry(this.getSpriteGeometryOptions());
        this.frameGeometries.set(this.frameNo, geometry);
        const material = new THREE.MeshBasicMaterial({
            map: this.atlas!.getTexture(),
            opacity: this.opacity,
            transparent: this.opacity < 1 || this.forceTransparent,
        });
        let mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = this.frustumCulled;
        this.mesh = mesh;
        return mesh;
    }
    dispose(): void {
        this.frameGeometries.forEach((geometry) => geometry.dispose());
        if (this.mesh?.material) {
            (this.mesh.material as THREE.MeshBasicMaterial).dispose();
        }
    }
}
