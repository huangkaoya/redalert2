import { MorphIntoTask } from "@/game/gameobject/task/morph/MorphIntoTask";
import { ObjectType } from "@/engine/type/ObjectType";
export class UndeployIntoTask extends MorphIntoTask {
    onStart(unit: any): void {
        const undeploysInto = unit.rules.undeploysInto;
        if (!undeploysInto) {
            throw new Error(`Object type "${unit.name}" doesn't undeploy into anything`);
        }
        this.morphInto = this.game.rules.getObject(undeploysInto, ObjectType.Vehicle);
        super.onStart(unit);
    }
}
