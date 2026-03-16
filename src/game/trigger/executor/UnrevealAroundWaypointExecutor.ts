import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class UnrevealAroundWaypointExecutor extends TriggerExecutor {
    execute(context: any): void {
        const waypointId = Number(this.action.params[1]);
        const tile = context.map.getTileAtWaypoint(waypointId);
        if (tile) {
            for (const combatant of context.getCombatants()) {
                context.mapShroudTrait
                    .getPlayerShroud(combatant)
                    ?.unrevealAround(tile, context.rules.general.revealTriggerRadius);
            }
        }
        else {
            console.warn(`No valid location found for waypoint ${waypointId}. ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}
