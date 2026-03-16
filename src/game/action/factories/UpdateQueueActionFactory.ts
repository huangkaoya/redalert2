import { UpdateQueueAction } from '../UpdateQueueAction';
import { Game } from '../../Game';
export class UpdateQueueActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): UpdateQueueAction {
        return new UpdateQueueAction(this.game);
    }
}
