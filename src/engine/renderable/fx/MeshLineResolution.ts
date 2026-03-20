import * as THREE from 'three';
import { Coords } from '@/game/Coords';
interface MeshLineCamera extends THREE.Camera {
    top?: number;
    right?: number;
    rotation: THREE.Euler;
    userData: THREE.Object3D['userData'] & {
        meshLineResolution?: {
            width: number;
            height: number;
        };
    };
}
export function setMeshLineViewportResolution(camera: MeshLineCamera, width: number, height: number): void {
    camera.userData.meshLineResolution = { width, height };
}
export function getMeshLineResolution(camera: MeshLineCamera): THREE.Vector2 {
    const viewportResolution = camera.userData.meshLineResolution;
    if (viewportResolution?.width && viewportResolution?.height) {
        return new THREE.Vector2(viewportResolution.width, viewportResolution.height);
    }
    const top = camera.top ?? 1;
    const right = camera.right ?? top;
    const aspectRatio = right / top;
    const height = (2 * top) / Math.cos(camera.rotation.y);
    return new THREE.Vector2(height * aspectRatio, height)
        .multiplyScalar((top * Math.cos(camera.rotation.x)) / Coords.ISO_WORLD_SCALE);
}
