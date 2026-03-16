import { OrderType } from "./OrderType";
import { DeployOrder } from "./DeployOrder";
import { MoveOrder } from "./MoveOrder";
import { OccupyOrder } from "./OccupyOrder";
import { AttackOrder } from "./AttackOrder";
import { StopOrder } from "./StopOrder";
import { CheerOrder } from "./CheerOrder";
import { DockOrder } from "./DockOrder";
import { GatherOrder } from "./GatherOrder";
import { AttackMoveOrder } from "./AttackMoveOrder";
import { RepairOrder } from "./RepairOrder";
import { GuardAreaOrder } from "./GuardAreaOrder";
import { ScatterOrder } from "./ScatterOrder";
import { EnterTransportOrder } from "./EnterTransportOrder";
import { CaptureOrder } from "./CaptureOrder";
export class OrderFactory {
    private game: any;
    private map: any;
    constructor(game: any, map: any) {
        this.game = game;
        this.map = map;
    }
    create(orderType: OrderType, options?: any) {
        switch (orderType) {
            case OrderType.Deploy:
                return new DeployOrder(this.game, true);
            case OrderType.DeploySelected:
                return new DeployOrder(this.game, false);
            case OrderType.ForceMove:
                return new MoveOrder(this.game, this.map, options, true);
            case OrderType.Move:
                return new MoveOrder(this.game, this.map, options);
            case OrderType.ForceAttack:
                return new AttackOrder(this.game, { forceAttack: true });
            case OrderType.Attack:
                return new AttackOrder(this.game, { noIvanBomb: true });
            case OrderType.PlaceBomb:
                return new AttackOrder(this.game);
            case OrderType.AttackMove:
                return new AttackMoveOrder(this.game, this.map);
            case OrderType.Capture:
                return new CaptureOrder(this.game);
            case OrderType.Occupy:
                return new OccupyOrder(this.game);
            case OrderType.Stop:
                return new StopOrder(this.game);
            case OrderType.Cheer:
                return new CheerOrder();
            case OrderType.Dock:
                return new DockOrder(this.game);
            case OrderType.Gather:
                return new GatherOrder(this.game);
            case OrderType.Repair:
                return new RepairOrder(this.game);
            case OrderType.Guard:
                return new GuardAreaOrder(this.game, false);
            case OrderType.GuardArea:
                return new GuardAreaOrder(this.game, true);
            case OrderType.Scatter:
                return new ScatterOrder(this.game);
            case OrderType.EnterTransport:
                return new EnterTransportOrder(this.game);
            default:
                throw new Error(`Unhandled order type ${OrderType[orderType]}`);
        }
    }
}
