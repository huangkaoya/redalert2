import { ObjectType } from '@/engine/type/ObjectType';
import { CheerTask } from '@/game/gameobject/task/CheerTask';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class CheerExecutor extends TriggerExecutor {
    private houseId: number;
    constructor(action: any, trigger: any) {
        super(action, trigger);
        this.houseId = Number(action.params[1]);
    }
    execute(context: any): void {
        let players = context.getAllPlayers().filter((player: any) => player.country && !player.defeated);
        if (this.houseId !== -1) {
            players = players.filter((player: any) => player.country?.id === this.houseId);
        }
        if (players.length) {
            for (const infantry of players[0].getOwnedObjectsByType(ObjectType.Infantry)) {
                if (infantry.unitOrderTrait.isIdle()) {
                    infantry.unitOrderTrait.addTask(new CheerTask());
                }
            }
        }
    }
}
