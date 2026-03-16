import { Coords } from '@/game/Coords';
import { IndexedBitmap } from '@/data/Bitmap';
import * as THREE from 'three';
export class DebugUtils {
    static createWireframe(size: {
        width: number;
        height: number;
    }, height: number): THREE.Mesh {
        return new THREE.Mesh(this.createBoxGeometry(size, height), new THREE.MeshBasicMaterial({ wireframe: true }));
    }
    static createBoxGeometry(size: {
        width: number;
        height: number;
    }, height: number, center: boolean = false): THREE.BoxGeometry {
        const tileSize = Coords.getWorldTileSize();
        const width = size.width * tileSize;
        const depth = size.height * tileSize;
        const boxHeight = Coords.tileHeightToWorld(height);
        const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
        if (center) {
            geometry.translate(0, boxHeight / 2, 0);
        }
        else {
            geometry.translate(width / 2, boxHeight / 2, depth / 2);
        }
        return geometry;
    }
    static createIndexedCheckerTex(color1: number, color2: number): THREE.DataTexture {
        const bitmap = new IndexedBitmap(64, 64, new Uint8Array(4096).fill(color1));
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                bitmap.data[x + 64 * y] = color2;
                bitmap.data[x + 32 + 64 * (y + 32)] = color2;
            }
        }
        const texture = new THREE.DataTexture(bitmap.data, 64, 64, THREE.RedFormat);
        texture.needsUpdate = true;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        (texture as THREE.Texture & {
            colorSpace: THREE.ColorSpace;
        }).colorSpace = THREE.NoColorSpace;
        return texture;
    }
}
