import { GameMath, MapApi, Size } from "../../../game-api";

export type IncrementalGridCell<T> = {
    lastUpdatedTick: number | null;
    value: T;
}

export function toHeatmapColor(value: number | null | undefined, minScale: number = 0, maxScale: number = 1) {
    if (value === undefined || value === null) {
        return 0;
    }
    const ratio = 2 * (value - minScale) / (maxScale - minScale)
    const b = Math.max(0, 255 * (1 - ratio))
    const r = Math.max(0, 255 * (ratio - 1))
    const g = 255 - b - r
    return toRGBNum(r, g, b)
}

export function toRGBNum(red: number, green: number, blue: number) {
    return red << 16 | green << 8 | blue;
}

export function fromRGBNum(num: number) {
    return [num >> 16 & 0xFF, num >> 8 & 0xFF, num & 0xFF];
}

export interface IncrementalGridCache<T> {
    getSize(): Size;
    getCell(x: number, y: number): IncrementalGridCell<T> | null;
    forEach(fn: (x: number, y: number, cell: IncrementalGridCell<T>) => void): void;
    forEachInRadius(startX: number, startY: number, radius: number, fn: (x: number, y: number, cell: IncrementalGridCell<T>, dist: number) => void): void;

    // For debug purposes, how large each cell is in game tiles.
    _renderScale(): number;
    _getCellDebug(x: number, y: number): IncrementalGridCell<T> & { color: number } | null;
}

/**
 * A class that allows spatial information to be updated lazily as needed, meaning some (or many) grid locations may be stale.
 * 
 * Because the game maps are rotated by 45 degrees, we only scan for valid tiles.
 * 
 * In game terms, a grid may be a cell for high-resolution information, or multiple cells for low resolution information (e.g. scouting sectors).
 * 
 * @param T value type of each cell
 * @param V argument type passed from the scan strategy to the updater (e.g. the number of passes done so far)
 */
export class BasicIncrementalGridCache<T, V> implements IncrementalGridCache<T> {
    // cells, stored in column-major order
    private cells: IncrementalGridCell<T>[][] = [];

    constructor(
        private width: number,
        private height: number,
        initCellFn: (x: number, y: number) => T,
        private updateCellFn: (x: number, y: number, currentValue: T, scanStrategyArg: V) => T,
        private scanStrategy: IncrementalGridCacheUpdateStrategy<V>,
        private valueToDebugColor: (value: T) => number) {
        for (let x = 0; x < width; ++x) {
            this.cells[x] = new Array(height);
            for (let y = 0; y < height; ++y) {
                this.cells[x][y] = {
                    lastUpdatedTick: null,
                    value: initCellFn(x, y)
                };
            }
        }
    }

    public getSize(): Size {
        return { width: this.width, height: this.height }
    }

    public getCell(x: number, y: number): IncrementalGridCell<T> | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.cells[x][y];
    }

    public _getCellDebug(x: number, y: number): IncrementalGridCell<T> & { color: number } | null {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        const cell = this.cells[x][y];
        return {
            ...cell,
            color: this.valueToDebugColor(cell.value)
        };
    }

    /**
     * Using the IncrementalGridCacheUpdateStrategy provided at construction time, update a certain number of cells with new values.
     * 
     * @param numCellsToUpdate Number of cells to update
     */
    public updateCells(numCellsToUpdate: number, gameTick: number) {
        for (let i = 0; i < numCellsToUpdate; ++i) {
            const nextCell = this.scanStrategy.getNextCellToUpdate(this.width, this.height);
            if (!nextCell) {
                break;
            }
            const { x, y, arg } = nextCell;
            const newValue = this.updateCellFn(x, y, this.cells[x][y].value, arg);
            this.cells[x][y] = {
                lastUpdatedTick: gameTick,
                value: newValue,
            };
        }
    }

    /**
     * Using a clone of the ScanStrategy, iterates over all cells in the grid and calls the provided callback function on each one.
     */
    public forEach(fn: (x: number, y: number, cell: IncrementalGridCell<T>) => void) {
        const scanStrategy = this.scanStrategy.clone();
        let next: { x: number, y: number } | null = null;
        while ((next = scanStrategy.getNextCellToUpdate(this.width, this.height)) !== null) {
            const { x, y } = next;
            fn(x, y, this.cells[x][y]);
        }
    }


    public forEachInRadius(startX: number, startY: number, dist: number, fn: (x: number, y: number, cell: IncrementalGridCell<T>, dist: number) => void) {
        this.scanStrategy.getNeighbours(startX, startY, this.width, this.height, dist).forEach(({ x, y, dist }) => fn(x, y, this.getCell(x, y)!, dist));
    }

    public _renderScale() {
        return 1;
    }
}

