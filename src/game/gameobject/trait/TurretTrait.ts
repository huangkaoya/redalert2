import { FacingUtil } from '@/game/gameobject/unit/FacingUtil';
import { NotifyTick } from './interface/NotifyTick';
import { NotifySpawn } from './interface/NotifySpawn';
export class TurretTrait {
    private facing: number = 0;
    private desiredFacing: number = 0;
    isRotating(): boolean {
        return this.facing !== this.desiredFacing;
    }
    [NotifySpawn.onSpawn](target: any): void {
        if (target.isUnit()) {
            this.facing = this.desiredFacing = target.direction;
        }
    }
    [NotifyTick.onTick](gameObject: any): void {
        if (this.desiredFacing !== this.facing) {
            const rotationSpeed = gameObject.rules.rot;
            this.facing = FacingUtil.tick(this.facing, this.desiredFacing, rotationSpeed || Number.POSITIVE_INFINITY).facing;
        }
    }
}
