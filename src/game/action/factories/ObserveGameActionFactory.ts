import { ObserveGameAction } from '../ObserveGameAction';
import { Game } from '@/game/Game';
export class ObserveGameActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): ObserveGameAction {
        return new ObserveGameAction(this.game);
    }
}
