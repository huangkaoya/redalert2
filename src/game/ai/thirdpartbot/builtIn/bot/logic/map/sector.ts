// A sector is a uniform-sized segment of the map.

import { MapApi, Size, SpeedType, Tile } from "../../../game-api";
import { BasicIncrementalGridCache, DiagonalMapBounds, IncrementalGridCache, IncrementalGridCell, SequentialScanStrategy, StagedScanStrategy, toHeatmapColor, toRGBNum } from "./incrementalGridCache";
import { getDirectionToSector, getNeighbourTiles, getSectorTilesInDirection, OPPOSITE_DIRECTION, Sector, SECTOR_SIZE, SectorAndDist } from "./sectorUtils";

/**
 * Wrapper around IncrementalGridCache that handles scaling from tile coordinates to sectors (could probably also be refactored out)
 */
export class SectorCache implements IncrementalGridCache<Sector> {
    private gridCache: BasicIncrementalGridCache<Sector, number>;

    constructor(private mapBounds: Size,
        diagonalMapBounds: DiagonalMapBounds,
        initFn: (startX: number, startY: number) => Sector,
        updateFn: (startX: number, startY: number, size: number, currentValue: Sector, neighbors: SectorAndDist[]) => Sector) {
        const sectorsX = Math.ceil(mapBounds.width / SECTOR_SIZE);
        const sectorsY = Math.ceil(mapBounds.height / SECTOR_SIZE);

        // diagonal map bounds is in terms of tiles, so needs to be scaled too. In this case we take the floor of the starts and ceil of the ends
        // so we "overscan"
        function scaleBoundsArray(bounds: number[], isStart: boolean) {
            let result: number[] = [];
            function handleBatch(values: number[]) {
                if (isStart) {
                    // minimum, and floor
                    return values.map((v) => Math.floor(v / SECTOR_SIZE)).reduce((pV, v) => v < pV ? v : pV, sectorsX);
                }
                // maximum, and ceil
                return values.map((v) => Math.ceil(v / SECTOR_SIZE)).reduce((pV, v) => v > pV ? v : pV, 0);
            }
            let n = 0;
            for (; n < bounds.length; n += SECTOR_SIZE) {
                const values = bounds.slice(n, n + SECTOR_SIZE);
                result.push(handleBatch(values));
            }
            if (n < bounds.length) {
                const values = bounds.slice(n, n + SECTOR_SIZE);
                result.push(handleBatch(values));
            }
            return result;
        }

        const scaledDiagonalMapBounds: DiagonalMapBounds = {
            yStart: Math.floor(diagonalMapBounds.yStart / SECTOR_SIZE),
            yEnd: Math.ceil(diagonalMapBounds.yEnd / SECTOR_SIZE),
            xStarts: scaleBoundsArray(diagonalMapBounds.xStarts, true),
            xEnds: scaleBoundsArray(diagonalMapBounds.xEnds, false),
        };

        let minThreatColored = Number.MAX_VALUE;
        let maxThreatColored = Number.MIN_VALUE;
        let lastScanStage = -1;
        this.gridCache = new BasicIncrementalGridCache<Sector, number>(
            sectorsX,
            sectorsY,
            initFn,
            (sectorX, sectorY, currentValue, scanStage) => {
                const neighbours: SectorAndDist[] = [];
                // send the neighbours as well, to allow for diffuse sector threat
                this.gridCache.forEachInRadius(sectorX, sectorY, 1, (nX, nY, s) => {
                    if (nX !== sectorX || nY !== sectorY) {
                        const dist = (sectorX === nX || sectorY === nY ? 1 : 0.707);
                        neighbours.push({sector: s.value, x: nX, y: nY, dist});
                    }
                });
                minThreatColored = Math.min(currentValue.diffuseThreatLevel ?? 0, minThreatColored);
                maxThreatColored = Math.max(currentValue.diffuseThreatLevel ?? 0, maxThreatColored);
                // decay the scale every full scan
                if (scanStage !== lastScanStage) {
                    lastScanStage = scanStage;
                    minThreatColored = minThreatColored * 0.95;
                    maxThreatColored = maxThreatColored * 0.95;
                }
                return updateFn(sectorX * SECTOR_SIZE, sectorY * SECTOR_SIZE, SECTOR_SIZE, currentValue, neighbours)
            },
            new StagedScanStrategy([
                new SequentialScanStrategy(1, scaledDiagonalMapBounds),
                new SequentialScanStrategy(1, scaledDiagonalMapBounds).setReverse()
            ]).setRepeating(),
            // Function to determine what colour should be rendered in the debug grid for this heatmap.
            (sector) => {
                // debug diffuse threat level:
                return toHeatmapColor(sector.diffuseThreatLevel, minThreatColored, maxThreatColored);
                // debug scouting:
                //return toHeatmapColor(sector.sectorVisibilityRatio);
                // debug sector connectedness
                //return toHeatmapColor(sector.connectedSectorIds.length > 0 ? 1 : 0, 0, 1);
            }
        );
    }

