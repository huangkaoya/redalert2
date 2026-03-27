import { GameApi, PlayerData, Vector2 } from "../../../game-api";
import { SectorCache } from "../map/sector";
import { DebugLogger } from "./utils";
import { PriorityQueue } from "@datastructures-js/priority-queue";

export const getUnseenStartingLocations = (gameApi: GameApi, playerData: PlayerData) => {
    const unseenStartingLocations = gameApi.mapApi.getStartingLocations().filter((startingLocation) => {
        if (startingLocation == playerData.startLocation) {
            return false;
        }
        let tile = gameApi.mapApi.getTile(startingLocation.x, startingLocation.y);
        return tile ? !gameApi.mapApi.isVisibleTile(tile, playerData.name) : false;
    });
    return unseenStartingLocations;
};

export class PrioritisedScoutTarget {
    constructor(
        public priority: number,
        public target: Vector2,
        public permanent: boolean = false,
    ) {}

    toString() {
        const vector2 = this.target;
        return `${vector2?.x},${vector2?.y}`;
    }
}

const ENEMY_SPAWN_POINT_PRIORITY = 900;

// Distance around the starting area (in tiles) to scout first.
const NEARBY_SECTOR_STARTING_RADIUS = 16;
const NEARBY_SECTOR_BASE_PRIORITY = 900;

// Amount of ticks per 'radius' to expand for scouting.
const SCOUTING_RADIUS_EXPANSION_TICKS = 120;
// Don't actually queue the scouting until the radius increased by this much
const MIN_SCOUT_RADIUS_INCREASE = 16;
// Don't queue scouting for sectors with enough visibility.
const SCOUTING_MAX_VISIBILITY_RATIO = 0.8;

export class ScoutingManager {
    private scoutingQueue: PriorityQueue<PrioritisedScoutTarget>;

    private queuedRadius = NEARBY_SECTOR_STARTING_RADIUS;

    constructor(private logger: DebugLogger) {
        // Order by descending priority.
        this.scoutingQueue = new PriorityQueue(
            (a: PrioritisedScoutTarget, b: PrioritisedScoutTarget) => b.priority - a.priority,
        );
    }

    addRadiusToScout(
        gameApi: GameApi,
        centerPoint: Vector2,
        sectorCache: SectorCache,
        radius: number,
        startingPriority: number,
    ) {
        const { x: startX, y: startY } = centerPoint;
        sectorCache.forEachInRadius(startX,
            startY, radius,
            (x, y, sector, distance) => {
                if (!sector) {
                    return;
                }
                // Make it scout closer sectors first.
                if (gameApi.mapApi.getTile(x, y)) {
                    // Sector with high visility ratios are deprioritised.
                    const ratio = sector.value.sectorVisibilityRatio ?? 0;
                    // Do not scout sectors that are visible enough.
                    if (ratio >= SCOUTING_MAX_VISIBILITY_RATIO) {
                        return;
                    }

                    // Sectors closer to the starting sector are prioritised.
                    const priority = (startingPriority - distance) * (1 - ratio);
                    if (priority > 0) {
                        this.scoutingQueue.enqueue(new PrioritisedScoutTarget(priority, new Vector2(x, y)));
                    }
                }
            }
        );
    }

    onGameStart(gameApi: GameApi, playerData: PlayerData, sectorCache: SectorCache) {
        // Queue hostile starting locations with high priority and as permanent scouting candidates.
        gameApi.mapApi
            .getStartingLocations()
            .filter((startingLocation) => {
                if (startingLocation == playerData.startLocation) {
                    return false;
                }
                let tile = gameApi.mapApi.getTile(startingLocation.x, startingLocation.y);
                return tile ? !gameApi.mapApi.isVisibleTile(tile, playerData.name) : false;
            })
            .map((tile) => new PrioritisedScoutTarget(ENEMY_SPAWN_POINT_PRIORITY, tile, true))
            .forEach((target) => {
                this.logger(`Adding ${target} to initial scouting queue`);
                this.scoutingQueue.enqueue(target);
            });

        // Queue sectors near the spawn point.
        this.addRadiusToScout(
            gameApi,
            playerData.startLocation,
            sectorCache,
            NEARBY_SECTOR_STARTING_RADIUS,
            NEARBY_SECTOR_BASE_PRIORITY,
        );
    }

    onAiUpdate(gameApi: GameApi, playerData: PlayerData, sectorCache: SectorCache) {
        const currentHead = this.scoutingQueue.front();
        if (!currentHead) {
            return;
        }
        const headTarget = currentHead.target;
        if (!headTarget) {
            this.scoutingQueue.dequeue();
            return;
        }
        const { x, y } = headTarget;
        const tile = gameApi.mapApi.getTile(x, y);
        if (tile && gameApi.mapApi.isVisibleTile(tile, playerData.name)) {
            this.logger(`head point is visible, dequeueing`);
            this.scoutingQueue.dequeue();
        }

        const requiredRadius = Math.floor(gameApi.getCurrentTick() / SCOUTING_RADIUS_EXPANSION_TICKS);
        if (requiredRadius > this.queuedRadius + MIN_SCOUT_RADIUS_INCREASE) {
            this.logger(`expanding scouting radius from ${this.queuedRadius} to ${requiredRadius}`);
            this.addRadiusToScout(
                gameApi,
                playerData.startLocation,
                sectorCache,
                requiredRadius,
                NEARBY_SECTOR_BASE_PRIORITY,
            );
            this.queuedRadius = requiredRadius;
        }
    }

    getNewScoutTarget() {
        return this.scoutingQueue.dequeue();
    }

    hasScoutTargets() {
        return !this.scoutingQueue.isEmpty();
    }
}
