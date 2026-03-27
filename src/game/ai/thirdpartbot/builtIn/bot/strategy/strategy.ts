import { SupabotContext } from "../logic/common/context";
import { MissionController } from "../logic/mission/missionController";
import { DebugLogger } from "../logic/common/utils";

export type UnitComposition = {
    [unitType: string]: number;
};

/**
 * Defines how the bot builds units, selects missions,
 * and makes high-level tactical decisions.
 */
export interface Strategy {
    /**
     * Poll the strategy for new missions to create in the current game state.
     * Strategy implementations should create or return missions as appropriate.
     *
     * @param context Current game context
     * @param missionController Controller to add missions to
     * @param logger Debug logger
     * @return Strategy This strategy, or a new one to replace it.
     */
    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): Strategy;
}
