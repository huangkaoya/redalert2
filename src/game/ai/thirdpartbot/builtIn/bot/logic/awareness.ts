import { BotContext, GameApi, GameObjectData, MapApi, PathNode, PlayerData, Size, SpeedType, Vector2 } from "../../game-api";
import { calculateConnectedSectorIds, SectorCache } from "./map/sector";
import { GlobalThreat } from "./threat/threat";
import { calculateGlobalThreat } from "./threat/threatCalculator";
import { calculateAreaVisibility, getPointTowardsOtherPoint } from "./map/map";
import { Circle, Quadtree } from "@timohausmann/quadtree-ts";
import { ScoutingManager } from "./common/scout";
import { getDiagonalMapBounds, IncrementalGridCache } from "./map/incrementalGridCache";
import { calculateDiffuseSectorThreat, calculateMoney, calculateSectorThreat } from "./threat/sectorThreat";
import { BuildSpaceCache } from "./map/buildSpaceCache";
import { getSectorId } from "./map/sectorUtils";

export type UnitPositionQuery = { x: number; y: number; unitId: number };

/**
 * The bot's understanding of the current state of the game.
 */
export interface MatchAwareness {
    /**
     * Returns the threat cache for the AI.
     */
    getThreatCache(): GlobalThreat | null;

    /**
     * Returns the sector visibility cache.
     */
    getSectorCache(): SectorCache;

    getBuildSpaceCache(): BuildSpaceCache;

    /**
     * Returns the enemy unit IDs in a certain radius of a point.
     * Warning: this may return non-combatant hostiles, such as neutral units.
     */
    getHostilesNearPoint2d(point: Vector2, radius: number): UnitPositionQuery[];

    /**
     * Returns the enemy unit IDs in a certain radius of a point.
     * Warning: this may return non-combatant hostiles, such as neutral units.
     */
    getHostilesNearPoint(x: number, y: number, radius: number): UnitPositionQuery[];

    /**
     * Returns the main rally point for the AI, which updates every few ticks.
     */
    getMainRallyPoint(): Vector2;

    onGameStart(gameApi: GameApi, playerData: PlayerData): void;

    /**
     * Update the internal state of the Ai.
     */
    onAiUpdate(context: BotContext): void;

    /**
     * True if the AI should initiate an attack.
     */
    shouldAttack(): boolean;

    getScoutingManager(): ScoutingManager;

    getNextExpansionCandidates(): Vector2[];

    getGlobalDebugText(): string | undefined;
}

const SECTORS_TO_UPDATE_PER_CYCLE = 12;

const RALLY_POINT_UPDATE_INTERVAL_TICKS = 90;

const THREAT_UPDATE_INTERVAL_TICKS = 30;

const EXPANSION_UPDATE_INTERVAL_TICKS = 240;

const EXPANSION_MIN_MONEY = 4000;
const EXPANSION_MIN_DISTANCE_TO_BUILDABLE = 20;
const EXPANSION_MIN_CLEAR_SPACE_TILES = 9; // minimum "clear space" required to expand somewhere (should be large enough to fit conyard and refinery)

type QTUnit = Circle<number>;

const rebuildQuadtree = (quadtree: Quadtree<QTUnit>, units: GameObjectData[]) => {
    quadtree.clear();
    units.forEach((unit) => {
        quadtree.insert(new Circle<number>({ x: unit.tile.rx, y: unit.tile.ry, r: 1, data: unit.id }));
    });
};

export class MatchAwarenessImpl implements MatchAwareness {
    private _shouldAttack: boolean = false;

    private hostileQuadTree: Quadtree<QTUnit>;
    private scoutingManager: ScoutingManager;
    private sectorCache: SectorCache;
    private buildSpaceCache: BuildSpaceCache;

    private expansionCandidates: Vector2[] = [];

