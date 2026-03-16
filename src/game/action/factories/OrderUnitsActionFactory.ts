import { OrderUnitsAction } from '../OrderUnitsAction';
import { OrderFactory } from '@/game/order/OrderFactory';
import { Game } from '@/game/Game';
import { OrderActionContext } from '@/game/action/OrderActionContext';
export class OrderUnitsActionFactory {
    private game: Game;
    private map: Map;
    private orderActionContext: OrderActionContext;
    constructor(game: Game, map: Map, orderActionContext: OrderActionContext) {
        this.game = game;
        this.map = map;
        this.orderActionContext = orderActionContext;
    }
    create(): OrderUnitsAction {
        return new OrderUnitsAction(this.game, this.map, this.orderActionContext, new OrderFactory(this.game, this.map));
    }
}