    getSize() {
        return this.gridCache.getSize();
    }
    
    getCell(tileX: number, tileY: number) {
        return this.gridCache.getCell(Math.floor(tileX / SECTOR_SIZE), Math.floor(tileY / SECTOR_SIZE));
    }

    forEach(fn: (tileX: number, tileY: number, cell: IncrementalGridCell<Sector>) => void): void {
        this.gridCache.forEach((x, y, cell) => {
            fn(Math.floor(x * SECTOR_SIZE + SECTOR_SIZE / 2), Math.floor(y * SECTOR_SIZE + SECTOR_SIZE / 2), cell);
        });
    }

    public updateSectors(currentGameTick: number, maxSectorsToUpdate: number) {
        this.gridCache.updateCells(maxSectorsToUpdate, currentGameTick);
    }


    // Return % of sectors that are updated since a certain time
    public getSectorUpdateRatio(sectorsUpdatedSinceGameTick: number): number {
        let updated = 0,
            total = 0;
        this.gridCache.forEach((_x, _y, cell) => {
            if (
                cell.lastUpdatedTick !== null &&
                cell.lastUpdatedTick >= sectorsUpdatedSinceGameTick
            ) {
                ++updated;
            }
            ++total;
        });
        return updated / total;
    }

    /**
     * Return the ratio (0-1) of tiles that are visible.
     */
    public getOverallVisibility(): number | undefined {
        let visible = 0,
            total = 0;
        this.gridCache.forEach((_x, _y, cell) => {
            const sector = cell.value;
            // Undefined visibility.
            if (sector.sectorVisibilityRatio != undefined) {
                visible += sector.sectorVisibilityRatio;
                total += 1.0;
            }
        });
        return visible / total;
    }

    public forEachInRadius(
        tileX: number,
        tileY: number,
        radius: number,
        fn: (x: number, y: number, sector: IncrementalGridCell<Sector>, dist: number) => void) {
        const startingSector = this.getSectorCoordinatesForWorldPosition(tileX, tileY);
        if (!startingSector) {
            return;
        }
        this.gridCache.forEachInRadius(startingSector.sectorX,
            startingSector.sectorY, Math.ceil(radius / SECTOR_SIZE), (x, y, cell, distance) => {
                fn(
                    Math.floor(x * SECTOR_SIZE + SECTOR_SIZE / 2),
                    Math.floor(y * SECTOR_SIZE + SECTOR_SIZE / 2),
                    cell,
                    distance);
            });
    }

    private getSectorCoordinatesForWorldPosition(x: number, y: number) {
        if (x < 0 || x >= this.mapBounds.width || y < 0 || y >= this.mapBounds.height) {
            return undefined;
        }
        return {
            sectorX: Math.floor(x / SECTOR_SIZE),
            sectorY: Math.floor(y / SECTOR_SIZE),
        };
    }

    public _renderScale() {
        return SECTOR_SIZE;
    }

    public _getCellDebug(tileX: number, tileY: number): (IncrementalGridCell<Sector> & { color: number; }) | null {
        return this.gridCache._getCellDebug(Math.floor(tileX / SECTOR_SIZE), Math.floor(tileY / SECTOR_SIZE));
    }
}

/**
 * Computes which neighbour sectors can be pathed to from the sector starting at tileX,tileY. This is expensive, and therefore only calculated
 * when the sector is dirty (the pathing is changed in some way).
 */
export function calculateConnectedSectorIds(mapApi: MapApi, tileX: number, tileY: number, neighbours: SectorAndDist[], speedType: SpeedType = SpeedType.Track) {
    // Algorithm: If you can reach the edge towards another sector, from the opposite edge, that sector is connected.
    // For diagonal connectivity we just test the corners for now.
    const allTiles = mapApi.getTilesInRect({x: tileX, y: tileY, width: SECTOR_SIZE, height: SECTOR_SIZE});
    const tiles = allTiles.filter((tile) => {
        return mapApi.isPassableTile(tile, speedType, tile.onBridgeLandType ? true : false, true);
    });
    if (tiles.length === 0) {
        return [];
    }
    const connectedSectors = neighbours.filter((neighbour) => {
        const direction = getDirectionToSector(tileX, tileY, neighbour);
        const goalTiles = new Set(getSectorTilesInDirection(tileX, tileY, tiles, OPPOSITE_DIRECTION[direction]));
        const openList = getSectorTilesInDirection(tileX, tileY, tiles, direction);
        const closedSet = new Set();
        let head: Tile | undefined;
        while (head = openList.shift()) {
            const neighbourTiles = getNeighbourTiles(head.rx, head.ry, tiles);
            for (const neighbour of neighbourTiles) {
                if (goalTiles.has(neighbour)) {
                    return true;
                }
                if (!closedSet.has(neighbour)) {
                    closedSet.add(neighbour);
                    openList.push(neighbour);
                }
            }
        }
        return false;
    });
    
    return connectedSectors.map((s) => s.sector.id);
}