    constructor(
        gameApi: GameApi,
        playerData: PlayerData,
        private threatCache: GlobalThreat | null,
        private mainRallyPoint: Vector2,
        private logger: (message: string, sayInGame?: boolean) => void,
    ) {
        const mapSize = gameApi.mapApi.getRealMapSize();
        const diagonalBounds = getDiagonalMapBounds(gameApi.mapApi);
        this.hostileQuadTree = new Quadtree(mapSize);
        this.scoutingManager = new ScoutingManager(logger);
        this.sectorCache = new SectorCache(
            mapSize, 
            diagonalBounds,
            (x: number, y: number) => ({
                id: getSectorId(x, y),
                sectorVisibilityRatio: null,
                threatLevel: null,
                diffuseThreatLevel: null,
                totalMoney: null,
                connectedSectorsDirty: true,
                connectedSectorIds: [],
            }),
            (startX, startY, size, currentValue, neighbours) => {
                const sp = new Vector2(startX, startY);
                const ep = new Vector2(sp.x + size, sp.y + size);
                const visibility = calculateAreaVisibility(gameApi.mapApi, playerData, sp, ep);
                const threatLevel = calculateSectorThreat(startX, startY, size, gameApi, playerData);
                const diffuseThreatLevel = calculateDiffuseSectorThreat(currentValue, neighbours);
                const totalMoney = calculateMoney(startX, startY, size, gameApi.mapApi);
                const connectedSectorIds = currentValue.connectedSectorsDirty ? calculateConnectedSectorIds(gameApi.mapApi, startX, startY, neighbours) : currentValue.connectedSectorIds;
                return {
                    ...currentValue,
                    sectorVisibilityRatio: visibility.validTiles > 0 ?
                        visibility.visibleTiles / visibility.validTiles :
                        null, 
                    threatLevel,
                    diffuseThreatLevel,
                    totalMoney,
                    connectedSectorsDirty: false,
                    connectedSectorIds
                }
            }
        );
        this.buildSpaceCache = new BuildSpaceCache(mapSize, gameApi, diagonalBounds);
    }

    getHostilesNearPoint2d(point: Vector2, radius: number): UnitPositionQuery[] {
        return this.getHostilesNearPoint(point.x, point.y, radius);
    }

    getHostilesNearPoint(searchX: number, searchY: number, radius: number): UnitPositionQuery[] {
        const intersections = this.hostileQuadTree.retrieve(new Circle({ x: searchX, y: searchY, r: radius }));
        return intersections
            .map(({ x, y, data: unitId }) => ({ x, y, unitId: unitId! }))
            .filter(({ x, y }) => new Vector2(x, y).distanceTo(new Vector2(searchX, searchY)) <= radius)
            .filter(({ unitId }) => !!unitId);
    }

    getThreatCache(): GlobalThreat | null {
        return this.threatCache;
    }
    getSectorCache(): SectorCache {
        return this.sectorCache;
    }
    getMainRallyPoint(): Vector2 {
        return this.mainRallyPoint;
    }
    getScoutingManager(): ScoutingManager {
        return this.scoutingManager;
    }
    getNextExpansionCandidates(): Vector2[] {
        return this.expansionCandidates;
    }
    getBuildSpaceCache(): BuildSpaceCache {
        return this.buildSpaceCache;
    }

    shouldAttack(): boolean {
        return this._shouldAttack;
    }

    private checkShouldAttack(threatCache: GlobalThreat, threatFactor: number) {
        let scaledGroundPower = threatCache.totalAvailableAntiGroundFirepower * 1.1;
        let scaledGroundThreat =
            (threatFactor * threatCache.totalOffensiveLandThreat + threatCache.totalDefensiveThreat) * 1.1;

        let scaledAirPower = threatCache.totalAvailableAirPower * 1.1;
        let scaledAirThreat =
            (threatFactor * threatCache.totalOffensiveAntiAirThreat + threatCache.totalDefensiveThreat) * 1.1;

        return scaledGroundPower > scaledGroundThreat || scaledAirPower > scaledAirThreat;
    }

    public onGameStart(gameApi: GameApi, playerData: PlayerData) {
        this.scoutingManager.onGameStart(gameApi, playerData, this.sectorCache);
    }

