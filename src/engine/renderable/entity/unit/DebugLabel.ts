import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { CanvasUtils } from "@/engine/gfx/CanvasUtils";
import { Coords } from "@/game/Coords";
import * as THREE from "three";
export class DebugLabel {
    private mesh?: THREE.Mesh;
    private texture?: THREE.Texture;
    constructor(private text: string, private color: string, private camera: THREE.Camera) { }
    get3DObject(): THREE.Mesh | undefined {
        return this.mesh;
    }
    create3DObject(): void {
        if (!this.mesh) {
            const color = new THREE.Color(this.color);
            const outlineColor = 0.5 < 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
                ? "black"
                : "white";
            this.texture = this.createTexture(this.text, "#" + color.getHexString(), outlineColor);
            this.mesh = this.createMesh(this.texture);
        }
    }
    private createMesh(texture: THREE.Texture): THREE.Mesh {
        const geometry = SpriteUtils.createSpriteGeometry({
            texture,
            camera: this.camera,
            align: { x: 0, y: -1 },
            offset: { x: 0, y: Coords.ISO_TILE_SIZE / 4 },
            scale: Coords.ISO_WORLD_SCALE,
        });
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            depthTest: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        return mesh;
    }
    private createTexture(text: string, color: string, outlineColor: string): THREE.Texture {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 0;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Failed to get canvas context");
        let y = 0;
        for (const line of text.split("\n")) {
            const metrics = CanvasUtils.drawText(ctx, line, 0, y, {
                color,
                outlineColor,
                outlineWidth: 2,
                fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
                fontSize: 10,
                fontWeight: "400",
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 3,
                paddingRight: 3,
                autoEnlargeCanvas: true,
            });
            y += metrics.height;
        }
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        canvas.width += 1;
        canvas.height += 1;
        ctx.putImageData(imageData, 1, 1);
        const texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        texture.flipY = false;
        return texture;
    }
    update(): void { }
    dispose(): void {
        this.texture?.dispose();
        if (Array.isArray(this.mesh?.material)) {
            this.mesh.material.forEach((material) => material.dispose());
        }
        else {
            this.mesh?.material?.dispose();
        }
        this.mesh?.geometry.dispose();
    }
}
