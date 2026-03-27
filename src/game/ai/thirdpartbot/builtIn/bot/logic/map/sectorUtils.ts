import { Tile } from "../../../game-api";

export const SECTOR_SIZE = 8;

export function getSectorId(x: number, y: number) {
    // 16 bits for number x 8 tiles = max tile size of 524280 :)
    return x | y << 16;
}

/**
 * A Sector is an 8x8 area of the map, grouped together for scouting purposes.
 */
export type Sector = {
    id: number;

    /**
     * Null means there are no valid tiles in the sector.
     */
    sectorVisibilityRatio: number | null;
    /**
     * Raw threat level in the sector (based on actual observation)
     */
    threatLevel: number | null;
    /**
     * Derived threat level in the sector (based on diffusing the threat to neighbouring sectors)
     */
    diffuseThreatLevel: number | null;

    totalMoney: number | null;
    
    /**
     * True if the connected sectors is dirty (e.g. pathing state has updated due to broken bridges etc)
     */
    connectedSectorsDirty: boolean;
    connectedSectorIds: number[];
};

export type SectorAndDist = {
    sector: Sector;
    /**
     * x-coordinate of the sector (not tile coordinate)
     */
    x: number;
    /**
     * y-coordinate of the sector (not tile coordinate)
     */
    y: number;
    /**
     * Distance from origin sector to this sector (e.g. when iterating neighbours of a sector)
     */
    dist: number;
}

type Direction = 'NW' | 'N' | 'NE' | 'W' | 'E' | 'SW' | 'S' | 'SE';
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
    "NW": "SE",
    "N": "S",
    "NE": "SW",
    "W": "E",
    "E": "W",
    "SW": "NE",
    "S": "N",
    "SE": "NW",
};

export function getDirectionToSector(tileX: number, tileY: number, neighbour: SectorAndDist): Direction{
    // in tiles
    const nX = neighbour.x * SECTOR_SIZE;
    const nY = neighbour.y * SECTOR_SIZE;
    if (nX === tileX - SECTOR_SIZE && nY === tileY - SECTOR_SIZE) {
        return 'NW';
    } else if (nX === tileX && nY === tileY - SECTOR_SIZE) {
        return 'N';
    } else if (nX === tileX + SECTOR_SIZE && nY === tileY - SECTOR_SIZE) {
        return 'NE';
    } else if (nX === tileX - SECTOR_SIZE && nY === tileY) {
        return 'W';
    } else if (nX === tileX + SECTOR_SIZE && nY === tileY) {
        return 'E';
    } else if (nX === tileX - SECTOR_SIZE && nY === tileY + SECTOR_SIZE) {
        return 'SW';
    } else if (nX === tileX && nY === tileY + SECTOR_SIZE) {
        return 'S';
    } else if (nX === tileX + SECTOR_SIZE && nY === tileY + SECTOR_SIZE) {
        return 'SE';
    } else {
        throw new Error(`unable to determine sector direction from ${tileX},${tileY} to ${nX},${nY}`);
    }
}

export function getSectorTilesInDirection(tileX: number, tileY: number, tiles: Tile[], direction: Direction) {
    const edgeX = tileX + SECTOR_SIZE - 1;
    const edgeY = tileY + SECTOR_SIZE - 1;
    return tiles.filter((tile) => {
        switch (direction) {
            case "NW":
                return tile.rx === tileX && tile.ry === tileY;
            case "N":
                return tile.ry === tileY;
            case "NE":
                return tile.rx === edgeX && tile.ry === tileY;
            case "W":
                return tile.rx === tileX;
            case "E":
                return tile.rx === edgeX;
            case "SW":
                return tile.rx === tileX && tile.ry === edgeY;
            case "S":
                return tile.ry === edgeY;
            case "SE":
                return tile.rx === edgeX && tile.ry === edgeY;
        }
    });
}

export function getNeighbourTiles(tileX: number, tileY: number, tiles: Tile[]) {
    return tiles.filter(({rx, ry}) => {
        return (rx === tileX + 1 || rx === tileX - 1 || ry === tileY + 1 || ry === tileY - 1) && rx !== tileX && ry !== tileY;
    })
}
