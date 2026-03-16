import { TriggerStopSoundFxEvent } from '@/game/event/TriggerStopSoundFxEvent';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class StopSoundFxAtExecutor extends TriggerExecutor {
    execute(context: any) {
        const waypoint = this.action.params[6];
        const tile = context.map.getTileAtWaypoint(waypoint);
        if (tile) {
            context.events.dispatch(new TriggerStopSoundFxEvent(tile));
        }
        else {
            console.warn(`No valid location found for waypoint ${waypoint}. ` +
                `Skipping action ${this.getDebugName()}.`);
        }
    }
}
