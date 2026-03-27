import { BotContext } from "../../../game-api";
import { MatchAwareness } from "../awareness";
import { ActionBatcher } from "../mission/actionBatcher";

export interface SupabotContext extends BotContext {
    readonly matchAwareness: MatchAwareness;
}

export interface MissionContext extends SupabotContext {
    readonly actionBatcher: ActionBatcher;
}