export interface IncrementalGridCacheUpdateStrategy<V> {
    getNextCellToUpdate(width: number, height: number): { x: number; y: number, arg: V } | null;
    getNeighbours(x: number, y: number, width: number, height: number, dist: number): { x: number, y: number, dist: number }[];

    clone(): IncrementalGridCacheUpdateStrategy<V>;
    /**
     * True if this strategy keeps running over and over.
     */
    isRepeatable(): boolean;
    /**
     * True if consumers can trust all the relevant cells have been populated at least once.
     */
    isFinished(): boolean;
}

export type DiagonalMapBounds = {
    // All starts are inclusive. All ends are exclusive.
    xStarts: number[];
    xEnds: number[];
    yStart: number;
    yEnd: number;
}

export function getDiagonalMapBounds(mapApi: MapApi): DiagonalMapBounds {
    const { width, height } = mapApi.getRealMapSize();
    const xStarts = new Array<number>(height).fill(width);
    const xEnds = new Array<number>(height).fill(0);
    const allTiles = mapApi.getTilesInRect({ x: 0, y: 0, width, height });
    let yStart = height;
    let yEnd = 0;
    for (const tile of allTiles) {
        if (tile.rx < xStarts[tile.ry]) {
            xStarts[tile.ry] = tile.rx;
        }
        if (tile.rx >= xEnds[tile.ry]) {
            xEnds[tile.ry] = tile.rx + 1;
        }
        if (tile.ry < yStart) {
            yStart = tile.ry;
        }
        if (tile.ry >= yEnd) {
            yEnd = tile.ry + 1;
        }
    }
    return { xStarts, xEnds, yStart, yEnd };
}

// Dumb scan strategy: top-left to bottom-right (or reverse).
export class SequentialScanStrategy implements IncrementalGridCacheUpdateStrategy<number> {
    private lastUpdatedSectorX: number | undefined;
    private lastUpdatedSectorY: number | undefined;

    private passCount: number;

    /**
     * 
     * @param maxPasses null if infinite, otherwise step through a certain number of times
     * @param diagonalMapBounds optional diagonal bounds to prevent scanning over blank tiles
     * You should provide this, otherwise, when scanning from 0,0 to width,height, you end up scanning about 50% of unnecessary tiles.
     */
    constructor(private maxPasses: number | null = null, private diagonalMapBounds: DiagonalMapBounds | null = null, private reverse: boolean = false) {
        this.passCount = 0;
    };

    public setReverse(): this {
        this.reverse = true;
        return this;
    }

    private getStartY(height: number) {
        if (this.reverse) {
            return (this.diagonalMapBounds?.yEnd ?? height) - 1;
        }
        return this.diagonalMapBounds?.yStart ?? 0;
    }

    private getEndY(height: number) {
        if (this.reverse) {
            return (this.diagonalMapBounds?.yStart ?? 0) - 1;
        }
        return this.diagonalMapBounds?.yEnd ?? height;
    }

    private getStartX(y: number, width: number) {
        if (this.reverse) {
            if (this.diagonalMapBounds) {
                return this.diagonalMapBounds.xEnds[y] - 1;
            }
            return width - 1;
        }
        if (this.diagonalMapBounds) {
            return this.diagonalMapBounds.xStarts[y];
        }
        return 0;
    }

    private getEndX(y: number, width: number) {
        if (this.reverse) {
            if (this.diagonalMapBounds) {
                return this.diagonalMapBounds.xStarts[y] - 1;
            }
            return width - 1;
        }
        if (this.diagonalMapBounds) {
            return this.diagonalMapBounds.xEnds[y];
        }
        return width;
    }

    getNextCellToUpdate(width: number, height: number) {
        // First scan, or the last scan reached the end
        if (this.lastUpdatedSectorX === undefined || this.lastUpdatedSectorY === undefined) {
            this.lastUpdatedSectorY = this.getStartY(height);
            this.lastUpdatedSectorX = this.getStartX(this.lastUpdatedSectorY, width);
            return { x: this.lastUpdatedSectorX, y: this.lastUpdatedSectorY, arg: this.passCount };
        }

        const endX = this.getEndX(this.lastUpdatedSectorY, width);
        const endY = this.getEndY(height);

        if (this.reverse) {
            if (this.lastUpdatedSectorX - 1 > endX) {
                return { x: --this.lastUpdatedSectorX, y: this.lastUpdatedSectorY, arg: this.passCount };
            }

            if (this.lastUpdatedSectorY - 1 > endY) {
                this.lastUpdatedSectorX = this.getStartX(this.lastUpdatedSectorY - 1, width);
                return { x: this.lastUpdatedSectorX, y: --this.lastUpdatedSectorY, arg: this.passCount };
            }
        } else {
            if (this.lastUpdatedSectorX + 1 < endX) {
                return { x: ++this.lastUpdatedSectorX, y: this.lastUpdatedSectorY, arg: this.passCount };
            }

            if (this.lastUpdatedSectorY + 1 < endY) {
                this.lastUpdatedSectorX = this.getStartX(this.lastUpdatedSectorY + 1, width);
                return { x: this.lastUpdatedSectorX, y: ++this.lastUpdatedSectorY, arg: this.passCount };
            }
        }

        ++this.passCount;
        if (this.maxPasses === null || this.passCount < this.maxPasses) {
            this.lastUpdatedSectorX = undefined;
            this.lastUpdatedSectorY = undefined;
        }
        return null;
    }

