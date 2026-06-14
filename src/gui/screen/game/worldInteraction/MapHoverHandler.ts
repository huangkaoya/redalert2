import * as THREE from 'three';
import { EventDispatcher } from '@/util/event';
import { Coords } from '@/game/Coords';
export class MapHoverHandler {
    // High-bridge decks are drawn offset UP by their tileElevation (≈4 cells), so the
    // screen point of the deck is well above the tile's z=0 projection. The pick has to
    // reach that far: the candidate radius must exceed the elevation (so the deck is even
    // collected from the z=0 projection of the railing), and the accept distance must
    // span the deck sprite's vertical extent — otherwise the railing/upper edge over open
    // water can't be clicked.
    private static readonly BRIDGE_PICK_RADIUS = 6;
    private static readonly MAX_BRIDGE_PICK_DISTANCE = 72;
    private readonly _onHoverChange = new EventDispatcher<any, any>();
    private isActive = false;
    private needsUpdate = false;
    private lastUpdate?: number;
    private lastPointerPos?: {
        x: number;
        y: number;
    };
    private currentHoverEntity?: any;
    private currentHoverTile?: any;
    private currentHoverGroundTile?: any;
    private currentHoverBridgeTile?: any;
    constructor(private readonly entityIntersectHelper: any, private readonly mapTileIntersectHelper: any, private readonly map: any, private shroud: any, private readonly renderer: any) { }
    get onHoverChange() {
        return this._onHoverChange.asEvent();
    }
    getCurrentHover(): any {
        if (!this.currentHoverTile) {
            return undefined;
        }
        if (this.currentHoverEntity?.gameObject?.isDestroyed || this.currentHoverEntity?.gameObject?.isCrashing) {
            return {
                entity: undefined,
                gameObject: undefined,
                tile: this.currentHoverTile,
                groundTile: this.currentHoverGroundTile,
                bridgeTile: this.currentHoverBridgeTile,
            };
        }
        return {
            entity: this.currentHoverEntity,
            gameObject: this.currentHoverEntity?.gameObject,
            tile: this.currentHoverTile,
            groundTile: this.currentHoverGroundTile,
            bridgeTile: this.currentHoverBridgeTile,
        };
    }
    setShroud(shroud: any): void {
        this.shroud = shroud;
    }
    update(pointer: {
        x: number;
        y: number;
    }, immediate: boolean = false): void {
        this.lastPointerPos = pointer;
        if (immediate) {
            this.doUpdate();
            return;
        }
        if (!this.isActive) {
            this.isActive = true;
            this.needsUpdate = true;
            this.renderer.onFrame.subscribe(this.onFrame);
        }
        else {
            this.needsUpdate = true;
        }
    }
    // When the pointer is moving (needsUpdate), re-test every frame for snappy
    // hover. When it is stationary we still re-test periodically so the hover
    // tracks units moving under the cursor, but at a much lower rate — a full
    // scene raycast + tile hit-test every frame (~15Hz) is wasteful at idle,
    // especially in a shroud-free observer/replay view where the target set is
    // the whole map. 5Hz keeps idle hover correct at ~1/3 the cost.
    private static readonly IDLE_REFRESH_MS = 1000 / 5;
    private readonly onFrame = (time: number): void => {
        if (!this.isActive) {
            return;
        }
        if (!this.needsUpdate &&
            this.lastUpdate !== undefined &&
            time - this.lastUpdate < MapHoverHandler.IDLE_REFRESH_MS) {
            return;
        }
        this.needsUpdate = false;
        this.lastUpdate = time;
        this.doUpdate();
    };
    private doUpdate(): void {
        if (!this.lastPointerPos) {
            return;
        }
        const previousEntity = this.currentHoverEntity;
        const previousTile = this.currentHoverTile;
        const previousGroundTile = this.currentHoverGroundTile;
        const previousBridgeTile = this.currentHoverBridgeTile;
        const groundTile = this.mapTileIntersectHelper.getTileAtScreenPoint(this.lastPointerPos);
        const bridgeTile = this.getHighBridgeTileAtScreenPoint(this.lastPointerPos);
        this.currentHoverGroundTile = groundTile;
        this.currentHoverBridgeTile = bridgeTile;
        const intersection = this.entityIntersectHelper.getEntityAtScreenPoint(this.lastPointerPos);
        if (intersection) {
            this.currentHoverEntity = intersection.renderable;
            let tile: any;
            const gameObject = intersection.renderable.gameObject;
            const foundation = gameObject.getFoundation?.();
            if (gameObject.isOverlay?.() && gameObject.isBridge?.()) {
                tile = this.getBridgeTileAtScreenPoint(this.lastPointerPos, gameObject) ??
                    (gameObject.isHighBridge?.() ? bridgeTile : undefined) ??
                    gameObject.tile;
                if (gameObject.isHighBridge?.()) {
                    this.currentHoverBridgeTile = tile;
                }
            }
            else if (gameObject.isBuilding?.() && foundation && (foundation.width > 1 || foundation.height > 1)) {
                tile = groundTile;
            }
            else if (gameObject.isTechno?.() && !gameObject.art?.isVoxel) {
                tile = gameObject.tile;
            }
            else {
                const mapCoords = new THREE.Vector2(intersection.point.x, intersection.point.z)
                    .multiplyScalar(1 / Coords.LEPTONS_PER_TILE)
                    .floor();
                tile = this.map.tiles.getByMapCoords(mapCoords.x, mapCoords.y);
                if (!tile) {
                    console.warn(`[MapHoverHandler] No tile exists at rx,ry=${JSON.stringify(mapCoords)}. Falling back to object tile.`);
                }
                tile = tile ?? gameObject.tile;
            }
            const bridge = this.map.tileOccupation.getBridgeOnTile(tile);
            if (this.currentHoverEntity.gameObject.isOverlay?.() && this.currentHoverEntity.gameObject.isBridge?.() && !bridge) {
                this.currentHoverEntity = undefined;
            }
            this.currentHoverTile = tile;
        }
        else {
            this.currentHoverEntity = undefined;
            this.currentHoverTile = groundTile ?? bridgeTile;
        }
        if (this.shroud &&
            this.currentHoverTile &&
            this.shroud.isShrouded(this.currentHoverTile, this.currentHoverEntity?.gameObject?.tileElevation) &&
            !(this.currentHoverEntity?.gameObject?.isOverlay?.() && this.currentHoverEntity?.gameObject?.isBridge?.())) {
            this.currentHoverEntity = undefined;
        }
        if (this.currentHoverEntity === previousEntity &&
            this.currentHoverTile === previousTile &&
            this.currentHoverGroundTile === previousGroundTile &&
            this.currentHoverBridgeTile === previousBridgeTile) {
            return;
        }
        previousEntity?.selectionModel?.setHover(false);
        this.currentHoverEntity?.selectionModel?.setHover(true);
        if (this.currentHoverTile) {
            this._onHoverChange.dispatch(this, {
                entity: this.currentHoverEntity,
                gameObject: this.currentHoverEntity?.gameObject,
                tile: this.currentHoverTile,
                groundTile: this.currentHoverGroundTile,
                bridgeTile: this.currentHoverBridgeTile,
            });
        }
    }
    finish(): void {
        this.currentHoverEntity?.selectionModel?.setHover(false);
        this.currentHoverEntity = undefined;
        this.currentHoverTile = undefined;
        this.currentHoverGroundTile = undefined;
        this.currentHoverBridgeTile = undefined;
        if (this.isActive) {
            this.renderer.onFrame.unsubscribe(this.onFrame);
            this.isActive = false;
            this.needsUpdate = false;
        }
    }
    dispose(): void {
        this.finish();
    }
    private getHighBridgeTileAtScreenPoint(pointer: {
        x: number;
        y: number;
    }): any | undefined {
        const result = this.pickClosestBridgeTileByScreenPoint(this.collectHighBridgeCandidates(pointer), pointer);
        return result && result.distance <= MapHoverHandler.MAX_BRIDGE_PICK_DISTANCE
            ? result.tile
            : undefined;
    }
    private getBridgeTileAtScreenPoint(pointer: { x: number; y: number }, bridgeObject: any): any | undefined {
        const occupiedTiles = this.map.tileOccupation.calculateTilesForGameObject?.(bridgeObject.tile, bridgeObject) ?? [];
        return this.pickClosestBridgeTileByScreenPoint(occupiedTiles, pointer, bridgeObject)?.tile;
    }
    private collectHighBridgeCandidates(pointer: { x: number; y: number }): any[] {
        const candidates: any[] = [];
        const seen = new Set<string>();
        const addTile = (tile: any): void => {
            if (!tile) {
                return;
            }
            const bridge = this.map.tileOccupation.getBridgeOnTile(tile);
            if (!bridge?.isHighBridge?.()) {
                return;
            }
            const key = `${tile.rx},${tile.ry}`;
            if (!seen.has(key)) {
                seen.add(key);
                candidates.push(tile);
            }
        };
        const addNearbyTiles = (tile: any, radius: number): void => {
            if (!tile) {
                return;
            }
            for (let dx = -radius; dx <= radius; dx += 1) {
                for (let dy = -radius; dy <= radius; dy += 1) {
                    addTile(this.map.tiles.getByMapCoords(tile.rx + dx, tile.ry + dy));
                }
            }
        };
        // Sample the cursor across the deck sprite's vertical span (z=0 up to the deck
        // elevation) so the deck is collected wherever it is visually drawn.
        for (const elevation of [4, 3, 2, 1]) {
            for (const tile of this.mapTileIntersectHelper.intersectTilesByScreenPos(pointer, elevation)) {
                addNearbyTiles(tile, MapHoverHandler.BRIDGE_PICK_RADIUS);
            }
        }
        for (const tile of this.mapTileIntersectHelper.intersectTilesByScreenPos(pointer)) {
            addNearbyTiles(tile, MapHoverHandler.BRIDGE_PICK_RADIUS);
        }
        addNearbyTiles(this.mapTileIntersectHelper.getTileAtScreenPoint(pointer), MapHoverHandler.BRIDGE_PICK_RADIUS);
        return candidates;
    }
    private pickClosestBridgeTileByScreenPoint(tiles: any[], pointer: { x: number; y: number }, bridgeObject?: any): { tile: any; distance: number } | undefined {
        let closestTile: any;
        let closestDistance = Number.POSITIVE_INFINITY;
        const seen = new Set<string>();
        for (const tile of tiles) {
            if (!tile) {
                continue;
            }
            const key = `${tile.rx},${tile.ry}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            const bridge = this.map.tileOccupation.getBridgeOnTile(tile);
            if (!bridge || (bridgeObject && bridge !== bridgeObject)) {
                continue;
            }
            const screenPoint = this.mapTileIntersectHelper.getTileCenterScreenPoint?.(tile, bridge.tileElevation ?? 0);
            const distance = screenPoint
                ? Math.hypot(pointer.x - screenPoint.x, pointer.y - screenPoint.y)
                : 0;
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTile = tile;
            }
        }
        if (!closestTile) {
            return undefined;
        }
        return { tile: closestTile, distance: closestDistance };
    }
}
