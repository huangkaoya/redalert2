import { TriggerAnimEvent } from '@/game/event/TriggerAnimEvent';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class PlayAnimAtExecutor extends TriggerExecutor {
    execute(context: any) {
        const action = this.action;
        const animIndex = Number(action.params[1]);
        const animName = context.rules.getAnimationName(animIndex);
        if (animName !== undefined) {
            const waypoint = action.params[6];
            const tile = context.map.getTileAtWaypoint(waypoint);
            if (tile) {
                context.events.dispatch(new TriggerAnimEvent(animName, tile));
            }
            else {
                console.warn(`No valid location found for waypoint ${waypoint}. ` +
                    `Skipping action ${this.getDebugName()}.`);
            }
        }
        else {
            console.warn(`No animation found for index "${animIndex}". Skipping action ` +
                this.getDebugName());
        }
    }
}
