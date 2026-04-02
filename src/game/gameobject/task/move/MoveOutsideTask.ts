import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
export class MoveOutsideTask extends MoveTask {
    private target: any;
    constructor(game: any, target: any, targetTile?: any) {
        super(game, targetTile ?? target.tile, false, { ignoredBlockers: [target] });
        this.target = target;
        this.cancellable = false;
    }
    canStopAtTile(unit: any, tile: any, onBridge: any): boolean {
        return (!this.game.map.tileOccupation.isTileOccupiedBy(tile, this.target) &&
            super.canStopAtTile(unit, tile, onBridge));
    }
}
