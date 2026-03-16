import { rectContainsPoint, rectClampPoint, rectContainsRect, rectEquals } from '@/util/geometry';
import { Coords } from '@/game/Coords';
import { EventDispatcher } from '@/util/event';
interface Size {
    width: number;
    height: number;
}
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface Point {
    x: number;
    y: number;
    z?: number;
}
interface Tile {
    dx: number;
    dy: number;
    z: number;
}
interface MapFile {
    fullSize: Size;
    localSize: Rect;
}
interface MapRules {
    getCutoffTileHeight(): number;
}
export class MapBounds {
    private mapCutoffHeight: number;
    private mapBuildableSize: Rect;
    private localSize: Rect;
    private fullSize: Size;
    private clampedFullSize: Rect;
    private rawLocalSize: Rect;
    private _onLocalResize: EventDispatcher<MapBounds>;
    constructor() {
        this.mapCutoffHeight = 0;
        this.mapBuildableSize = { x: 0, y: 0, width: 0, height: 0 };
        this.localSize = { x: 0, y: 0, width: 0, height: 0 };
        this.fullSize = { width: 0, height: 0 };
        this.clampedFullSize = { x: 0, y: 0, width: 0, height: 0 };
        this.rawLocalSize = { x: 0, y: 0, width: 0, height: 0 };
        this._onLocalResize = new EventDispatcher<MapBounds>();
    }
    get onLocalResize() {
        return this._onLocalResize.asEvent();
    }
    fromMapFile(mapFile: MapFile, rules: MapRules): MapBounds {
        this.fullSize = {
            width: 2 * mapFile.fullSize.width,
            height: 2 * mapFile.fullSize.height,
        };
        this.clampedFullSize = {
            x: 1,
            y: 2,
            width: 2 * (mapFile.fullSize.width - 1) - 1 / Coords.ISO_TILE_SIZE,
            height: 2 * (mapFile.fullSize.height - 1) + 1 - 1 / Coords.ISO_TILE_SIZE,
        };
        this.mapCutoffHeight = Math.max(9, rules.getCutoffTileHeight());
        const x = Math.max(2, mapFile.localSize.x);
        const localSize = {
            x,
            y: mapFile.localSize.y,
            width: Math.min(mapFile.fullSize.width - 2 - x, mapFile.localSize.width),
            height: mapFile.localSize.height,
        };
        this.updateRawLocalSize(localSize);
        return this;
    }
    updateRawLocalSize(size: Rect): void {
        if (this.rawLocalSize.width &&
            this.rawLocalSize.height &&
            !rectContainsRect(size, this.rawLocalSize)) {
            console.warn("New map limits must be outside old limits. Skipping.");
        }
        else if (!rectEquals(size, this.rawLocalSize)) {
            this.localSize = this.computeLocalSize(size, this.fullSize.height / 2, this.mapCutoffHeight);
            this.rawLocalSize = { ...size };
            this.mapBuildableSize = {
                x: this.localSize.x,
                y: this.localSize.y + 4,
                width: this.localSize.width - 2,
                height: this.localSize.height - 8,
            };
            this._onLocalResize.dispatch(this);
        }
    }
    private computeLocalSize(size: Rect, height: number, cutoffHeight: number): Rect {
        return {
            x: 2 * size.x,
            y: 2 * size.y - 4,
            height: Math.min(2 * (size.height + 5) - 1, 2 * height - 2 * (size.y - 3) - cutoffHeight),
            width: 2 * size.width,
        };
    }
    getLocalSize(): Rect {
        return this.localSize;
    }
    getRawLocalSize(): Rect {
        return this.rawLocalSize;
    }
    getFullSize(): Size {
        return this.fullSize;
    }
    getClampedFullSize(): Rect {
        return this.clampedFullSize;
    }
    isWithinBounds(tile: Tile): boolean {
        return rectContainsPoint(this.mapBuildableSize, {
            x: tile.dx,
            y: tile.dy - tile.z,
        });
    }
    clampWithinBounds(tile: Tile): {
        dx: number;
        dy: number;
    } {
        let { x, y } = rectClampPoint(this.mapBuildableSize, {
            x: tile.dx,
            y: tile.dy - tile.z,
        });
        y += (x % 2) - (y % 2);
        if (y > this.mapBuildableSize.y + this.mapBuildableSize.height) {
            y -= 2;
        }
        return { dx: x, dy: y };
    }
    isWithinHardBounds(point: Point): boolean {
        const x = point.x / Coords.LEPTONS_PER_TILE;
        const y = (point.z ?? point.y) / Coords.LEPTONS_PER_TILE;
        const r = x - y + this.fullSize.width / 2 - 1;
        const i = x + y - this.fullSize.width / 2 - 1;
        return rectContainsPoint(this.clampedFullSize, {
            x: r + 1,
            y: i + 1,
        });
    }
}
