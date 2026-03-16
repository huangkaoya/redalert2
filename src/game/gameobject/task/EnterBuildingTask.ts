import { Task } from "./system/Task";
import { MoveOutsideTask } from "./move/MoveOutsideTask";
import { MoveInsideTask } from "./move/MoveInsideTask";
import { EnterObjectEvent } from "@/game/event/EnterObjectEvent";
export class EnterBuildingTask extends Task {
    protected game: any;
    public target: any;
    private aborted: boolean = false;
    private movePerformed: boolean = false;
    public preventOpportunityFire: boolean = false;
    private lastOutsideTile: any;
    constructor(game: any, target: any) {
        super();
        this.game = game;
        this.target = target;
    }
    onTick(gameObject: any): boolean {
        if ((this.isCancelling() && !this.movePerformed) ||
            this.aborted ||
            gameObject.moveTrait.isDisabled()) {
            return true;
        }
        if (this.movePerformed && this.children.length) {
            if (gameObject.tile === this.lastOutsideTile ||
                this.game.map.tileOccupation.isTileOccupiedBy(gameObject.tile, this.target)) {
                this.lastOutsideTile = gameObject.tile;
            }
            return false;
        }
        if (this.game.map.tileOccupation.isTileOccupiedBy(gameObject.tile, this.target)) {
            if (!this.isAllowed(gameObject) || this.isCancelling()) {
                this.children.push(new MoveOutsideTask(this.game, this.target, this.lastOutsideTile));
                this.aborted = true;
                return false;
            }
            this.game.events.dispatch(new EnterObjectEvent(this.target, gameObject));
            if (this.onEnter(gameObject) === false) {
                this.children.push(new MoveOutsideTask(this.game, this.target, this.lastOutsideTile));
                this.aborted = true;
                return false;
            }
        }
        else if (!this.movePerformed) {
            this.children.push(new MoveInsideTask(this.game, this.target).setBlocking(false));
            this.movePerformed = true;
            this.preventOpportunityFire = true;
        }
        return false;
    }
    getTargetLinesConfig(gameObject: any) {
        return { target: this.target, pathNodes: [] };
    }
    protected isAllowed(gameObject: any): boolean {
        return true;
    }
    protected onEnter(gameObject: any): any {
        return true;
    }
}
