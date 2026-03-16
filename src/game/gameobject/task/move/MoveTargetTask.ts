import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { MoveTrait, MoveState } from "@/game/gameobject/trait/MoveTrait";
export class MoveTargetTask extends MoveTask {
    private target: any;
    private tilesSinceTargetUpdate: number = 0;
    constructor(game: any, target: any) {
        super(game, target.tile, target.onBridge, {
            forceMove: true,
            pathFinderIgnoredBlockers: [target],
        });
        this.target = target;
    }
    onTick(unit: any): boolean {
        if (!this.isCancelling() &&
            unit.moveTrait.moveState === MoveState.ReachedNextWaypoint &&
            !(this.target.tile === this.targetTile &&
                this.target.onBridge === this.toBridge &&
                this.target.moveTrait.isIdle())) {
            let shouldUpdate = false;
            let waypoint;
            if ((unit.tile === this.targetTile && this.target.tile !== this.targetTile) ||
                this.tilesSinceTargetUpdate++ > 10) {
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                this.tilesSinceTargetUpdate = 0;
                waypoint = this.target.moveTrait.currentWaypoint;
                if (waypoint) {
                    this.updateTarget(waypoint.tile, !!waypoint.onBridge);
                }
                else {
                    this.updateTarget(this.target.tile, this.target.onBridge);
                }
            }
        }
        return super.onTick(unit);
    }
    forceCancel(unit: any): boolean {
        return super.forceCancel(unit);
    }
    getTargetLinesConfig(unit: any): {
        target: any;
        pathNodes: any[];
    } {
        return { target: this.target, pathNodes: [] };
    }
}
