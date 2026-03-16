import { Order } from "./Order";
import { OrderType } from "./OrderType";
import { PointerType } from "@/engine/type/PointerType";
import { GatherOreTask } from "@/game/gameobject/task/harvester/GatherOreTask";
import { OrderFeedbackType } from "./OrderFeedbackType";
export class GatherOrder extends Order {
    private game: any;
    constructor(game: any) {
        super(OrderType.Gather);
        this.game = game;
        this.targetOptional = false;
        this.feedbackType = OrderFeedbackType.Move;
    }
    getPointerType(isMini: boolean): PointerType {
        return isMini ? PointerType.AttackMini : PointerType.AttackNoRange;
    }
    isValid(): boolean {
        return (!(!this.sourceObject.isVehicle() ||
            !this.sourceObject.harvesterTrait ||
            this.sourceObject.moveTrait.isDisabled() ||
            this.game.mapShroudTrait
                .getPlayerShroud(this.sourceObject.owner)
                ?.isShrouded(this.target.tile, this.target.obj?.tileElevation)) && this.target.isOre);
    }
    isAllowed(): boolean {
        return true;
    }
    process(): GatherOreTask[] {
        return [new GatherOreTask(this.game, this.target.tile, true)];
    }
}
