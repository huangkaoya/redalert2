import { GameObject } from '@/game/gameobject/GameObject';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class DestroyObjectExecutor extends TriggerExecutor {
    execute(context: any, targets: any[]): void {
        for (const target of targets) {
            if (target instanceof GameObject && target.isSpawned) {
                context.destroyObject(target);
            }
        }
    }
}
