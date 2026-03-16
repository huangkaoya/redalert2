import { ObjectType } from "@/engine/type/ObjectType";
import { EventType } from "@/game/event/EventType";
import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class DestroyedAllUnitsLandCondition extends TriggerCondition {
    private allDestroyed: boolean;
    private houseId: number;
    constructor(params: any, context: any) {
        super(params, context);
        this.allDestroyed = false;
        this.houseId = Number(params[1]);
    }
    check(events: any, eventList: any[]): boolean {
        if (this.allDestroyed) {
            return true;
        }
        const hasDestroyedAll = eventList.some((event) => {
            if (event.type !== EventType.ObjectDestroy) {
                return false;
            }
            const target = event.target;
            if (!target.isUnit() || target.owner.country?.id !== this.houseId) {
                return false;
            }
            return !this.hasLandUnitsLeft(target.owner);
        });
        if (hasDestroyedAll) {
            this.allDestroyed = true;
        }
        return hasDestroyedAll;
    }
    private hasLandUnitsLeft(owner: any): boolean {
        for (const type of [ObjectType.Vehicle, ObjectType.Infantry]) {
            const units = owner.getOwnedObjectsByType(type, true).filter((unit: any) => !unit.rules.naval);
            if (units.length > 0) {
                return true;
            }
        }
        return false;
    }
}
