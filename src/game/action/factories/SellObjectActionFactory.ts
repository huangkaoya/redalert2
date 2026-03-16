import { SellObjectAction } from '../SellObjectAction';
import { Game } from '../../Game';
export class SellObjectActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): SellObjectAction {
        return new SellObjectAction(this.game);
    }
}
