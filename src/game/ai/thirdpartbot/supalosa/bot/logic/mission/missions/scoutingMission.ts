import { ActionsApi, BotContext, GameApi, OrderType, PlayerData, Vector2 } from "../../../../game-api";
import { MatchAwareness } from "../../awareness";
import {
    Mission,
    MissionAction,
    disbandMission,
    noop,
    requestUnits,
    requestUnitsWithSamePriority,
} from "../mission";
import { AttackMission } from "./attackMission";
import { MissionController } from "../missionController";
import { DebugLogger } from "../../common/utils";
import { ActionBatcher } from "../actionBatcher";
import { getDistanceBetweenTileAndPoint } from "../../map/map";
import { PrioritisedScoutTarget } from "../../common/scout";
import { MissionContext, SupabotContext } from "../../common/context";

const SCOUT_MOVE_COOLDOWN_TICKS = 30;

// Max units to spend on a particular scout target.
const MAX_ATTEMPTS_PER_TARGET = 5;

// Maximum ticks to spend trying to scout a target *without making progress towards it*.
// Every time a unit gets closer to the target, the timer refreshes.
const MAX_TICKS_PER_TARGET = 600;

/**
 * A mission that tries to scout around the map with a cheap, fast unit (usually attack dogs)
 */
export class ScoutingMission extends Mission {
    private scoutTarget: Vector2 | null = null;
    private attemptsOnCurrentTarget: number = 0;
    private scoutTargetRefreshedAt: number = 0;
    private lastMoveCommandTick: number = 0;
    private scoutTargetIsPermanent: boolean = false;

    // Minimum distance from a scout to the target.
    private scoutMinDistance?: number;

    private hadUnit: boolean = false;

    constructor(
        uniqueName: string,
        private priority: number,
        logger: DebugLogger,
    ) {
        super(uniqueName, logger);
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        const { game, matchAwareness } = context;
        const actionsApi = context.player.actions;
        const playerData = game.getPlayerData(context.player.name);
        const scoutNames = ["ADOG", "DOG", "E1", "E2", "FV", "HTK"];
        const scouts = this.getUnitsOfTypes(game, ...scoutNames);

        if ((matchAwareness.getSectorCache().getOverallVisibility() || 0) > 0.9) {
            return disbandMission();
        }

        if (scouts.length === 0) {
            // Count the number of times the scout dies trying to uncover the current scoutTarget.
            if (this.scoutTarget && this.hadUnit) {
                this.attemptsOnCurrentTarget++;
                this.hadUnit = false;
            }
            return requestUnitsWithSamePriority(scoutNames, this.priority);
        } else if (this.scoutTarget) {
            this.hadUnit = true;
            if (!this.scoutTargetIsPermanent) {
                if (this.attemptsOnCurrentTarget > MAX_ATTEMPTS_PER_TARGET) {
                    this.logger(
                        `Scout target ${this.scoutTarget.x},${this.scoutTarget.y} took too many attempts, moving to next`,
                    );
                    this.setScoutTarget(null, 0);
                    return noop();
                }
                if (game.getCurrentTick() > this.scoutTargetRefreshedAt + MAX_TICKS_PER_TARGET) {
                    this.logger(
                        `Scout target ${this.scoutTarget.x},${this.scoutTarget.y} took too long, moving to next`,
                    );
                    this.setScoutTarget(null, 0);
                    return noop();
                }
            }
            const targetTile = game.mapApi.getTile(this.scoutTarget.x, this.scoutTarget.y);
            if (!targetTile) {
                throw new Error(`target tile ${this.scoutTarget.x},${this.scoutTarget.y} does not exist`);
            }
            if (game.getCurrentTick() > this.lastMoveCommandTick + SCOUT_MOVE_COOLDOWN_TICKS) {
                this.lastMoveCommandTick = game.getCurrentTick();
                scouts.forEach((unit) => {
                    if (this.scoutTarget) {
                        actionsApi.orderUnits([unit.id], OrderType.AttackMove, this.scoutTarget.x, this.scoutTarget.y);
                    }
                });
                // Check that a scout is actually moving closer to the target.
                const distances = scouts.map((unit) => getDistanceBetweenTileAndPoint(unit.tile, this.scoutTarget!));
                const newMinDistance = Math.min(...distances);
                if (!this.scoutMinDistance || newMinDistance < this.scoutMinDistance) {
                    this.logger(
                        `Scout timeout refreshed because unit moved closer to point (${newMinDistance} < ${this.scoutMinDistance})`,
                    );
                    this.scoutTargetRefreshedAt = game.getCurrentTick();
                    this.scoutMinDistance = newMinDistance;
                }
            }
            if (game.mapApi.isVisibleTile(targetTile, playerData.name)) {
                this.logger(
                    `Scout target ${this.scoutTarget.x},${this.scoutTarget.y} successfully scouted, moving to next`,
                );
                this.setScoutTarget(null, game.getCurrentTick());
            }
        } else {
            const nextScoutTarget = matchAwareness.getScoutingManager().getNewScoutTarget();
            if (!nextScoutTarget) {
                this.logger(`No more scouting targets available, disbanding.`);
                return disbandMission();
            }
            this.setScoutTarget(nextScoutTarget, game.getCurrentTick());
        }
        return noop();
    }

    setScoutTarget(target: PrioritisedScoutTarget | null, currentTick: number) {
        this.attemptsOnCurrentTarget = 0;
        this.scoutTargetRefreshedAt = currentTick;
        this.scoutTarget = target?.target ?? null;
        this.scoutMinDistance = undefined;
        this.scoutTargetIsPermanent = target?.permanent ?? false;
    }

    public getGlobalDebugText(): string | undefined {
        return "scouting";
    }

    public getPriority() {
        return this.priority;
    }
}

const SCOUT_COOLDOWN_TICKS = 300;

export class ScoutingMissionFactory {
    constructor(private lastScoutAt: number = -SCOUT_COOLDOWN_TICKS) {}

    getName(): string {
        return "ScoutingMissionFactory";
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        const { game, matchAwareness } = context;
        if (game.getCurrentTick() < this.lastScoutAt + SCOUT_COOLDOWN_TICKS) {
            return;
        }
        if (!matchAwareness.getScoutingManager().hasScoutTargets()) {
            return;
        }
        if (!missionController.addMission(new ScoutingMission("globalScout", 10, logger))) {
            this.lastScoutAt = game.getCurrentTick();
        }
    }
}
