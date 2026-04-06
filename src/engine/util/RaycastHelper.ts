import * as THREE from 'three';
import { isPerformanceFeatureEnabled, measurePerformanceFeature } from '@/performance/PerformanceRuntime';
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
    private raycaster?: THREE.Raycaster;
    private normalizedPointer?: Point;
    constructor(scene: Scene) {
        this.scene = scene;
    }
    intersect(point: Point, targets: THREE.Object3D[], recursive: boolean = false): THREE.Intersection[] {
        return measurePerformanceFeature('raycastHelperReuse', () => isPerformanceFeatureEnabled('raycastHelperReuse')
            ? this.intersectOptimized(point, targets, recursive)
            : this.intersectLegacy(point, targets, recursive));
    }
    private intersectLegacy(point: Point, targets: THREE.Object3D[], recursive: boolean): THREE.Intersection[] {
        const raycaster = new THREE.Raycaster();
        const normalizedPointer = this.normalizePointerLegacy(point, this.scene.viewport);
        raycaster.setFromCamera(normalizedPointer as any, this.scene.camera);
        return raycaster.intersectObjects(targets, recursive);
    }
    private intersectOptimized(point: Point, targets: THREE.Object3D[], recursive: boolean): THREE.Intersection[] {
        const raycaster = this.raycaster ?? (this.raycaster = new THREE.Raycaster());
        const normalizedPointer = this.normalizePointerOptimized(point, this.scene.viewport);
        raycaster.setFromCamera(normalizedPointer as any, this.scene.camera);
        return raycaster.intersectObjects(targets, recursive);
    }
    private normalizePointerLegacy(point: Point, viewport: Viewport): Point {
        return {
            x: ((point.x - viewport.x) / viewport.width) * 2 - 1,
            y: 2 * -((point.y - viewport.y) / viewport.height) + 1,
        };
    }
    private normalizePointerOptimized(point: Point, viewport: Viewport): Point {
        const target = this.normalizedPointer ?? (this.normalizedPointer = { x: 0, y: 0 });
        target.x = ((point.x - viewport.x) / viewport.width) * 2 - 1;
        target.y = 2 * -((point.y - viewport.y) / viewport.height) + 1;
        return target;
    }
}
