import { ActionsApi, BotContext, GameApi, GameObjectData, PlayerData, UnitData, Vector2 } from "../../../../game-api";
import { MatchAwareness } from "../../awareness";
import { MissionController } from "../missionController";
import { Mission, MissionAction, grabCombatants, noop, releaseUnits, requestUnits } from "../mission";
import { CombatSquad } from "./squads/combatSquad";
import { DebugLogger, isOwnedByNeutral, toVector2 } from "../../common/utils";
import { ActionBatcher } from "../actionBatcher";
import { MissionContext, SupabotContext } from "../../common/context";

export const MAX_PRIORITY = 100;
export const PRIORITY_INCREASE_PER_TICK_RATIO = 1.025;

/**
 * A mission that tries to defend a certain area.
 */
export class DefenceMission extends Mission<CombatSquad> {
    private squad: CombatSquad;

    constructor(
        uniqueName: string,
        private priority: number,
        rallyArea: Vector2,
        private defenceArea: Vector2,
        private radius: number,
        logger: DebugLogger,
    ) {
        super(uniqueName, logger);
        this.squad = new CombatSquad(rallyArea, defenceArea, radius);
    }

    _onAiUpdate(context: MissionContext): MissionAction {
        const { game, matchAwareness } = context;
        // Dispatch missions.
        const foundTargets = matchAwareness
            .getHostilesNearPoint2d(this.defenceArea, this.radius)
            .map((unit) => game.getUnitData(unit.unitId))
            .filter((unit) => !isOwnedByNeutral(unit)) as UnitData[];

        const update = this.squad.onAiUpdate(context, this, this.logger);

        if (update.type !== "noop") {
            return update;
        }

        if (foundTargets.length === 0) {
            this.priority = 0;
            if (this.getUnitIds().length > 0) {
                this.logger(`(Defence Mission ${this.getUniqueName()}): No targets found, releasing units.`);
                return releaseUnits(this.getUnitIds());
            } else {
                return noop();
            }
        }
        const targetUnit = foundTargets[0];
        this.logger(
            `(Defence Mission ${this.getUniqueName()}): Focused on target ${targetUnit?.name} (${
                foundTargets.length
            } found in area ${this.radius})`,
        );
        this.squad.setAttackArea(new Vector2(foundTargets[0].tile.rx, foundTargets[0].tile.ry));
        this.priority = MAX_PRIORITY;
        return grabCombatants(this.defenceArea, this.priority);
    }

    public getGlobalDebugText(): string | undefined {
        return this.squad.getGlobalDebugText() ?? "<none>";
    }

    public getPriority() {
        return this.priority;
    }
}

const DEFENCE_CHECK_TICKS = 30;

// Starting radius around the player's base to trigger defense.
const DEFENCE_STARTING_RADIUS = 6;
// Every game tick, we increase the defendable area by this amount.
const DEFENCE_RADIUS_INCREASE_PER_GAME_TICK = 0.0001;

export class DefenceMissionFactory {
    private lastDefenceCheckAt = 0;

    constructor() {}

    getName(): string {
        return "DefenceMissionFactory";
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        const { game, matchAwareness } = context;
        if (game.getCurrentTick() < this.lastDefenceCheckAt + DEFENCE_CHECK_TICKS) {
            return;
        }
        this.lastDefenceCheckAt = game.getCurrentTick();

        const defendablePoints = this.getDefendablePoints(context);

        const defendableRadius =
            DEFENCE_STARTING_RADIUS + DEFENCE_RADIUS_INCREASE_PER_GAME_TICK * game.getCurrentTick();
        for (const defendablePoint of defendablePoints) {
            const enemiesNearPoint = matchAwareness
                .getHostilesNearPoint2d(defendablePoint, defendableRadius)
                .map((unit) => game.getUnitData(unit.unitId))
                .filter((unit) => !isOwnedByNeutral(unit)) as UnitData[];

            if (enemiesNearPoint.length > 0) {
                logger(
                    `Starting defence mission, ${
                        enemiesNearPoint.length
                    } found in radius ${defendableRadius} (tick ${game.getCurrentTick()})`,
                );
                missionController.addMission(
                    new DefenceMission(
                        `globalDefence.${defendablePoint.x}.${defendablePoint.y}`,
                        10,
                        matchAwareness.getMainRallyPoint(),
                        defendablePoint,
                        defendableRadius,
                        logger,
                    ),
                );
            }
        }
    }

    private getDefendablePoints(context: SupabotContext) {
        const { game, player } = context;
        return game
            .getVisibleUnits(player.name, "self", (r) => r.constructionYard || r.name === "AMCV" || r.name === "SMCV")
            .map((unitId) => game.getGameObjectData(unitId))
            .filter((unit): unit is GameObjectData => unit != null)
            .map((unit) => toVector2(unit.tile));
    }
}
