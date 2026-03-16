import * as THREE from 'three';
import { rectContainsPoint } from '../../util/geometry';
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
interface Scene {
    viewport: Viewport;
}
interface Position {
    worldPosition: Point3D;
}
interface GameObject {
    position: Position;
    isUnit(): boolean;
    isBuilding(): boolean;
    isDestroyed: boolean;
    isCrashing: boolean;
    id?: string | number;
}
interface Renderable {
    gameObject: GameObject;
    getIntersectTarget?(): THREE.Object3D | THREE.Object3D[] | undefined;
}
interface RenderableContainer {
    get3DObject(): THREE.Object3D | undefined;
}
interface RenderableManager {
    getRenderableContainer(): RenderableContainer | undefined;
    getRenderableById(id: string): Renderable;
    getRenderableByGameObject(gameObject: GameObject): Renderable;
}
interface MapTile {
    rx: number;
    ry: number;
    z: number;
}
interface MapTileIntersectHelper {
    getTileAtScreenPoint(point: Point): MapTile | undefined;
}
interface GameMap {
    getObjectsOnTile(tile: MapTile): GameObject[];
}
interface RaycastHelper {
    intersect(point: Point, targets: THREE.Object3D[], recursive: boolean): THREE.Intersection[];
}
interface WorldViewportHelper {
    intersectsScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): boolean;
}
interface IntersectionResult {
    renderable: Renderable;
    point: THREE.Vector3;
}
export class EntityIntersectHelper {
    private map: GameMap;
    private renderableManager: RenderableManager;
    private mapTileIntersectHelper: MapTileIntersectHelper;
    private raycastHelper: RaycastHelper;
    private scene: Scene;
    private worldViewportHelper: WorldViewportHelper;
    constructor(map: GameMap, renderableManager: RenderableManager, mapTileIntersectHelper: MapTileIntersectHelper, raycastHelper: RaycastHelper, scene: Scene, worldViewportHelper: WorldViewportHelper) {
        this.map = map;
        this.renderableManager = renderableManager;
        this.mapTileIntersectHelper = mapTileIntersectHelper;
        this.raycastHelper = raycastHelper;
        this.scene = scene;
        this.worldViewportHelper = worldViewportHelper;
    }
    getEntitiesAtScreenBox(screenBox: THREE.Box2): Renderable[] {
        const container = this.renderableManager.getRenderableContainer();
        if (!container)
            return [];
        const intersectTargets = this.collectIntersectTargets(container.get3DObject());
        const renderableSet = new Set<Renderable>();
        intersectTargets.forEach(target => {
            const renderableId = this.findRenderableId(target);
            const renderable = this.renderableManager.getRenderableById(renderableId);
            renderableSet.add(renderable);
        });
        return [...renderableSet].filter(renderable => this.worldViewportHelper.intersectsScreenBox(renderable.gameObject.position.worldPosition, screenBox));
    }
    getEntityAtScreenPoint(screenPoint: Point): IntersectionResult | undefined {
        const viewport = this.scene.viewport;
        if (!rectContainsPoint(viewport, screenPoint)) {
            return undefined;
        }
        const container = this.renderableManager.getRenderableContainer();
        const tile = this.mapTileIntersectHelper.getTileAtScreenPoint(screenPoint);
        const buildingOnTile = this.getBuildingRenderableOnTile(tile);
        if (!container) {
            return buildingOnTile
                ? {
                    renderable: buildingOnTile,
                    point: this.createFallbackPoint(buildingOnTile),
                }
                : undefined;
        }
        const intersectTargets = this.collectIntersectTargets(container.get3DObject());
        const intersections = this.raycastHelper.intersect(screenPoint, intersectTargets, false);
        if (intersections.length === 0) {
            return buildingOnTile
                ? {
                    renderable: buildingOnTile,
                    point: this.createFallbackPoint(buildingOnTile),
                }
                : undefined;
        }
        const renderableIntersections = intersections.map(intersection => ({
            renderable: this.renderableManager.getRenderableById(this.findRenderableId(intersection.object)),
            point: intersection.point
        }));
        const unitResult = renderableIntersections.find(result => result.renderable.gameObject.isUnit());
        if (unitResult)
            return unitResult;
        if (buildingOnTile) {
            const tileBuildingResult = renderableIntersections.find((result) => result.renderable.gameObject === buildingOnTile.gameObject);
            return {
                renderable: buildingOnTile,
                point: tileBuildingResult?.point ?? this.createFallbackPoint(buildingOnTile),
            };
        }
        const buildingResult = renderableIntersections.find(result => result.renderable.gameObject.isBuilding() &&
            result.renderable.getIntersectTarget?.());
        return buildingResult ?? renderableIntersections[0];
    }
    private getBuildingRenderableOnTile(tile: MapTile | undefined): Renderable | undefined {
        if (!tile) {
            return undefined;
        }
        const building = this.map.getObjectsOnTile(tile).find((obj) => {
            if (!obj.isBuilding() || obj.isDestroyed || obj.isCrashing) {
                return false;
            }
            const renderable = this.renderableManager.getRenderableByGameObject(obj);
            return Boolean(renderable);
        });
        return building ? this.renderableManager.getRenderableByGameObject(building) : undefined;
    }
    private createFallbackPoint(renderable: Renderable): THREE.Vector3 {
        const { worldPosition } = renderable.gameObject.position;
        return new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z);
    }
    private collectIntersectTargets(object3d: THREE.Object3D | undefined): THREE.Object3D[] {
        const targets: THREE.Object3D[] = [];
        if (!object3d || !object3d.visible)
            return targets;
        if (object3d.userData.id !== undefined) {
            const renderable = this.renderableManager.getRenderableById(object3d.userData.id);
            if (!renderable) {
                throw new Error(`Entity not found (id = "${object3d.userData.id}")`);
            }
            if (!renderable.gameObject.isDestroyed && !renderable.gameObject.isCrashing) {
                const intersectTarget = renderable.getIntersectTarget?.();
                if (intersectTarget) {
                    if (Array.isArray(intersectTarget)) {
                        targets.push(...intersectTarget);
                    }
                    else {
                        targets.push(intersectTarget);
                    }
                }
            }
        }
        object3d.children.forEach(child => {
            if (child.visible) {
                targets.push(...this.collectIntersectTargets(child));
            }
        });
        return targets;
    }
    private findRenderableId(object3d: THREE.Object3D): string {
        let currentObject: THREE.Object3D | null = object3d;
        let id: string | undefined;
        while (currentObject && currentObject.parent) {
            id = currentObject.userData.id;
            if (id !== undefined)
                break;
            currentObject = currentObject.parent;
        }
        if (id === undefined) {
            throw new Error('No attached renderable ID found for Object3D.');
        }
        return id;
    }
}