    getNeighbours(baseX: number, baseY: number, width: number, height: number, dist: number) {
        const neighbours: { x: number, y: number, dist: number }[] = [];
        const startY = this.getStartY(height);
        const endY = this.getEndY(height);
        if (this.reverse) {
            for (
                let y = Math.min(startY, baseY + dist);
                y > Math.max(endY, baseY - dist - 1);
                --y
            ) {
                const startX = this.getStartX(y, width);
                const endX = this.getEndX(y, width);
                for (
                    let x: number = Math.min(startX, baseX + dist);
                    x > Math.max(endX, baseX - dist - 1);
                    --x
                ) {
                    const dist = GameMath.sqrt(GameMath.pow(x - baseX, 2) + GameMath.pow(y - baseY, 2));
                    neighbours.push({x, y, dist});
                }
            }
        } else {
            for (
                let y = Math.max(startY, baseY - dist);
                y < Math.min(endY, baseY + dist + 1);
                ++y
            ) {
                const startX = this.getStartX(y, width);
                const endX = this.getEndX(y, width);
                for (
                    let x: number = Math.max(startX, baseX - dist);
                    x < Math.min(endX, baseX + dist + 1);
                    ++x
                ) {
                    const dist = GameMath.sqrt(GameMath.pow(x - baseX, 2) + GameMath.pow(y - baseY, 2));
                    neighbours.push({x, y, dist});
                }
            }
        }
        return neighbours;
    }

    clone() {
        return new SequentialScanStrategy(this.maxPasses, this.diagonalMapBounds, this.reverse);
    }

    isRepeatable(): boolean {
        return this.maxPasses === null;
    }

    isFinished(): boolean {
        return this.passCount > 0 && this.maxPasses === null;
    }
}

/**
 * Scan that composes other scan strategies in stages.
 */
export class StagedScanStrategy implements IncrementalGridCacheUpdateStrategy<number> {
    private stageIndex: number;
    private originalStages: IncrementalGridCacheUpdateStrategy<number>[];
    private hasFinishedAtLeastOnce: boolean = false;

    constructor(private stages: IncrementalGridCacheUpdateStrategy<number>[], private isRepeating = false) {
        this.originalStages = [...stages];
        this.stageIndex = 0;
    }

    public setRepeating() {
        this.isRepeating = true;
        return this;
    }

    getNextCellToUpdate(width: number, height: number) {
        if (this.stages.length === 0) {
            return null;
        }
        const head = this.stages[0];
        const headValue = head.getNextCellToUpdate(width, height);
        if (headValue !== null) {
            return {
                ...headValue,
                // override arg with our own stage index
                arg: this.stageIndex
            }
        }
        if (head.isRepeatable()) {
            // come back to it next time
            return null;
        }
        // head returned null, move to next and try again
        this.stages.shift();
        const next = this.stages[0];
        ++this.stageIndex;
        if (!next) {
            if (this.isRepeating) {
                this.hasFinishedAtLeastOnce = true;
                this.reset();
            }
            return null;
        }
        const nextValue = next.getNextCellToUpdate(width, height);
        if (!nextValue) {
            return null;
        }
        return {
            ...nextValue,
            // override arg with our own stage index
            arg: this.stageIndex
        }
    }

    private reset() {
        this.stageIndex = 0;
        this.stages = [...this.originalStages.map((s) => s.clone())];
    }

    getNeighbours(x: number, y: number, width: number, height: number, dist: number) {
        if (this.stages.length === 0) {
            return [];
        }
        return this.stages[0].getNeighbours(x, y, width, height, dist);
    }

    isRepeatable(): boolean {
        return this.isRepeating || this.originalStages.some((s) => s.isRepeatable());
    }

    isFinished() {
        return this.hasFinishedAtLeastOnce;
    }

    clone() {
        return new StagedScanStrategy(this.originalStages.map((s) => s.clone()), this.isRepeating);
    }
}