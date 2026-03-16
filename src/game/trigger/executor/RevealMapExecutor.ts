import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class RevealMapExecutor extends TriggerExecutor {
    execute(context: any): void {
        for (const combatant of context.getCombatants()) {
            context.mapShroudTrait.revealMap(combatant, context);
        }
    }
}