    onAiUpdate({game, player}: BotContext): void {
        const sectorCache = this.sectorCache;
        const playerData = game.getPlayerData(player.name);

        sectorCache.updateSectors(game.getCurrentTick(), SECTORS_TO_UPDATE_PER_CYCLE);
        this.buildSpaceCache.update(game.getCurrentTick());

        this.scoutingManager.onAiUpdate(game, playerData, sectorCache);

        let updateRatio = sectorCache?.getSectorUpdateRatio(game.getCurrentTick() - game.getTickRate() * 60);
        if (updateRatio && updateRatio < 1.0) {
            this.logger(`${updateRatio * 100.0}% of sectors updated in last 60 seconds.`);
        }

        // Build the quadtree, if this is too slow we should consider doing this periodically.
        const hostileUnitIds = game.getVisibleUnits(playerData.name, "enemy");
        try {
            const hostileUnits = hostileUnitIds
                .map((id) => game.getGameObjectData(id))
                .filter(
                    (gameObjectData: GameObjectData | undefined): gameObjectData is GameObjectData =>
                        gameObjectData !== undefined,
                );

            rebuildQuadtree(this.hostileQuadTree, hostileUnits);
        } catch (err) {
            // Hack. Will be fixed soon.
            console.error(`caught error`, hostileUnitIds);
        }

        if (game.getCurrentTick() % THREAT_UPDATE_INTERVAL_TICKS == 0) {
            let visibility = sectorCache?.getOverallVisibility();
            if (visibility) {
                this.logger(`${Math.round(visibility * 1000.0) / 10}% of tiles visible. Calculating threat.`);
                // Update the global threat cache
                this.threatCache = calculateGlobalThreat(game, playerData, visibility);

                // As the game approaches 2 hours, be more willing to attack. (15 ticks per second)
                const gameLengthFactor = Math.max(0, 1.0 - game.getCurrentTick() / (15 * 7200.0));
                this.logger(`Game length multiplier: ${gameLengthFactor}`);

                if (!this._shouldAttack) {
                    // If not attacking, make it harder to switch to attack mode by multiplying the opponent's threat.
                    this._shouldAttack = this.checkShouldAttack(this.threatCache, 1.25 * gameLengthFactor);
                    if (this._shouldAttack) {
                        this.logger(`Globally switched to attack mode.`);
                    }
                } else {
                    // If currently attacking, make it harder to switch to defence mode my dampening the opponent's threat.
                    this._shouldAttack = this.checkShouldAttack(this.threatCache, 0.75 * gameLengthFactor);
                    if (!this._shouldAttack) {
                        this.logger(`Globally switched to defence mode.`);
                    }
                }
            }
        }

        // Update rally point every few ticks.
        if (game.getCurrentTick() % RALLY_POINT_UPDATE_INTERVAL_TICKS === 0) {
            const enemyPlayers = game
                .getPlayers()
                .filter((p) => p !== playerData.name && !game.areAlliedPlayers(playerData.name, p));
            const enemy = game.getPlayerData(enemyPlayers[0]);
            this.mainRallyPoint = getPointTowardsOtherPoint(
                game,
                playerData.startLocation,
                enemy.startLocation,
                10,
                10,
                0,
            );
        }

        // Decide to expand or not
        if (this.buildSpaceCache.isFinished() && game.getCurrentTick() % EXPANSION_UPDATE_INTERVAL_TICKS === 0) {
            // don't expand somewhere near where we can already build
            const ownBuildingVectors = game
                .getVisibleUnits(playerData.name, "self", (r) => r.baseNormal)
                .map((id) => game.getGameObjectData(id)).filter((o): o is GameObjectData => !!o)
                .map((r) => new Vector2(r.tile.rx, r.tile.ry));
            const rawCandidates = this.buildSpaceCache.findSpace(EXPANSION_MIN_CLEAR_SPACE_TILES);
            this.expansionCandidates = rawCandidates.filter((candidate) => {
                const cell = this.sectorCache.getCell(candidate.x, candidate.y);
                if (!cell) {
                    return false;
                }
                if (cell.value.totalMoney && cell.value.totalMoney < EXPANSION_MIN_MONEY) {
                    return false;
                }
                if (ownBuildingVectors.some((ref) => ref.distanceTo(candidate) < EXPANSION_MIN_DISTANCE_TO_BUILDABLE)) {
                    return false;
                }
                if (ownBuildingVectors.some((ref) => ref.distanceTo(candidate) < EXPANSION_MIN_DISTANCE_TO_BUILDABLE)) {
                    return false;
                }
                const tile = game.mapApi.getTile(candidate.x, candidate.y);
                if (!tile) {
                    return false;
                }
                return true;
            });
        }
    }

    public getGlobalDebugText(): string | undefined {
        if (!this.threatCache) {
            return undefined;
        }
        return (
            `Threat LAND: Them ${Math.round(this.threatCache.totalOffensiveLandThreat)}, us: ${Math.round(
                this.threatCache.totalAvailableAntiGroundFirepower,
            )}.\n` +
            `Threat DEFENSIVE: Them ${Math.round(this.threatCache.totalDefensiveThreat)}, us: ${Math.round(
                this.threatCache.totalDefensivePower,
            )}.\n` +
            `Threat AIR: Them ${Math.round(this.threatCache.totalOffensiveAirThreat)}, us: ${Math.round(
                this.threatCache.totalAvailableAntiAirFirepower,
            )}.`
        );
    }
}
