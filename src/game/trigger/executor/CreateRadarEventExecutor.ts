import { Game } from '@/game/Game';
import { RadarEventType } from '@/game/rules/general/RadarRules';
import { RadarTrait } from '@/game/trait/RadarTrait';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class CreateRadarEventExecutor extends TriggerExecutor {
    execute(game: Game): void {
        const eventType = Number(this.action.params[1]) - 1;
        if (Object.values(RadarEventType).includes(eventType)) {
            const waypointId = this.action.params[6];
            const tile = game.map.getTileAtWaypoint(waypointId);
            if (tile) {
                for (const combatant of game.getCombatants()) {
                    game.traits.get(RadarTrait).addEventForPlayer(eventType, combatant, tile, game);
                }
            }
            else {
                console.warn(`No valid location found for waypoint ${waypointId}. ` +
                    `Skipping action ${this.getDebugName()}.`);
            }
        }
        else {
            console.warn(`Unknown radar event type "${1 + eventType}". Skipping action ${this.getDebugName()}.`);
        }
    }
}
