import { GameApi, LandType, Size, SpeedType, TechnoRules, TerrainType, Tile, Vector2 } from "../../../game-api";
import {
    BasicIncrementalGridCache,
    DiagonalMapBounds,
    getDiagonalMapBounds,
    IncrementalGridCache,
    SequentialScanStrategy,
    StagedScanStrategy,
    toHeatmapColor,
} from "./incrementalGridCache";
import { canBuildOnTile } from "../common/tileUtils";

type BuildSpaceData = {
    // number from raw map data
    rawValue: number;
    // number given actual objects on the field
    liveValue: number;
};

// distance transform to find flat, buildable areas.
// ref: https://github.com/Supalosa/supabot/blob/1ce77f3c3e210da738bf231bc6a94aa8bdf68cef/supabot-core/src/main/java/com/supalosa/bot/analysis/Analysis.java#L252
export class BuildSpaceCache {
    private scanStrategy: StagedScanStrategy;
    private distanceTransformCache: BasicIncrementalGridCache<BuildSpaceData, number>;

    constructor(mapSize: Size, gameApi: GameApi, diagonalMapBounds: DiagonalMapBounds) {
        this.scanStrategy = new StagedScanStrategy([
            // The DT algorithm runs in 3 passes. The last pass needs to run in reverse.
            new SequentialScanStrategy(1, diagonalMapBounds),
            new SequentialScanStrategy(1, diagonalMapBounds),
            new SequentialScanStrategy(1, diagonalMapBounds).setReverse(),
        ]).setRepeating();
        this.distanceTransformCache = new BasicIncrementalGridCache<BuildSpaceData, number>(
            mapSize.width,
            mapSize.height,
            () => ({
                rawValue: Number.MAX_VALUE,
                liveValue: Number.MAX_VALUE,
            }),
            (x, y, currentValue, stageIndex) => {
                const passIndex = stageIndex % 3;
                if (passIndex === 0) {
                    // First DT pass: set unbuildable tiles as distance 0
                    const tile = gameApi.mapApi.getTile(x, y);
                    if (!tile) {
                        return {
                            rawValue: 0,
                            liveValue: 0,
                        };
                    }
                    const initialValue = !canBuildOnTile(tile, gameApi) ? 0 : currentValue.rawValue;
                    return {
                        rawValue: initialValue,
                        liveValue: initialValue,
                    };
                }

                if (passIndex === 1) {
                    // Second DT pass: all cells (except edges) update from top left
                    if (x === 0 || y === 0) {
                        return currentValue;
                    }
                    const left = this.distanceTransformCache.getCell(x - 1, y)!;
                    const top = this.distanceTransformCache.getCell(x, y - 1)!;
                    const nextValue = Math.min(
                        currentValue.rawValue,
                        Math.min(left.value.rawValue + 1, top.value.rawValue + 1),
                    );
                    return {
                        rawValue: nextValue,
                        // not necessary to set, but liveValue is the value visualised during debug
                        liveValue: nextValue,
                    };
                }
                // Last DT pass: all cells update from bottom right
                if (x === mapSize.width - 1 || y === mapSize.height - 1) {
                    return currentValue;
                }
                const right = this.distanceTransformCache.getCell(x + 1, y)!;
                const bottom = this.distanceTransformCache.getCell(x, y + 1)!;
                const rawValue = Math.min(
                    currentValue.rawValue,
                    Math.min(right.value.rawValue + 1, bottom.value.rawValue + 1),
                );
                return {
                    rawValue,
                    // not necessary to set, but liveValue is the value visualised during debug
                    liveValue: rawValue,
                };
            },
            this.scanStrategy,
            (v) => toHeatmapColor(Math.min(15, v.liveValue ?? v.rawValue), 0, 15),
        );
    }

    public update(gameTick: number) {
        this.distanceTransformCache.updateCells(this.isFinished() ? 128 : 256, gameTick);
    }

    // visible for debugging
    public get _cache(): IncrementalGridCache<BuildSpaceData> {
        return this.distanceTransformCache;
    }

    public isFinished() {
        return this.scanStrategy.isFinished();
    }

    public findSpace(tiles: number): Vector2[] {
        if (!this.isFinished()) {
            return [];
        }
        type Candidate = {
            pos: Vector2;
            value: number;
        };
        const candidates: Candidate[] = [];
        this.distanceTransformCache.forEach((x, y, cell) => {
            if (cell.lastUpdatedTick === null) {
                return;
            }
            // we know it has a value if the scan is 'finished'
            const liveValue = cell.value.liveValue!;
            if (liveValue >= tiles) {
                // if there's a candidate within `tiles` distance, use the higher of the two
                const vec = new Vector2(x, y);
                const otherCandidateIdx = candidates.findIndex((c) => c.pos.distanceTo(vec) < tiles);
                if (otherCandidateIdx >= 0) {
                    if (candidates[otherCandidateIdx].value < liveValue) {
                        candidates[otherCandidateIdx] = { pos: vec, value: liveValue };
                    }
                } else {
                    candidates.push({ pos: vec, value: liveValue });
                }
            }
        });
        return candidates.map(({ pos }) => pos);
    }
}
