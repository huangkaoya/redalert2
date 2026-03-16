import { Task } from "@/game/gameobject/task/system/Task";
import { FacingUtil } from "@/game/gameobject/unit/FacingUtil";
export class TurnTask extends Task {
    private direction: number;
    public cancellable: boolean = false;
    constructor(direction: number) {
        super();
        this.direction = direction;
    }
    onTick(entity: any): boolean {
        if (entity.direction === this.direction) {
            entity.spinVelocity = 0;
            return true;
        }
        const rotationSpeed = entity.rules.rot;
        const { facing, delta } = FacingUtil.tick(entity.direction, this.direction, rotationSpeed);
        entity.direction = facing;
        entity.spinVelocity = delta;
        return false;
    }
}
