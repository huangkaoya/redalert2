import { GameObject } from '@/game/gameobject/GameObject';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class TurnOnOffBuildingExecutor extends TriggerExecutor {
    private turnOn: boolean;
    constructor(action: any, context: any, turnOn: boolean) {
        super(action, context);
        this.turnOn = turnOn;
    }
    execute(game: any, targets: GameObject[]): void {
        for (const target of targets) {
            if (target instanceof GameObject && target.isBuilding()) {
                target.poweredTrait?.setTurnedOn(this.turnOn);
            }
        }
    }
}
