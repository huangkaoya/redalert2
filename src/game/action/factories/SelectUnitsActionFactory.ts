import { SelectUnitsAction } from '../SelectUnitsAction';
import { Game } from '@/game/Game';
import { OrderActionContext } from '@/game/action/OrderActionContext';
export class SelectUnitsActionFactory {
    private game: Game;
    private orderActionContext: OrderActionContext;
    constructor(game: Game, orderActionContext: OrderActionContext) {
        this.game = game;
        this.orderActionContext = orderActionContext;
    }
    create(): SelectUnitsAction {
        return new SelectUnitsAction(this.game, this.orderActionContext);
    }
}
