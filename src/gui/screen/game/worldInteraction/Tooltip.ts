import { UiObject } from '@/gui/UiObject';
import { SpriteUtils } from '@/engine/gfx/SpriteUtils';
import { CanvasUtils } from '@/engine/gfx/CanvasUtils';
import * as THREE from 'three';
export class Tooltip extends UiObject {
    private texture?: THREE.Texture;
    private mesh?: THREE.Mesh;
    constructor(private readonly text: string, private readonly color: string, private readonly pointer: any, private readonly viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }) {
        super(new THREE.Object3D());
    }
    override create3DObject(): void {
        if (!this.mesh) {
            const root = this.get3DObject();
            if (!root) {
                throw new Error('Tooltip root object was not created');
            }
            const texture = (this.texture = this.createTexture(this.text, this.color));
            const size = {
                width: texture.image.width,
                height: texture.image.height,
            };
            const mesh = (this.mesh = this.createMesh(texture, size.width, size.height));
            const position = this.computePosition(this.pointer, this.viewport, size);
            mesh.position.x = position.x;
            mesh.position.y = position.y;
            root.add(mesh);
            mesh.updateMatrix();
        }
        super.create3DObject();
    }
    private createMesh(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
        geometry.translate(width / 2, height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        return mesh;
    }
    private createTexture(text: string, color: string): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 0;
        canvas.height = 0;
        const alphaContext = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
        if (!alphaContext) {
            throw new Error('Failed to create tooltip alpha canvas context');
        }
        let y = 0;
        for (const line of text.split('\n')) {
            const rect = CanvasUtils.drawText(alphaContext, line, 0, y, {
                color,
                fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
                fontSize: 12,
                fontWeight: '500',
                paddingTop: 5,
                paddingBottom: 5,
                paddingLeft: 2,
                paddingRight: 4,
                autoEnlargeCanvas: true,
            });
            y += rect.height;
        }
        const width = canvas.width;
        const height = canvas.height;
        const imageData = alphaContext.getImageData(0, 0, width, height);
        canvas.width = width + 1;
        canvas.height = height + 1;
        const context = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
        if (!context) {
            throw new Error('Failed to create tooltip canvas context');
        }
        context.putImageData(imageData, 1, 1);
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = color;
        context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
        const texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        texture.flipY = false;
        return texture;
    }
    private computePosition(pointer: any, viewport: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, size: {
        width: number;
        height: number;
    }): {
        x: number;
        y: number;
    } {
        const position = { ...pointer.getPosition() };
        if (position.x + 20 + size.width > viewport.x + viewport.width) {
            position.x -= 20 + size.width;
        }
        else {
            position.x += 20;
        }
        if (position.y + 20 + size.height > viewport.y + viewport.height) {
            position.y -= 20 + size.height;
        }
        else {
            position.y += 20;
        }
        return position;
    }
    override destroy(): void {
        super.destroy();
        this.texture?.dispose();
        if (this.mesh) {
            (this.mesh.material as THREE.Material).dispose();
            this.mesh.geometry.dispose();
        }
    }
}
