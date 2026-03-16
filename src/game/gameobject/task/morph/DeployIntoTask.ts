import { MorphIntoTask } from "@/game/gameobject/task/morph/MorphIntoTask";
import { ObjectType } from "@/engine/type/ObjectType";
export class DeployIntoTask extends MorphIntoTask {
    onStart(unit: any): void {
        const deploysInto = unit.rules.deploysInto;
        if (!deploysInto) {
            throw new Error(`Object type "${unit.name}" doesn't deploy into anything`);
        }
        this.morphInto = this.game.rules.getObject(deploysInto, ObjectType.Building);
        super.onStart(unit);
    }
    onTick(unit: any): boolean {
        return !!this.isCancelling() || super.onTick(unit);
    }
}
