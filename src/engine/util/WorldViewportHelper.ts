import * as THREE from 'three';
import { IsoCoords } from '../IsoCoords';
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
    constructor(scene: Scene) {
        this.scene = scene;
    }
    distanceToViewport(worldPosition: Point3D): number {
        const viewport = this.scene.viewport;
        const viewportBox = new THREE.Box2(new THREE.Vector2(viewport.x, viewport.y), new THREE.Vector2(viewport.x + viewport.width - 1, viewport.y + viewport.height - 1));
        return this.distanceToScreenBox(worldPosition, viewportBox);
    }
    distanceToScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): number {
        return screenBox.distanceToPoint(this.getScreenPosition(worldPosition));
    }
    distanceToViewportCenter(worldPosition: Point3D): THREE.Vector2 {
        const viewport = this.scene.viewport;
        const viewportCenter = new THREE.Vector2(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
        return this.getScreenPosition(worldPosition).sub(viewportCenter);
    }
    intersectsScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): boolean {
        return this.distanceToScreenBox(worldPosition, screenBox) === 0;
    }
    private getScreenPosition(worldPosition: Point3D): THREE.Vector2 {
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
}
