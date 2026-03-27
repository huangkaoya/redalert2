import { DebugLogger } from "../../common/utils";
import { ActionsApi, BotContext, GameApi, OrderType, PlayerData, Vector2 } from "../../../../game-api";
import { Mission, MissionAction, disbandMission, requestSpecificUnits } from "../mission";
import { ActionBatcher } from "../actionBatcher";
import { MatchAwareness } from "../../awareness";
import { MissionContext } from "../../common/context";

export class RetreatMission extends Mission {
    private createdAt: number | null = null;

    constructor(
        uniqueName: string,
        private retreatToPoint: Vector2,
        private withUnitIds: number[],
        logger: DebugLogger,
    ) {
        super(uniqueName, logger);
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        const { game } = context;
        const actionsApi = context.player.actions;
        if (!this.createdAt) {
            this.createdAt = game.getCurrentTick();
        }
        if (this.getUnitIds().length > 0) {
            // Only send the order once we have managed to claim some units.
            actionsApi.orderUnits(
                this.getUnitIds(),
                OrderType.AttackMove,
                this.retreatToPoint.x,
                this.retreatToPoint.y,
            );
            return disbandMission();
        }
        if (this.createdAt && game.getCurrentTick() > this.createdAt + 240) {
            // Disband automatically after 240 ticks in case we couldn't actually claim any units.
            return disbandMission();
        } else {
            return requestSpecificUnits(this.withUnitIds, 1000);
        }
    }

    public getGlobalDebugText(): string | undefined {
        return `retreat with ${this.withUnitIds.length} units`;
    }

    public getPriority() {
        return 100;
    }
}
