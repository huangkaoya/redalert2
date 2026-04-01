import * as THREE from 'three';
interface Point {
    x: number;
    y: number;
}
interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface Scene {
    viewport: Viewport;
    camera: THREE.Camera;
}
export class RaycastHelper {
    private scene: Scene;
    constructor(scene: Scene) {
        this.scene = scene;
    }
    intersect(point: Point, targets: THREE.Object3D[], recursive: boolean = false): THREE.Intersection[] {
        const raycaster = new THREE.Raycaster();
        const normalizedPointer = this.normalizePointer(point, this.scene.viewport);
        raycaster.setFromCamera(normalizedPointer as any, this.scene.camera);
        return raycaster.intersectObjects(targets, recursive);
    }
    private normalizePointer(point: Point, viewport: Viewport): Point {
        return {
            x: ((point.x - viewport.x) / viewport.width) * 2 - 1,
            y: 2 * -((point.y - viewport.y) / viewport.height) + 1,
        };
    }
}
