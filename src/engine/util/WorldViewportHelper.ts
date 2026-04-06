import * as THREE from 'three';
import { IsoCoords } from '../IsoCoords';
import { isPerformanceFeatureEnabled, measurePerformanceFeature } from '@/performance/PerformanceRuntime';
interface Point {
    x: number;
    y: number;
}
interface Point3D extends Point {
    z: number;
}
interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface CameraPan {
    getPan(): Point;
}
interface Scene {
    viewport: Viewport;
    cameraPan: CameraPan;
    camera?: THREE.Camera;
}
export class WorldViewportHelper {
    private scene: Scene;
    private viewportBox?: THREE.Box2;
    private screenPoint?: THREE.Vector2;
    private viewportCenter?: THREE.Vector2;
    private projectedWorld?: THREE.Vector3;
    constructor(scene: Scene) {
        this.scene = scene;
    }
    distanceToViewport(worldPosition: Point3D): number {
        return measurePerformanceFeature('worldViewportCache', () => isPerformanceFeatureEnabled('worldViewportCache')
            ? this.distanceToViewportOptimized(worldPosition)
            : this.distanceToViewportLegacy(worldPosition));
    }
    distanceToScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): number {
        return measurePerformanceFeature('worldViewportCache', () => isPerformanceFeatureEnabled('worldViewportCache')
            ? this.distanceToScreenBoxOptimized(worldPosition, screenBox)
            : this.distanceToScreenBoxLegacy(worldPosition, screenBox));
    }
    distanceToViewportCenter(worldPosition: Point3D): THREE.Vector2 {
        return measurePerformanceFeature('worldViewportCache', () => isPerformanceFeatureEnabled('worldViewportCache')
            ? this.distanceToViewportCenterOptimized(worldPosition)
            : this.distanceToViewportCenterLegacy(worldPosition));
    }
    intersectsScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): boolean {
        return this.distanceToScreenBox(worldPosition, screenBox) === 0;
    }
    private distanceToViewportLegacy(worldPosition: Point3D): number {
        const viewport = this.scene.viewport;
        const viewportBox = new THREE.Box2(new THREE.Vector2(viewport.x, viewport.y), new THREE.Vector2(viewport.x + viewport.width - 1, viewport.y + viewport.height - 1));
        return this.distanceToScreenBoxLegacy(worldPosition, viewportBox);
    }
    private distanceToViewportOptimized(worldPosition: Point3D): number {
        const viewport = this.scene.viewport;
        const viewportBox = this.viewportBox ?? (this.viewportBox = new THREE.Box2(new THREE.Vector2(), new THREE.Vector2()));
        viewportBox.min.set(viewport.x, viewport.y);
        viewportBox.max.set(viewport.x + viewport.width - 1, viewport.y + viewport.height - 1);
        return this.distanceToScreenBoxOptimized(worldPosition, viewportBox);
    }
    private distanceToScreenBoxLegacy(worldPosition: Point3D, screenBox: THREE.Box2): number {
        return screenBox.distanceToPoint(this.getScreenPositionLegacy(worldPosition));
    }
    private distanceToScreenBoxOptimized(worldPosition: Point3D, screenBox: THREE.Box2): number {
        return screenBox.distanceToPoint(this.getScreenPositionOptimized(worldPosition, this.screenPoint ?? (this.screenPoint = new THREE.Vector2())));
    }
    private distanceToViewportCenterLegacy(worldPosition: Point3D): THREE.Vector2 {
        const viewport = this.scene.viewport;
        const viewportCenter = new THREE.Vector2(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
        return this.getScreenPositionLegacy(worldPosition).sub(viewportCenter);
    }
    private distanceToViewportCenterOptimized(worldPosition: Point3D): THREE.Vector2 {
        const viewport = this.scene.viewport;
        const viewportCenter = this.viewportCenter ?? (this.viewportCenter = new THREE.Vector2());
        viewportCenter.set(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
        return this.getScreenPositionOptimized(worldPosition, this.screenPoint ?? (this.screenPoint = new THREE.Vector2())).sub(viewportCenter);
    }
    private getScreenPositionLegacy(worldPosition: Point3D): THREE.Vector2 {
        const viewport = this.scene.viewport;
        const camera = this.scene.camera;
        if (camera) {
            const projected = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z).project(camera);
            if (Number.isFinite(projected.x) && Number.isFinite(projected.y) && Number.isFinite(projected.z)) {
                return new THREE.Vector2(viewport.x + ((projected.x + 1) / 2) * viewport.width, viewport.y + ((1 - projected.y) / 2) * viewport.height);
            }
        }
        const screenPos = IsoCoords.vecWorldToScreen(worldPosition);
        const origin = IsoCoords.worldToScreen(0, 0);
        const pan = this.scene.cameraPan.getPan();
        return new THREE.Vector2(screenPos.x - origin.x - pan.x + viewport.x + viewport.width / 2, screenPos.y - origin.y - pan.y + viewport.y + viewport.height / 2);
    }
    private getScreenPositionOptimized(worldPosition: Point3D, target: THREE.Vector2): THREE.Vector2 {
        const viewport = this.scene.viewport;
        const camera = this.scene.camera;
        if (camera) {
            const projected = this.projectedWorld ?? (this.projectedWorld = new THREE.Vector3());
            projected.set(worldPosition.x, worldPosition.y, worldPosition.z).project(camera);
            if (Number.isFinite(projected.x) && Number.isFinite(projected.y) && Number.isFinite(projected.z)) {
                target.set(viewport.x + ((projected.x + 1) / 2) * viewport.width, viewport.y + ((1 - projected.y) / 2) * viewport.height);
                return target;
            }
        }
        const screenPos = IsoCoords.vecWorldToScreen(worldPosition);
        const origin = IsoCoords.worldToScreen(0, 0);
        const pan = this.scene.cameraPan.getPan();
        target.set(screenPos.x - origin.x - pan.x + viewport.x + viewport.width / 2, screenPos.y - origin.y - pan.y + viewport.y + viewport.height / 2);
        return target;
    }
}
