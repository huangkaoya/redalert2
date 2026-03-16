import { TriggerCondition } from '../TriggerCondition';
export class BuildingExistsCondition extends TriggerCondition {
    private negate: boolean;
    private objectIndex: number;
    constructor(trigger: any, player: any, negate: boolean = false) {
        super(trigger, player);
        this.negate = negate;
        this.objectIndex = Number(trigger.params[1]);
    }
    check(): boolean {
        if (!this.player) {
            return false;
        }
        for (const building of this.player.buildings) {
            if (building.rules.index === this.objectIndex) {
                return !this.negate;
            }
        }
        return this.negate;
    }
}
