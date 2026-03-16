import { Game } from '@/game/Game';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class ReshroudMapExecutor extends TriggerExecutor {
    execute(game: Game): void {
        for (const combatant of game.getCombatants()) {
            game.mapShroudTrait.resetShroud(combatant, game);
        }
    }
}
