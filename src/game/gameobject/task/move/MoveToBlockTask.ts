import { MoveTrait, MoveResult } from "@/game/gameobject/trait/MoveTrait";
import { Task } from "@/game/gameobject/task/system/Task";
import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
export class MoveToBlockTask extends Task {
    private game: any;
    private target: any;
    private preventOpportunityFire: boolean = false;
    private useChildTargetLines: boolean = true;
    private attackPerformed: boolean = false;
    constructor(game: any, target: any) {
        super();
        this.game = game;
        this.target = target;
    }
    onStart(unit: any): void {
        this.children.push(new MoveTask(this.game, this.target.centerTile, false, {
            closeEnoughTiles: 1,
            pathFinderIgnoredBlockers: [this.target],
            stopOnBlocker: this.target,
        }));
    }
    onTick(unit: any): boolean {
        if (this.attackPerformed ||
            this.isCancelling() ||
            !unit.attackTrait ||
            unit.attackTrait.isDisabled()) {
            return true;
        }
        if (unit.moveTrait.lastMoveResult !== MoveResult.CloseEnough) {
            return true;
        }
        const weapon = unit.attackTrait.selectWeaponVersus(unit, this.target, this.game, true);
        if (!weapon) {
            return true;
        }
        this.children.push(unit.attackTrait.createAttackTask(this.game, this.target, this.target.tile, weapon, { force: true }));
        this.attackPerformed = true;
        return false;
    }
}
