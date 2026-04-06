import * as THREE from 'three';
import { rectContainsPoint } from '../../util/geometry';
import { Coords } from '../../game/Coords';
import { IsoCoords } from '../IsoCoords';
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
interface CameraPan {
    getPan(): Point;
}
interface Scene {
    viewport: Viewport;
    cameraPan: CameraPan;
}
interface MapTile {
    rx: number;
    ry: number;
    z: number;
}
interface TileManager {
    getByMapCoords(x: number, y: number): MapTile | undefined;
}
interface GameMap {
    tiles: TileManager;
}
export class MapTileIntersectHelper {
    private map: GameMap;
    private scene: Scene;
    private intersectTriangle?: THREE.Triangle;
    private intersectPoint?: THREE.Vector3;
    private intersectedTilesScratch: MapTile[] = [];
    constructor(map: GameMap, scene: Scene) {
        this.map = map;
        this.scene = scene;
    }
    getTileAtScreenPoint(screenPoint: Point): MapTile | undefined {
        const viewport = this.scene.viewport;
        if (rectContainsPoint(viewport, screenPoint)) {
            const intersectedTiles = this.intersectTilesByScreenPos(screenPoint);
            return intersectedTiles.length > 0 ? intersectedTiles[0] : undefined;
        }
        return undefined;
    }
    intersectTilesByScreenPos(screenPoint: Point): MapTile[] {
        return measurePerformanceFeature('mapTileHitTest', () => isPerformanceFeatureEnabled('mapTileHitTest')
            ? this.intersectTilesByScreenPosOptimized(screenPoint)
            : this.intersectTilesByScreenPosLegacy(screenPoint));
    }
    private intersectTilesByScreenPosLegacy(screenPoint: Point): MapTile[] {
        const origin = IsoCoords.worldToScreen(0, 0);
        const pan = this.scene.cameraPan.getPan();
        const worldScreenPos = {
            x: screenPoint.x + origin.x + pan.x - this.scene.viewport.width / 2,
            y: screenPoint.y + origin.y + pan.y - this.scene.viewport.height / 2
        };
        const worldPos = IsoCoords.screenToWorld(worldScreenPos.x, worldScreenPos.y);
        const tileCoords = new THREE.Vector2(worldPos.x, worldPos.y)
            .multiplyScalar(1 / Coords.LEPTONS_PER_TILE)
            .floor();
        const centerTile = this.map.tiles.getByMapCoords(tileCoords.x, tileCoords.y);
        if (!centerTile) {
            console.warn(`Tile coordinates (${tileCoords.x},${tileCoords.y}) out of range`);
            return [];
        }
        const candidateTiles: MapTile[] = [];
        for (let offset = 0; offset < 30; offset++) {
            const testCoords = [
                { x: centerTile.rx + offset, y: centerTile.ry + offset },
                { x: centerTile.rx + offset + 1, y: centerTile.ry + offset },
                { x: centerTile.rx + offset, y: centerTile.ry + offset + 1 }
            ];
            for (const coord of testCoords) {
                const tile = this.map.tiles.getByMapCoords(coord.x, coord.y);
                if (tile) {
                    candidateTiles.push(tile);
                }
            }
        }
        const intersectedTiles: MapTile[] = [];
        const triangle = new THREE.Triangle();
        const testPoint = new THREE.Vector3(worldScreenPos.x, 0, worldScreenPos.y);
        for (const tile of candidateTiles) {
            const corner1 = IsoCoords.tile3dToScreen(tile.rx, tile.ry, tile.z);
            const corner2 = IsoCoords.tile3dToScreen(tile.rx, tile.ry + 1.1, tile.z);
            const corner3 = IsoCoords.tile3dToScreen(tile.rx + 1.1, tile.ry, tile.z);
            const corner4 = IsoCoords.tile3dToScreen(tile.rx + 1.1, tile.ry + 1.1, tile.z);
            triangle.a.set(corner1.x, 0, corner1.y);
            triangle.b.set(corner2.x, 0, corner2.y);
            triangle.c.set(corner3.x, 0, corner3.y);
            const intersects1 = triangle.containsPoint(testPoint);
            triangle.a.set(corner4.x, 0, corner4.y);
            triangle.b.set(corner2.x, 0, corner2.y);
            triangle.c.set(corner3.x, 0, corner3.y);
            const intersects2 = triangle.containsPoint(testPoint);
            if (intersects1 || intersects2) {
                intersectedTiles.unshift(tile);
            }
        }
        if (intersectedTiles.length === 0) {
            return this.intersectTilesByScreenPosLegacy({
                x: screenPoint.x,
                y: screenPoint.y - IsoCoords.tileHeightToScreen(1)
            });
        }
        return intersectedTiles;
    }
    private intersectTilesByScreenPosOptimized(screenPoint: Point): MapTile[] {
        const triangle = this.intersectTriangle ?? (this.intersectTriangle = new THREE.Triangle());
        const testPoint = this.intersectPoint ?? (this.intersectPoint = new THREE.Vector3());
        const intersectedTiles = this.intersectedTilesScratch;
        const origin = IsoCoords.worldToScreen(0, 0);
        const pan = this.scene.cameraPan.getPan();
        const fallbackOffsetY = IsoCoords.tileHeightToScreen(1);
        let currentY = screenPoint.y;
        for (let attempt = 0; attempt < 4; attempt += 1) {
            intersectedTiles.length = 0;
            const worldScreenX = screenPoint.x + origin.x + pan.x - this.scene.viewport.width / 2;
            const worldScreenY = currentY + origin.y + pan.y - this.scene.viewport.height / 2;
            const worldPos = IsoCoords.screenToWorld(worldScreenX, worldScreenY);
            const tileX = Math.floor(worldPos.x / Coords.LEPTONS_PER_TILE);
            const tileY = Math.floor(worldPos.y / Coords.LEPTONS_PER_TILE);
            const centerTile = this.map.tiles.getByMapCoords(tileX, tileY);
            if (!centerTile) {
                console.warn(`Tile coordinates (${tileX},${tileY}) out of range`);
                return [];
            }
            testPoint.set(worldScreenX, 0, worldScreenY);
            for (let offset = 0; offset < 30; offset += 1) {
                const testCoords = [
                    { x: centerTile.rx + offset, y: centerTile.ry + offset },
                    { x: centerTile.rx + offset + 1, y: centerTile.ry + offset },
                    { x: centerTile.rx + offset, y: centerTile.ry + offset + 1 }
                ];
                for (const coord of testCoords) {
                    const tile = this.map.tiles.getByMapCoords(coord.x, coord.y);
                    if (!tile) {
                        continue;
                    }
                    const corner1 = IsoCoords.tile3dToScreen(tile.rx, tile.ry, tile.z);
                    const corner2 = IsoCoords.tile3dToScreen(tile.rx, tile.ry + 1.1, tile.z);
                    const corner3 = IsoCoords.tile3dToScreen(tile.rx + 1.1, tile.ry, tile.z);
                    const corner4 = IsoCoords.tile3dToScreen(tile.rx + 1.1, tile.ry + 1.1, tile.z);
                    triangle.a.set(corner1.x, 0, corner1.y);
                    triangle.b.set(corner2.x, 0, corner2.y);
                    triangle.c.set(corner3.x, 0, corner3.y);
                    const intersects1 = triangle.containsPoint(testPoint);
                    triangle.a.set(corner4.x, 0, corner4.y);
                    triangle.b.set(corner2.x, 0, corner2.y);
                    triangle.c.set(corner3.x, 0, corner3.y);
                    const intersects2 = triangle.containsPoint(testPoint);
                    if (intersects1 || intersects2) {
                        intersectedTiles.unshift(tile);
                    }
                }
            }
            if (intersectedTiles.length > 0) {
                return [...intersectedTiles];
            }
            currentY -= fallbackOffsetY;
        }
        return [];
    }
}
