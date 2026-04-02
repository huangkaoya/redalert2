import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { Task } from "@/game/gameobject/task/system/Task";
import { ScatterPositionHelper } from "@/game/gameobject/unit/ScatterPositionHelper";
import { MovementZone } from "@/game/type/MovementZone";
export class ScatterTask extends Task {
    private game: any;
    private target: any;
    private options: any;
    constructor(game: any, target?: any, options?: any) {
        super();
        this.game = game;
        this.target = target;
        this.options = options;
    }
    onStart(unit: any): void {
        if (!unit.moveTrait.isDisabled() &&
            unit.rules.movementZone !== MovementZone.Fly) {
            let tile: any, toBridge: boolean;
            if (this.target) {
                ({ tile, toBridge } = this.target);
            }
            else {
                const position = new ScatterPositionHelper(this.game)
                    .findPositions([unit], this.options)
                    .get(unit);
                if (!position)
                    return;
                tile = position.tile;
                toBridge = !!position.onBridge;
            }
            this.children.push(new MoveTask(this.game, tile, toBridge, {
                closeEnoughTiles: 0,
                ignoredBlockers: this.options?.ignoredBlockers,
            }));
        }
    }
    onTick(unit: any): boolean {
        return true;
    }
}
