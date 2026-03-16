import { Coords } from '../Coords';
import { EventDispatcher } from '../../util/event';
import { rampHeights } from '@/game/theater/rampHeights';
import { Vector3 } from '../math/Vector3';
import { Vector2 } from '../math/Vector2';
import { roundToDecimals } from '../../util/math';
interface Tile {
    rx: number;
    ry: number;
    z: number;
    rampType: number;
    onBridgeLandType?: boolean;
}
interface Tiles {
    getByMapCoords(rx: number, ry: number): Tile | undefined;
    getPlaceholderTile(rx: number, ry: number): Tile;
}
interface TileOccupation {
    getBridgeOnTile(tile: Tile): any;
}
interface PositionChangeEvent {
    tileChanged: boolean;
}
export class ObjectPosition {
    private tiles: Tiles;
    private tileOccupation: TileOccupation;
    private _worldPosition: Vector3;
    private _tile?: Tile;
    private _tileOffset: Vector2;
    private _centerOffset: Vector2;
    private desiredSubCell: number;
    private _tileElevation?: number;
    private _absoluteElevation?: number;
    private _computedTileElevation?: number;
    private _onPositionChange: EventDispatcher<ObjectPosition, PositionChangeEvent>;
    constructor(tiles: Tiles, tileOccupation: TileOccupation) {
        this.tiles = tiles;
        this.tileOccupation = tileOccupation;
        this._worldPosition = new Vector3();
        this._tileOffset = new Vector2();
        this._centerOffset = new Vector2();
        this.desiredSubCell = 0;
        this._tileElevation = 0;
        this._onPositionChange = new EventDispatcher<ObjectPosition, PositionChangeEvent>();
    }
    get onPositionChange() {
        return this._onPositionChange.asEvent();
    }
    get worldPosition(): Vector3 {
        return this._worldPosition;
    }
    get tile(): Tile | undefined {
        return this._tile;
    }
    set tile(tile: Tile | undefined) {
        const tileChanged = !!this._tile && tile !== this._tile;
        this._tile = tile;
        if (tile) {
            this.updateWorldPosition(tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged });
        }
    }
    get tileElevation(): number {
        if (this._tileElevation === undefined) {
            if (this._computedTileElevation === undefined) {
                this._computedTileElevation = this.computeTileElevationFromWorldPos();
            }
            return this._computedTileElevation;
        }
        return this._tileElevation;
    }
    set tileElevation(elevation: number) {
        this._absoluteElevation = undefined;
        this._tileElevation = elevation;
        if (this._tile) {
            this.updateWorldPosition(this._tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged: false });
        }
    }
    get subCell(): number {
        if (!this._tileOffset.x && !this._tileOffset.y)
            return 0;
        const signX = Math.sign(this._tileOffset.x / Coords.LEPTONS_PER_TILE - 0.5);
        const signY = Math.sign(this._tileOffset.y / Coords.LEPTONS_PER_TILE - 0.5);
        return signX && signY ? signY + 1 + (signX + 1) / 2 + 1 : 0;
    }
    set subCell(subCell: number) {
        this._tileOffset = this.computeSubCellOffset(subCell);
        this.desiredSubCell = subCell;
        if (this._tile) {
            this.updateWorldPosition(this._tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged: false });
        }
    }
    getTileOffset(): Vector2 {
        return this._tileOffset.clone();
    }
    setTileOffset(offset: Vector2): void {
        this._tileOffset.copy(offset);
        if (this._tile) {
            this.updateWorldPosition(this._tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged: false });
        }
    }
    setCenterOffset(offset: Vector2): void {
        this._centerOffset.copy(offset);
        if (this._tile) {
            this.updateWorldPosition(this._tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged: false });
        }
    }
    getMapPosition(): Vector2 | undefined {
        if (this._tile) {
            return new Vector2(this._tile.rx * Coords.LEPTONS_PER_TILE + this._tileOffset.x + this._centerOffset.x, this._tile.ry * Coords.LEPTONS_PER_TILE + this._tileOffset.y + this._centerOffset.y);
        }
    }
    getBridgeBelow(): any {
        return this._tile?.onBridgeLandType
            ? this.tileOccupation.getBridgeOnTile(this._tile)
            : undefined;
    }
    moveToTileCell(tile: Tile, subCell: number = 0): void {
        if (!this._tile)
            throw new Error("Tile is not set");
        const tileChanged = tile !== this._tile;
        this._tile = tile;
        this._tileOffset = this.computeSubCellOffset(subCell);
        this.desiredSubCell = subCell;
        this.updateWorldPosition(tile, this._tileOffset);
        this._onPositionChange.dispatch(this, { tileChanged });
    }
    moveToTileCoords(x: number, y: number, allowPlaceholder: boolean = false): void {
        const rx = Math.floor(x);
        const ry = Math.floor(y);
        const tileChanged = !this._tile || this._tile.rx !== rx || this._tile.ry !== ry;
        if (tileChanged) {
            let tile = this.tiles.getByMapCoords(rx, ry);
            if (!tile) {
                if (!allowPlaceholder) {
                    throw new RangeError(`Attempted move to a non-existent tile: [${rx},${ry}]`);
                }
                tile = this.tiles.getPlaceholderTile(rx, ry);
            }
            this._tile = tile;
        }
        this._tileOffset.set((x - rx) * Coords.LEPTONS_PER_TILE, (y - ry) * Coords.LEPTONS_PER_TILE);
        this.updateWorldPosition(this._tile!, this._tileOffset);
        this._onPositionChange.dispatch(this, { tileChanged });
    }
    moveToLeptons(leptons: Vector2, allowPlaceholder: boolean = false): void {
        this.moveToTileCoords(leptons.x / Coords.LEPTONS_PER_TILE, leptons.y / Coords.LEPTONS_PER_TILE, allowPlaceholder);
    }
    moveByLeptons(deltaX: number, deltaY: number, allowPlaceholder: boolean = false): void {
        if (!this._tile)
            throw new Error("Tile is not set");
        this.moveToTileCoords(this._tile.rx + (this._tileOffset.x + deltaX) / Coords.LEPTONS_PER_TILE, this._tile.ry + (this._tileOffset.y + deltaY) / Coords.LEPTONS_PER_TILE, allowPlaceholder);
    }
    moveByLeptons3(delta: Vector3, allowPlaceholder: boolean = false): void {
        const currentY = this._worldPosition.y;
        this.moveByLeptons(delta.x, delta.z, allowPlaceholder);
        this.setAbsoluteElevationWorld(currentY + delta.y);
    }
    setAbsoluteElevationWorld(elevation: number): void {
        this._absoluteElevation = elevation;
        this._tileElevation = undefined;
        if (this._tile) {
            this.updateWorldPosition(this._tile, this._tileOffset);
            this._onPositionChange.dispatch(this, { tileChanged: false });
        }
    }
    computeSubCellOffset(subCell: number): Vector2 {
        let offset = { width: 0, height: 0 };
        if (subCell) {
            const signX = ((subCell - 1) % 2) * 2 - 1;
            const signY = 2 * Math.floor((subCell - 1) / 2) - 1;
            offset = {
                width: (signX * Coords.LEPTONS_PER_TILE) / 4,
                height: (signY * Coords.LEPTONS_PER_TILE) / 4
            };
        }
        const half = Coords.LEPTONS_PER_TILE / 2;
        return new Vector2(half + offset.width, half + offset.height);
    }
    interpolateRampHeight(x: number, y: number, rampType: number): number {
        const heights = rampHeights[rampType];
        const h1 = heights[1];
        const h0 = heights[0];
        return (h1 * (1 - x) * (1 - y) +
            heights[2] * x * (1 - y) +
            h0 * (1 - x) * y +
            heights[3] * x * y);
    }
    updateWorldPosition(tile: Tile, offset: Vector2): void {
        const x = offset.x + this._centerOffset.x;
        const y = offset.y + this._centerOffset.y;
        const normalizedX = x / Coords.LEPTONS_PER_TILE;
        const normalizedY = y / Coords.LEPTONS_PER_TILE;
        let worldY: number;
        if (this._tileElevation !== undefined) {
            let rampHeight = 0;
            if (tile.rampType !== 0) {
                rampHeight = this.interpolateRampHeight(normalizedX, normalizedY, tile.rampType);
            }
            worldY = Coords.tileHeightToWorld(tile.z + rampHeight + this._tileElevation);
        }
        else {
            worldY = this._absoluteElevation!;
        }
        this._worldPosition.set(tile.rx * Coords.LEPTONS_PER_TILE + x, worldY, tile.ry * Coords.LEPTONS_PER_TILE + y);
        if (this._tileElevation === undefined) {
            this._computedTileElevation = this.computeTileElevationFromWorldPos();
        }
    }
    computeTileElevationFromWorldPos(): number {
        if (!this._tile)
            return 0;
        const tileHeight = roundToDecimals(Coords.worldToTileHeight(this._worldPosition.y), 14);
        const normalizedX = (this._tileOffset.x + this._centerOffset.x) / Coords.LEPTONS_PER_TILE;
        const normalizedY = (this._tileOffset.y + this._centerOffset.y) / Coords.LEPTONS_PER_TILE;
        let rampHeight = 0;
        if (this._tile.rampType !== 0) {
            rampHeight = this.interpolateRampHeight(normalizedX, normalizedY, this._tile.rampType);
        }
        return tileHeight - this._tile.z - rampHeight;
    }
    clone(): ObjectPosition {
        const cloned = new ObjectPosition(this.tiles, this.tileOccupation);
        cloned._worldPosition = this._worldPosition.clone();
        cloned._tile = this._tile;
        cloned._tileOffset = this._tileOffset.clone();
        cloned._centerOffset = this._centerOffset.clone();
        cloned._tileElevation = this._tileElevation;
        cloned._absoluteElevation = this._absoluteElevation;
        cloned._computedTileElevation = this._computedTileElevation;
        return cloned;
    }
}
